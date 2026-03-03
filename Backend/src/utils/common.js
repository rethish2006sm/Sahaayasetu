export function pickUserPublic(userDoc) {
  if (!userDoc) return null
  return {
    id: userDoc.id,
    name: userDoc.name,
    email: userDoc.email,
    role: userDoc.role,
    phone: userDoc.phone || null,
    created_at: userDoc.created_at,
  }
}

export function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function nowIso() {
  return new Date().toISOString()
}
