import { calculateDrivingDistance } from "./googleMaps"
import { createOrUpdateUserProfile } from "./firestore"
import type { UserProfile } from "./types"

// The commute is only deductible on a trip leg that actually begins or ends at
// the employee's home — driving between work sites is fully reimbursable.
export function tripTouchesHome(
  trip: { from: string; to: string },
  homeAddress: string
): boolean {
  const home = homeAddress.trim().toLowerCase()
  if (!home) return false
  return (
    trip.from.trim().toLowerCase() === home ||
    trip.to.trim().toLowerCase() === home
  )
}

export async function getCommuteMiles(
  userProfile: UserProfile,
  schoolAddress: string
): Promise<number | null> {
  const home = userProfile.homeAddress?.trim() ?? ""
  const school = schoolAddress.trim()
  if (!home || !school) return null

  if (
    typeof userProfile.commuteMiles === "number" &&
    userProfile.commuteCachedHomeAddress === home &&
    userProfile.commuteCachedSchoolAddress === school
  ) {
    return userProfile.commuteMiles
  }

  const miles = await calculateDrivingDistance(home, school)
  if (miles === null) return null

  await createOrUpdateUserProfile(userProfile.uid, {
    commuteMiles: miles,
    commuteCachedHomeAddress: home,
    commuteCachedSchoolAddress: school,
  })

  return miles
}

export async function computeCommuteMiles(
  homeAddress: string,
  schoolAddress: string
): Promise<number | null> {
  const home = homeAddress.trim()
  const school = schoolAddress.trim()
  if (!home || !school) return null
  return calculateDrivingDistance(home, school)
}

export interface LegDistance {
  miles: number
  // Present when the leg was measured from school because school is closer
  // to the far end than home is; homeMiles is the distance as entered
  closer?: { label: string; homeMiles: number }
}

// District policy: a leg that starts or ends at home is reimbursed from
// whichever of home or school is closer to the other end. Returns the same
// leg with home swapped for school, or null when the rule doesn't apply.
export function schoolBasedLeg(
  trip: { from: string; to: string },
  homeAddress: string,
  schoolAddress: string
): { from: string; to: string } | null {
  const home = homeAddress.trim().toLowerCase()
  const school = schoolAddress.trim()
  if (!home || !school) return null
  const from = trip.from.trim().toLowerCase()
  const to = trip.to.trim().toLowerCase()
  if (from === to) return null
  if (from === home && to !== school.toLowerCase()) {
    return { from: school, to: trip.to }
  }
  if (to === home && from !== school.toLowerCase()) {
    return { from: trip.from, to: school }
  }
  return null
}

export async function calculateLegDistance(
  trip: { from: string; to: string },
  homeAddress: string,
  school: { address: string; label: string } | undefined
): Promise<LegDistance | null> {
  const alt = school ? schoolBasedLeg(trip, homeAddress, school.address) : null
  const [direct, viaSchool] = await Promise.all([
    calculateDrivingDistance(trip.from, trip.to),
    alt ? calculateDrivingDistance(alt.from, alt.to) : Promise.resolve(null),
  ])
  if (direct === null) return null
  if (school && viaSchool !== null && viaSchool < direct) {
    return {
      miles: viaSchool,
      closer: { label: school.label, homeMiles: direct },
    }
  }
  return { miles: direct }
}

export function applyLegDistance<T extends { miles: number }>(
  trip: T,
  leg: LegDistance
): T {
  const next: Record<string, unknown> = { ...trip, miles: leg.miles }
  delete next.measuredFrom
  delete next.homeMiles
  if (leg.closer) {
    next.measuredFrom = leg.closer.label
    next.homeMiles = leg.closer.homeMiles
  }
  return next as T
}
