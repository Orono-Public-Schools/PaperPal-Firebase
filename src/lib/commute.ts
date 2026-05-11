import { calculateDrivingDistance } from "./googleMaps"
import { createOrUpdateUserProfile } from "./firestore"
import type { UserProfile } from "./types"

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
