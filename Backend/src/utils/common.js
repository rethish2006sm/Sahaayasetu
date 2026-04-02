export function pickUserPublic(userDoc) {
  if (!userDoc) return null
  return {
    id: userDoc.id,
    name: userDoc.name,
    email: userDoc.email,
    role: userDoc.role,
    phone: userDoc.phone || null,
    owner_ngo_user_id: userDoc.owner_ngo_user_id || null,
    owner_ngo_id: userDoc.owner_ngo_id || null,
    owner_ngo_name: userDoc.owner_ngo_name || null,
    created_at: userDoc.created_at,
  }
}

export function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function toOptionalNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371
  const toRadians = (degrees) => (degrees * Math.PI) / 180

  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a = (
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2
  )
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

export function nowIso() {
  return new Date().toISOString()
}
