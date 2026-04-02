import { nowIso } from '../utils/common.js'

export async function getNgoIdsForOwner(db, ownerUserId) {
  const ngos = await db.collection('ngos').find(
    { owner_user_id: ownerUserId },
    { projection: { _id: 0, id: 1 } },
  ).toArray()
  return ngos.map((ngo) => ngo.id).filter(Boolean)
}

export async function getPrimaryNgoForOwner(db, ownerUserId) {
  if (!ownerUserId) return null
  return db.collection('ngos').findOne(
    { owner_user_id: ownerUserId },
    {
      projection: { _id: 0, id: 1, owner_user_id: 1, name: 1, location: 1, phone: 1 },
      sort: { created_at: 1, updated_at: 1 },
    },
  )
}

export function buildOwnership(ownerNgoUserId, ngoProfile = null, fallbackNgoName = null) {
  return {
    ownerNgoUserId: ownerNgoUserId || null,
    ownerNgoId: ngoProfile?.id || null,
    ngoName: ngoProfile?.name || fallbackNgoName || null,
  }
}

export function toUserOwnershipFields(ownership) {
  return {
    owner_ngo_user_id: ownership.ownerNgoUserId,
    owner_ngo_id: ownership.ownerNgoId,
    owner_ngo_name: ownership.ngoName,
  }
}

export function toWorkerOwnershipFields(ownership) {
  return {
    owner_ngo_user_id: ownership.ownerNgoUserId,
    owner_ngo_id: ownership.ownerNgoId,
    ngo_name: ownership.ngoName,
  }
}

function ownershipChanged(existing, next, nameField) {
  return (
    existing?.owner_ngo_user_id !== next.ownerNgoUserId
    || existing?.owner_ngo_id !== next.ownerNgoId
    || existing?.[nameField] !== next.ngoName
  )
}

export async function assignWorkerUserOwnership(db, workerUserId, ownerNgoUserId) {
  if (!workerUserId) throw new Error('linked_user_id is required')
  if (!ownerNgoUserId) throw new Error('owner_ngo_user_id is required')

  const workerUser = await db.collection('users').findOne(
    { id: workerUserId },
    { projection: { _id: 0, password_hash: 0 } },
  )
  if (!workerUser) throw new Error('Employee user account not found')
  if (workerUser.role !== 'worker') throw new Error('Selected user is not an employee account')
  if (workerUser.owner_ngo_user_id && workerUser.owner_ngo_user_id !== ownerNgoUserId) {
    throw new Error('Employee account already belongs to another NGO')
  }

  const ngoProfile = await getPrimaryNgoForOwner(db, ownerNgoUserId)
  const ownership = buildOwnership(ownerNgoUserId, ngoProfile, workerUser.owner_ngo_name || ngoProfile?.name || null)
  if (ownershipChanged(workerUser, ownership, 'owner_ngo_name')) {
    await db.collection('users').updateOne(
      { id: workerUserId },
      {
        $set: {
          ...toUserOwnershipFields(ownership),
          updated_at: nowIso(),
        },
      },
    )
  }

  return {
    user: { ...workerUser, ...toUserOwnershipFields(ownership) },
    ngoProfile,
    ownership,
  }
}

export async function resolveOwnershipForActor(db, user) {
  if (!user) return { ownership: buildOwnership(null, null, null), ngoProfile: null }

  if (user.role === 'ngo') {
    const ngoProfile = await getPrimaryNgoForOwner(db, user.id)
    return {
      ownership: buildOwnership(user.id, ngoProfile, ngoProfile?.name || user.name || null),
      ngoProfile,
    }
  }

  if (user.role === 'worker' && user.owner_ngo_user_id) {
    const ngoProfile = await getPrimaryNgoForOwner(db, user.owner_ngo_user_id)
    return {
      ownership: buildOwnership(user.owner_ngo_user_id, ngoProfile, user.owner_ngo_name || null),
      ngoProfile,
    }
  }

  return {
    ownership: buildOwnership(null, null, user.owner_ngo_name || null),
    ngoProfile: null,
  }
}

export async function hydrateWorkerOwnership(db, workerDoc) {
  if (!workerDoc) return null

  const linkedUser = workerDoc.linked_user_id
    ? await db.collection('users').findOne(
      { id: workerDoc.linked_user_id },
      { projection: { _id: 0, password_hash: 0 } },
    )
    : null

  const ownerNgoUserId = linkedUser?.owner_ngo_user_id || workerDoc.owner_ngo_user_id || null
  const ngoProfile = ownerNgoUserId ? await getPrimaryNgoForOwner(db, ownerNgoUserId) : null
  const ownership = buildOwnership(
    ownerNgoUserId,
    ngoProfile,
    workerDoc.ngo_name || linkedUser?.owner_ngo_name || null,
  )

  if (ownershipChanged(workerDoc, ownership, 'ngo_name')) {
    await db.collection('workers').updateOne(
      { id: workerDoc.id },
      {
        $set: {
          ...toWorkerOwnershipFields(ownership),
          updated_at: nowIso(),
        },
      },
    )
  }

  if (linkedUser && ownership.ownerNgoUserId && ownershipChanged(linkedUser, ownership, 'owner_ngo_name')) {
    if (linkedUser.owner_ngo_user_id && linkedUser.owner_ngo_user_id !== ownership.ownerNgoUserId) {
      throw new Error('Employee ownership conflict detected')
    }
    await db.collection('users').updateOne(
      { id: linkedUser.id },
      {
        $set: {
          ...toUserOwnershipFields(ownership),
          updated_at: nowIso(),
        },
      },
    )
  }

  return {
    ...workerDoc,
    ...toWorkerOwnershipFields(ownership),
  }
}

export async function getWorkerByAssigneeId(db, assigneeId) {
  if (!assigneeId) return null
  const worker = await db.collection('workers').findOne(
    { $or: [{ linked_user_id: assigneeId }, { id: assigneeId }] },
    { projection: { _id: 0 } },
  )
  return hydrateWorkerOwnership(db, worker)
}

export async function listWorkerAssigneeKeysForNgo(db, ownerNgoUserId) {
  if (!ownerNgoUserId) return []
  const workers = await db.collection('workers').find(
    { owner_ngo_user_id: ownerNgoUserId },
    { projection: { _id: 0, id: 1, linked_user_id: 1 } },
  ).toArray()
  return Array.from(new Set(
    workers.flatMap((worker) => [worker.id, worker.linked_user_id].filter(Boolean)),
  ))
}

export function workerBelongsToNgo(worker, ownerNgoUserId) {
  return Boolean(worker?.owner_ngo_user_id && ownerNgoUserId && worker.owner_ngo_user_id === ownerNgoUserId)
}
