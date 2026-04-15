const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

export interface PlaceSuggestion {
  placeId: string
  text: string
}

export async function fetchAddressSuggestions(
  input: string
): Promise<PlaceSuggestion[]> {
  if (input.length < 3) return []

  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
        },
        body: JSON.stringify({
          input,
          includedRegionCodes: ["us"],
          includedPrimaryTypes: [
            "street_address",
            "subpremise",
            "route",
            "locality",
            "school",
            "establishment",
          ],
        }),
      }
    )

    if (!res.ok) return []

    const data = await res.json()
    return (data.suggestions ?? [])
      .map((s: { placePrediction?: { placeId: string; text: { text: string } } }) => {
        const p = s.placePrediction
        if (!p) return null
        return { placeId: p.placeId, text: p.text.text }
      })
      .filter((s: PlaceSuggestion | null): s is PlaceSuggestion => s !== null)
  } catch {
    return []
  }
}

export async function calculateDrivingDistance(
  originAddress: string,
  destinationAddress: string
): Promise<number | null> {
  const url = "https://routes.googleapis.com/directions/v2:computeRoutes"

  const body = {
    origin: { address: originAddress },
    destination: { address: destinationAddress },
    travelMode: "DRIVE",
    units: "IMPERIAL",
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "routes.distanceMeters",
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) return null

    const data = await res.json()
    const meters = data.routes?.[0]?.distanceMeters
    if (typeof meters !== "number") return null

    const miles = meters / 1609.344
    return Math.round(miles * 10) / 10
  } catch {
    return null
  }
}
