import type {
  CheckRequestData,
  MileageData,
  TravelData,
  TravelExpenseItem,
} from "@/lib/types"

const MILEAGE_RATE = 0.725

function Field({
  label,
  value,
}: {
  label: string
  value: string | number | undefined
}) {
  return (
    <div>
      <p
        className="text-xs font-semibold tracking-wider uppercase"
        style={{ color: "#64748b" }}
      >
        {label}
      </p>
      <p className="mt-0.5 text-sm" style={{ color: "#334155" }}>
        {value || "—"}
      </p>
    </div>
  )
}

function formatDate(d: string) {
  if (!d) return "—"
  const [y, m, day] = d.split("-")
  return `${m}/${day}/${y}`
}

function currency(n: number) {
  return `$${n.toFixed(2)}`
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="mb-3 text-sm font-semibold tracking-widest uppercase"
      style={{ color: "#1d2a5d" }}
    >
      {children}
    </h3>
  )
}

function Table({
  headers,
  children,
}: {
  headers: string[]
  children: React.ReactNode
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr style={{ color: "#64748b" }}>
            {headers.map((h) => (
              <th key={h} className="pr-4 pb-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ color: "#334155" }}>{children}</tbody>
      </table>
    </div>
  )
}

export function CheckRequestView({ data }: { data: CheckRequestData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date of Request" value={formatDate(data.dateRequest)} />
        <Field label="Date Needed" value={formatDate(data.dateNeeded)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Payee" value={data.payee} />
        <Field
          label="Address"
          value={
            data.address
              ? `${data.address.street}, ${data.address.city}, ${data.address.state} ${data.address.zip}`
              : undefined
          }
        />
      </div>

      {data.checkNumber && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Check Number" value={data.checkNumber} />
          <Field label="Vendor ID" value={data.vendorId} />
        </div>
      )}

      <div>
        <SectionHeading>Expenses</SectionHeading>
        <Table headers={["Account Code", "Description", "Amount"]}>
          {data.expenses.map((exp, i) => (
            <tr
              key={i}
              className="border-t"
              style={{ borderColor: "rgba(180,185,195,0.25)" }}
            >
              <td className="py-2 pr-4 font-mono">{exp.code || "—"}</td>
              <td className="py-2 pr-4">{exp.description || "—"}</td>
              <td className="py-2 pr-4">{currency(exp.amount)}</td>
            </tr>
          ))}
          <tr
            className="border-t font-bold"
            style={{ color: "#1d2a5d", borderColor: "rgba(180,185,195,0.25)" }}
          >
            <td className="py-2 pr-4" colSpan={2} />
            <td className="py-2 pr-4">{currency(data.grandTotal)}</td>
          </tr>
        </Table>
      </div>
    </div>
  )
}

export function MileageView({ data }: { data: MileageData }) {
  const hasCommuteDeduction =
    typeof data.totalCommuteDeduction === "number" &&
    data.totalCommuteDeduction > 0
  const reimbursableMiles = hasCommuteDeduction
    ? (data.reimbursableMiles ?? data.totalMiles)
    : data.totalMiles

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Employee Name" value={data.name} />
        <Field label="Employee ID" value={data.employeeId} />
        <Field label="Account Code" value={data.accountCode} />
      </div>

      <div>
        <SectionHeading>Trips</SectionHeading>
        <Table headers={["Date", "From", "To", "Purpose", "Miles"]}>
          {data.trips.map((trip, i) => {
            const effectiveMiles = trip.isRoundTrip
              ? trip.miles * 2
              : trip.miles
            return (
              <tr
                key={i}
                className="border-t"
                style={{ borderColor: "rgba(180,185,195,0.25)" }}
              >
                <td className="py-2 pr-4 whitespace-nowrap">
                  {formatDate(trip.date)}
                </td>
                <td className="py-2 pr-4">{trip.from}</td>
                <td className="py-2 pr-4">{trip.to}</td>
                <td className="py-2 pr-4">{trip.purpose || "—"}</td>
                <td className="py-2 pr-4 whitespace-nowrap">
                  {effectiveMiles.toFixed(1)}
                  {trip.isRoundTrip && (
                    <span
                      className="ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                      style={{
                        background: "#e0e7ff",
                        color: "#1d2a5d",
                      }}
                    >
                      Round Trip
                    </span>
                  )}
                  {hasCommuteDeduction && trip.isWorkingDay !== false && (
                    <span
                      className="ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                      style={{
                        background: "#fef3c7",
                        color: "#92400e",
                      }}
                      title="Commute deducted for this trip"
                    >
                      Working
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
          <tr
            className="border-t font-bold"
            style={{ color: "#1d2a5d", borderColor: "rgba(180,185,195,0.25)" }}
          >
            <td className="py-2 pr-4" colSpan={4}>
              Total
            </td>
            <td className="py-2 pr-4">{data.totalMiles.toFixed(1)} mi</td>
          </tr>
          {hasCommuteDeduction && (
            <>
              <tr
                style={{
                  color: "#ad2122",
                  borderColor: "rgba(180,185,195,0.25)",
                }}
              >
                <td className="py-2 pr-4 text-sm" colSpan={4}>
                  Less commute deduction
                  {data.commuteMilesUsed && (
                    <span
                      className="ml-1 text-xs"
                      style={{ color: "#94a3b8" }}
                    >
                      ({data.commuteMilesUsed.toFixed(1)} mi × 2 per working day)
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 text-sm font-semibold">
                  −{(data.totalCommuteDeduction ?? 0).toFixed(1)} mi
                </td>
              </tr>
              <tr
                className="border-t font-bold"
                style={{
                  color: "#1d2a5d",
                  borderColor: "rgba(180,185,195,0.25)",
                }}
              >
                <td className="py-2 pr-4" colSpan={4}>
                  Reimbursable Miles
                </td>
                <td className="py-2 pr-4">
                  {reimbursableMiles.toFixed(1)} mi
                </td>
              </tr>
            </>
          )}
        </Table>
      </div>

      <div
        className="flex items-center justify-end gap-6 rounded-lg px-4 py-3"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(180,185,195,0.25)",
        }}
      >
        <span
          className="text-xs font-semibold tracking-wider uppercase"
          style={{ color: "#64748b" }}
        >
          {reimbursableMiles.toFixed(1)} mi × ${MILEAGE_RATE.toFixed(3)}
        </span>
        <span className="text-base font-bold" style={{ color: "#1d2a5d" }}>
          {currency(data.totalReimbursement)}
        </span>
      </div>
    </div>
  )
}

const EXPENSE_CATEGORY_LABELS: Record<TravelExpenseItem["category"], string> = {
  meal: "Meal",
  lodging: "Lodging",
  registration: "Registration",
  airfare: "Airfare",
  other_transport: "Other Transportation",
}

function ExpenseReceiptThumb({
  receipt,
}: {
  receipt?: { url: string; name: string; mimeType: string }
}) {
  if (!receipt) return null
  const isImage = receipt.mimeType.startsWith("image/")
  return (
    <a
      href={receipt.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block"
      title={receipt.name}
    >
      {isImage ? (
        <img
          src={receipt.url}
          alt="Receipt"
          className="h-8 w-8 rounded object-cover"
        />
      ) : (
        <span
          className="text-[10px] font-medium underline"
          style={{ color: "#4356a9" }}
        >
          PDF
        </span>
      )}
    </a>
  )
}

export function TravelView({ data }: { data: TravelData }) {
  const hasNewExpenses = data.expenses && data.expenses.length > 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Employee Name" value={data.name} />
        <Field label="Employee ID" value={data.employeeId} />
        <Field label="Form Date" value={formatDate(data.formDate)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Address" value={data.address} />
        <Field label="Budget Year" value={data.budgetYear} />
      </div>

      <Field label="Account Code" value={data.accountCode} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Meeting / Conference Title" value={data.meetingTitle} />
        <Field label="Location" value={data.location} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Dates Away"
          value={`${formatDate(data.dateStart)} – ${formatDate(data.dateEnd)}`}
        />
        <Field
          label="Time Away"
          value={
            data.timeAwayStart && data.timeAwayEnd
              ? `${data.timeAwayStart} – ${data.timeAwayEnd}`
              : undefined
          }
        />
      </div>

      {data.justification && (
        <div>
          <p
            className="mb-1 text-xs font-semibold tracking-wider uppercase"
            style={{ color: "#64748b" }}
          >
            Justification
          </p>
          <p
            className="text-sm whitespace-pre-wrap"
            style={{ color: "#334155" }}
          >
            {data.justification}
          </p>
        </div>
      )}

      {/* New format: unified expenses (with mileage as a row) */}
      {hasNewExpenses ? (
        <div>
          <SectionHeading>Expenses</SectionHeading>
          <Table headers={["Date", "Category", "Detail", "Amount", "Receipt"]}>
            {data.carTrips && data.carTrips.length > 0
              ? data.carTrips.map((trip, i) => {
                  const effective = trip.isRoundTrip
                    ? trip.miles * 2
                    : trip.miles
                  if (effective <= 0) return null
                  return (
                    <tr
                      key={`trip-${i}`}
                      className="border-t"
                      style={{ borderColor: "rgba(180,185,195,0.25)" }}
                    >
                      <td className="py-2 pr-4 align-top whitespace-nowrap">
                        {trip.date ? formatDate(trip.date) : "—"}
                      </td>
                      <td className="py-2 pr-4 align-top">Mileage</td>
                      <td className="py-2 pr-4 align-top">
                        <div>
                          {trip.from && trip.to
                            ? `${trip.from} → ${trip.to}`
                            : "—"}
                          {trip.isRoundTrip && (
                            <span
                              className="ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                              style={{
                                background: "#e0e7ff",
                                color: "#1d2a5d",
                              }}
                            >
                              Round Trip
                            </span>
                          )}
                        </div>
                        <div
                          className="mt-0.5 text-xs"
                          style={{ color: "#64748b" }}
                        >
                          {effective.toFixed(1)} mi × ${MILEAGE_RATE.toFixed(3)}
                        </div>
                      </td>
                      <td className="py-2 pr-4 align-top">
                        {currency(effective * MILEAGE_RATE)}
                      </td>
                      <td />
                    </tr>
                  )
                })
              : data.actuals.miles > 0 && (
                  <tr
                    className="border-t"
                    style={{ borderColor: "rgba(180,185,195,0.25)" }}
                  >
                    <td className="py-2 pr-4">—</td>
                    <td className="py-2 pr-4">Mileage</td>
                    <td className="py-2 pr-4">
                      {data.actuals.miles.toFixed(1)} mi × $
                      {MILEAGE_RATE.toFixed(3)}
                    </td>
                    <td className="py-2 pr-4">
                      {currency(data.actuals.miles * MILEAGE_RATE)}
                    </td>
                    <td />
                  </tr>
                )}
            {data.expenses!.map((exp, i) => (
              <tr
                key={i}
                className="border-t"
                style={{ borderColor: "rgba(180,185,195,0.25)" }}
              >
                <td className="py-2 pr-4 align-top whitespace-nowrap">
                  {formatDate(exp.date)}
                </td>
                <td className="py-2 pr-4 align-top">
                  {EXPENSE_CATEGORY_LABELS[exp.category]}
                </td>
                <td className="py-2 pr-4 align-top">
                  <div>
                    {exp.mealType
                      ? exp.mealType.charAt(0).toUpperCase() +
                        exp.mealType.slice(1)
                      : exp.location || exp.description || "—"}
                  </div>
                  {exp.notes && (
                    <div
                      className="mt-1 text-xs whitespace-pre-wrap italic"
                      style={{ color: "#64748b" }}
                    >
                      {exp.notes}
                    </div>
                  )}
                </td>
                <td className="py-2 pr-4 align-top">{currency(exp.amount)}</td>
                <td className="py-2 pr-4 align-top">
                  <ExpenseReceiptThumb receipt={exp.receipt} />
                </td>
              </tr>
            ))}
            <tr
              className="border-t font-bold"
              style={{
                color: "#1d2a5d",
                borderColor: "rgba(180,185,195,0.25)",
              }}
            >
              <td className="py-2 pr-4" colSpan={3}>
                Total
              </td>
              <td className="py-2 pr-4">
                {currency(
                  data.expenses!.reduce((s, e) => s + (e.amount || 0), 0) +
                    data.actuals.miles * MILEAGE_RATE
                )}
              </td>
              <td />
            </tr>
          </Table>
          {data.taxExemptAcknowledged && (
            <p
              className="mt-2 text-[11px] font-medium"
              style={{ color: "#64748b" }}
            >
              Tax-exempt acknowledgment confirmed
            </p>
          )}
        </div>
      ) : (
        /* Legacy format: actuals + meals tables */
        <>
          <div>
            <SectionHeading>Actual Expenses</SectionHeading>
            <Table headers={["Category", "Amount"]}>
              <tr
                className="border-t"
                style={{ borderColor: "rgba(180,185,195,0.25)" }}
              >
                <td className="py-2 pr-4">
                  Miles ({data.actuals.miles} × ${MILEAGE_RATE.toFixed(3)})
                </td>
                <td className="py-2 pr-4">
                  {currency(data.actuals.miles * MILEAGE_RATE)}
                </td>
              </tr>
              <tr
                className="border-t"
                style={{ borderColor: "rgba(180,185,195,0.25)" }}
              >
                <td className="py-2 pr-4">Other Transport</td>
                <td className="py-2 pr-4">
                  {currency(data.actuals.otherTransport)}
                </td>
              </tr>
              <tr
                className="border-t"
                style={{ borderColor: "rgba(180,185,195,0.25)" }}
              >
                <td className="py-2 pr-4">Lodging</td>
                <td className="py-2 pr-4">{currency(data.actuals.lodging)}</td>
              </tr>
              <tr
                className="border-t"
                style={{ borderColor: "rgba(180,185,195,0.25)" }}
              >
                <td className="py-2 pr-4">Registration</td>
                <td className="py-2 pr-4">
                  {currency(data.actuals.registration)}
                </td>
              </tr>
              {data.actuals.others.map((item, i) => (
                <tr
                  key={i}
                  className="border-t"
                  style={{ borderColor: "rgba(180,185,195,0.25)" }}
                >
                  <td className="py-2 pr-4">{item.desc || "Other"}</td>
                  <td className="py-2 pr-4">{currency(item.amount)}</td>
                </tr>
              ))}
              <tr
                className="border-t"
                style={{ borderColor: "rgba(180,185,195,0.25)" }}
              >
                <td className="py-2 pr-4">Meals</td>
                <td className="py-2 pr-4">
                  {currency(data.actuals.mealTotal)}
                </td>
              </tr>
              <tr
                className="border-t font-bold"
                style={{
                  color: "#1d2a5d",
                  borderColor: "rgba(180,185,195,0.25)",
                }}
              >
                <td className="py-2 pr-4">Total</td>
                <td className="py-2 pr-4">{currency(data.actuals.total)}</td>
              </tr>
            </Table>
          </div>

          {data.meals.length > 0 && (
            <div>
              <SectionHeading>Meals</SectionHeading>
              <Table
                headers={["Date", "Breakfast", "Lunch", "Dinner", "Day Total"]}
              >
                {data.meals.map((meal, i) => {
                  const dayTotal = meal.breakfast + meal.lunch + meal.dinner
                  return (
                    <tr
                      key={i}
                      className="border-t"
                      style={{ borderColor: "rgba(180,185,195,0.25)" }}
                    >
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {formatDate(meal.date)}
                      </td>
                      <td className="py-2 pr-4">{currency(meal.breakfast)}</td>
                      <td className="py-2 pr-4">{currency(meal.lunch)}</td>
                      <td className="py-2 pr-4">{currency(meal.dinner)}</td>
                      <td className="py-2 pr-4 font-semibold">
                        {currency(dayTotal)}
                      </td>
                    </tr>
                  )
                })}
                <tr
                  className="border-t font-bold"
                  style={{
                    color: "#1d2a5d",
                    borderColor: "rgba(180,185,195,0.25)",
                  }}
                >
                  <td className="py-2 pr-4" colSpan={4}>
                    Meal Total
                  </td>
                  <td className="py-2 pr-4">
                    {currency(
                      data.meals.reduce(
                        (s, m) => s + m.breakfast + m.lunch + m.dinner,
                        0
                      )
                    )}
                  </td>
                </tr>
              </Table>
            </div>
          )}
        </>
      )}

      {(data.advanceRequested > 0 || data.finalClaim > 0) && (
        <div
          className="grid gap-4 rounded-lg px-4 py-3 sm:grid-cols-2"
          style={{
            background: "#ffffff",
            border: "1px solid rgba(180,185,195,0.25)",
          }}
        >
          {data.advanceRequested > 0 && (
            <Field
              label="Advance Requested"
              value={currency(data.advanceRequested)}
            />
          )}
          {data.finalClaim > 0 && (
            <Field label="Final Claim" value={currency(data.finalClaim)} />
          )}
        </div>
      )}
    </div>
  )
}
