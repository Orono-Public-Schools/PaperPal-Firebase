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
