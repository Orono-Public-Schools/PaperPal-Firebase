import type { TripBase, TripLeg, TripRoute } from "./types"

export function emptyRoute(): TripRoute {
  return { start: "", stops: [""], end: "", returnToStart: true, legs: [] }
}

export function routePoints(route: TripRoute): string[] {
  return [
    route.start,
    ...route.stops,
    route.returnToStart ? route.start : route.end,
  ]
}

// Rebuilds legs from the points. A leg whose endpoints are unchanged keeps
// its miles (and any closer-origin note); anything else starts over at 0.
export function syncLegs(route: TripRoute): TripRoute {
  const pts = routePoints(route)
  const pool = [...route.legs]
  const legs: TripLeg[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const idx = pool.findIndex((l) => l.from === pts[i] && l.to === pts[i + 1])
    if (idx >= 0) legs.push(pool.splice(idx, 1)[0])
    else legs.push({ from: pts[i], to: pts[i + 1], miles: 0 })
  }
  return {
    ...route,
    end: route.returnToStart ? route.start : route.end,
    legs,
  }
}

export function routeMiles(route: TripRoute): number {
  return route.legs.reduce((sum, l) => sum + (l.miles || 0), 0)
}

function isAddress(a: string, b: string): boolean {
  const x = a.trim().toLowerCase()
  return x !== "" && x === b.trim().toLowerCase()
}

export function tripGrossMiles(trip: TripBase): number {
  if (trip.route) return routeMiles(trip.route)
  return trip.isRoundTrip ? trip.miles * 2 : trip.miles
}

// Points of the trip in driving order, for display of either shape
export function tripPoints(trip: TripBase): string[] {
  if (trip.route) return routePoints(trip.route)
  const from = trip.from ?? ""
  const to = trip.to ?? ""
  return trip.isRoundTrip ? [from, to, from] : [from, to]
}

export function tripLegs(trip: TripBase): TripLeg[] {
  if (trip.route) return trip.route.legs
  const leg: TripLeg = {
    from: trip.from ?? "",
    to: trip.to ?? "",
    miles: trip.miles,
  }
  if (trip.measuredFrom) leg.measuredFrom = trip.measuredFrom
  if (trip.homeMiles !== undefined) leg.homeMiles = trip.homeMiles
  if (!trip.isRoundTrip) return [leg]
  return [leg, { ...leg, from: leg.to, to: leg.from }]
}

// Legs that begin or end at home and were driven from home rather than
// re-measured from school. Each one carries one commute deduction.
export function tripHomeLegs(trip: TripBase, homeAddress: string): number {
  if (!homeAddress.trim()) return 0
  return tripLegs(trip).filter(
    (l) =>
      !l.measuredFrom &&
      (isAddress(l.from, homeAddress) || isAddress(l.to, homeAddress))
  ).length
}

// Legacy single-leg trips become a route so the form can edit them. A round
// trip was departure → destination → departure, so the destination becomes
// its one stop.
export function upgradeTrip<T extends TripBase>(trip: T): T {
  if (trip.route) return trip
  const legs = tripLegs(trip)
  const route: TripRoute = trip.isRoundTrip
    ? {
        start: trip.from ?? "",
        stops: [trip.to ?? ""],
        end: trip.from ?? "",
        returnToStart: true,
        legs,
      }
    : {
        start: trip.from ?? "",
        stops: [],
        end: trip.to ?? "",
        returnToStart: false,
        legs,
      }
  const next: T = { ...trip, route, miles: routeMiles(route) }
  delete next.from
  delete next.to
  delete next.isRoundTrip
  delete next.measuredFrom
  delete next.homeMiles
  return next
}

// Why a trip can't be submitted yet, or null when it is complete
export function routeProblem(route: TripRoute): string | null {
  const pts = routePoints(route)
  if (!pts[0].trim()) return "Enter the point of departure."
  if (route.stops.some((s) => !s.trim())) return "Fill in or remove every stop."
  if (!route.returnToStart && !route.end.trim())
    return "Enter the return destination."
  if (route.stops.length === 0 && route.returnToStart)
    return "Add at least one stop, or enter a different return destination."
  if (routeMiles(route) <= 0) return "Enter the miles for each leg."
  return null
}

// Plain-language explanations shown as hover tooltips. Review views reuse
// the point ones so staff and approvers read the same words.
export const ROUTE_TIPS = {
  start:
    "Where this trip began. Usually your school (your primary work site) or your home. Example: Schumann Elementary.",
  stop: "A place you drove to for district business before heading back. Example: MDE in Minneapolis for a training. Add one line for each place, in the order you drove.",
  end: "Where the trip ended. Usually back where you started. Uncheck the box below if you ended somewhere else, like home after an evening event.",
  miles:
    "Miles driven to reach this point from the point above it. Filled in automatically when you pick an address from the list; you can type a number if needed.",
  returnToStart:
    "Leave this checked when you drove back to where you started. Uncheck it to enter a different ending point.",
  insert: "Add a stop between these two points.",
  remove: "Remove this stop.",
  startField:
    "Type an address, or pick Home or your school from the list that opens.",
  stopField:
    "Type the address of the place you went and pick it from the list so the miles fill in.",
  endField: "Type the address where the trip ended.",
  measure: "Measure this leg with Google Maps.",
  closer:
    "District policy: a leg that starts or ends at home is reimbursed at no more than the distance from your school.",
}
