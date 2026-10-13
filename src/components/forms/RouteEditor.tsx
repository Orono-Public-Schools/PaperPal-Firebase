import { Fragment, useState } from "react"
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react"
import AddressAutocomplete, { type QuickFill } from "./AddressAutocomplete"
import Tooltip from "./Tooltip"
import { applyLegDistance, calculateLegDistance } from "@/lib/commute"
import { ROUTE_TIPS, routePoints, syncLegs } from "@/lib/route"
import type { TripLeg, TripRoute } from "@/lib/types"

interface Props {
  route: TripRoute
  onChange: (update: (route: TripRoute) => TripRoute) => void
  quickFills: QuickFill[]
  showAddHome: boolean
  homeAddress: string
  school?: { address: string; label: string }
}

export default function RouteEditor({
  route,
  onChange,
  quickFills,
  showAddHome,
  homeAddress,
  school,
}: Props) {
  const [calculating, setCalculating] = useState<string[]>([])
  const points = routePoints(route)
  const last = points.length - 1

  function withPoint(r: TripRoute, i: number, value: string): TripRoute {
    if (i === 0) return syncLegs({ ...r, start: value })
    if (i === r.stops.length + 1) return syncLegs({ ...r, end: value })
    const stops = [...r.stops]
    stops[i - 1] = value
    return syncLegs({ ...r, stops })
  }

  async function measureLeg(leg: TripLeg) {
    if (leg.from.length < 5 || leg.to.length < 5) return
    const key = `${leg.from}|${leg.to}`
    setCalculating((c) => [...c, key])
    const result = await calculateLegDistance(leg, homeAddress, school)
    setCalculating((c) => c.filter((k) => k !== key))
    if (result === null) return
    onChange((r) => ({
      ...r,
      legs: r.legs.map((l) =>
        l.from === leg.from && l.to === leg.to ? applyLegDistance(l, result) : l
      ),
    }))
  }

  // Picking an address from the list measures the legs on either side of it
  function selectPoint(i: number, value: string) {
    const next = withPoint(route, i, value)
    onChange((r) => withPoint(r, i, value))
    const legIndexes = new Set([i - 1, i])
    if (next.returnToStart && i === 0) legIndexes.add(next.legs.length - 1)
    for (const li of legIndexes) {
      const leg = next.legs[li]
      if (leg) void measureLeg(leg)
    }
  }

  function setLegMiles(li: number, miles: number) {
    onChange((r) => ({
      ...r,
      legs: r.legs.map((l, j) =>
        j === li ? { from: l.from, to: l.to, miles } : l
      ),
    }))
  }

  function insertStop(li: number) {
    onChange((r) => {
      const stops = [...r.stops]
      stops.splice(li, 0, "")
      return syncLegs({ ...r, stops })
    })
  }

  function removeStop(j: number) {
    onChange((r) =>
      syncLegs({ ...r, stops: r.stops.filter((_, k) => k !== j) })
    )
  }

  function setReturnToStart(on: boolean) {
    onChange((r) =>
      syncLegs({
        ...r,
        returnToStart: on,
        end: on ? r.start : r.end === r.start ? "" : r.end,
      })
    )
  }

  return (
    <div>
      <div className="grid grid-cols-[22px_minmax(0,1fr)_104px] items-center gap-x-2 sm:grid-cols-[26px_minmax(0,1fr)_132px] sm:gap-x-3">
        {points.map((point, i) => {
          const first = i === 0
          const isLast = i === last
          const arriving = i > 0 ? route.legs[i - 1] : undefined
          const arrivingKey = arriving ? `${arriving.from}|${arriving.to}` : ""
          const measuring = calculating.includes(arrivingKey)
          const canMeasure =
            !!arriving &&
            arriving.from.length >= 5 &&
            arriving.to.length >= 5 &&
            !measuring
          return (
            <Fragment key={i}>
              {/* Point row */}
              <div className="relative flex items-center justify-center self-stretch">
                <div
                  className="absolute left-1/2 w-0.5 -translate-x-1/2"
                  style={{
                    top: first ? "50%" : 0,
                    bottom: isLast ? "50%" : 0,
                    background: "#c5cae0",
                  }}
                />
                <div
                  className="relative z-10 rounded-full"
                  style={
                    first
                      ? { width: 16, height: 16, background: "#1d2a5d" }
                      : isLast
                        ? {
                            width: 16,
                            height: 16,
                            background: "#ad2122",
                            borderRadius: 3,
                          }
                        : {
                            width: 14,
                            height: 14,
                            background: "#ffffff",
                            border: "2px solid #4356a9",
                          }
                  }
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5">
                <Tooltip
                  text={
                    first
                      ? ROUTE_TIPS.start
                      : isLast
                        ? ROUTE_TIPS.end
                        : ROUTE_TIPS.stop
                  }
                  className="tip-label shrink-0 text-[10.5px] font-bold tracking-wider uppercase sm:w-[104px]"
                  style={{
                    color: first ? "#1d2a5d" : isLast ? "#ad2122" : "#64748b",
                  }}
                >
                  {first
                    ? "Departing from"
                    : isLast
                      ? "Returning to"
                      : `Stop ${i}`}
                </Tooltip>
                <div className="min-w-[180px] flex-1">
                  {isLast && route.returnToStart ? (
                    <Tooltip text={ROUTE_TIPS.end} hoverOnly className="block">
                      <input
                        type="text"
                        readOnly
                        value={route.start}
                        placeholder="Same as point of departure"
                        className="input-neu w-full"
                      />
                    </Tooltip>
                  ) : (
                    <Tooltip
                      text={
                        first
                          ? ROUTE_TIPS.startField
                          : isLast
                            ? ROUTE_TIPS.endField
                            : ROUTE_TIPS.stopField
                      }
                      hoverOnly
                      className="block"
                    >
                      <AddressAutocomplete
                        value={point}
                        onChange={(v) => onChange((r) => withPoint(r, i, v))}
                        onSelect={(v) => selectPoint(i, v)}
                        placeholder={
                          first
                            ? "Where did you leave from? Home or your school"
                            : isLast
                              ? "Where did the trip end?"
                              : "Place you drove to"
                        }
                        required
                        quickFills={quickFills}
                        showAddHome={showAddHome}
                      />
                    </Tooltip>
                  )}
                </div>
                {!first && !isLast && (
                  <Tooltip text={ROUTE_TIPS.remove} focusable={false}>
                    <button
                      type="button"
                      onClick={() => removeStop(i - 1)}
                      className="cursor-pointer rounded-lg p-1.5 transition-colors duration-150"
                      style={{ color: "#94a3b8" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#ad2122")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "#94a3b8")
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </Tooltip>
                )}
              </div>
              <div className="flex items-center gap-1">
                {arriving && (
                  <>
                    <Tooltip
                      text={ROUTE_TIPS.miles}
                      hoverOnly
                      className="block min-w-0 flex-1"
                    >
                      <input
                        type="number"
                        value={arriving.miles || ""}
                        min={0}
                        step="0.1"
                        placeholder="mi"
                        onChange={(e) =>
                          setLegMiles(i - 1, parseFloat(e.target.value) || 0)
                        }
                        className="input-neu w-full text-right"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      />
                    </Tooltip>
                    <Tooltip text={ROUTE_TIPS.measure} focusable={false}>
                      <button
                        type="button"
                        disabled={!canMeasure}
                        onClick={() => arriving && void measureLeg(arriving)}
                        className="flex cursor-pointer items-center justify-center rounded-lg p-1.5 transition-colors duration-150 disabled:cursor-default disabled:opacity-40"
                        style={{ color: measuring ? "#4356a9" : "#64748b" }}
                      >
                        {measuring ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <MapPin size={15} />
                        )}
                      </button>
                    </Tooltip>
                  </>
                )}
              </div>

              {/* Connector row with the insert-a-stop button */}
              {i < route.legs.length && (
                <>
                  <div className="relative flex h-7 items-center justify-center self-stretch">
                    <div
                      className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2"
                      style={{ background: "#c5cae0" }}
                    />
                    <Tooltip
                      text={ROUTE_TIPS.insert}
                      focusable={false}
                      className="relative z-10 flex"
                    >
                      <button
                        type="button"
                        onClick={() => insertStop(i)}
                        className="grid h-[18px] w-[18px] cursor-pointer place-items-center rounded-full transition-transform duration-150 hover:scale-110"
                        style={{
                          background: "#ffffff",
                          border: "1px solid #c5cae0",
                          color: "#4356a9",
                        }}
                      >
                        <Plus size={11} />
                      </button>
                    </Tooltip>
                  </div>
                  <div
                    className="flex h-7 items-center text-[11px]"
                    style={{ color: "#4356a9" }}
                  >
                    {route.legs[i].measuredFrom && (
                      <Tooltip text={ROUTE_TIPS.closer} className="tip-label">
                        Measured from {route.legs[i].measuredFrom}, closer than
                        home
                        {route.legs[i].homeMiles !== undefined &&
                          ` (${route.legs[i].homeMiles.toFixed(1)} mi from home)`}
                      </Tooltip>
                    )}
                  </div>
                  <div />
                </>
              )}
            </Fragment>
          )
        })}
      </div>
      <label
        className="mt-2 flex cursor-pointer items-center gap-2 text-sm font-medium"
        style={{ color: "#334155" }}
      >
        <input
          type="checkbox"
          checked={route.returnToStart}
          onChange={(e) => setReturnToStart(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-[#4356a9]"
        />
        <Tooltip text={ROUTE_TIPS.returnToStart} className="tip-label">
          Returned to the point of departure
        </Tooltip>
      </label>
    </div>
  )
}
