import { useEffect, type ReactNode } from "react"
import { X, FileText } from "lucide-react"

export default function PolicyDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 z-50 flex h-full flex-col shadow-2xl transition-transform duration-300 ease-in-out"
        style={{
          width: "min(100vw, 520px)",
          background: "#ffffff",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{
            background: "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
          }}
        >
          <div className="flex items-center gap-2">
            <FileText size={16} style={{ color: "rgba(255,255,255,0.7)" }} />
            <span className="text-sm font-semibold text-white">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </>
  )
}

// ─── Travel Policy Content ─────────────────────────────────────────────────

function Heading({ children }: { children: ReactNode }) {
  return (
    <h3
      className="mt-6 mb-3 text-sm font-bold tracking-wide uppercase"
      style={{ color: "#1d2a5d" }}
    >
      {children}
    </h3>
  )
}

function P({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-sm leading-relaxed" style={{ color: "#334155" }}>
      {children}
    </p>
  )
}

function Li({ children }: { children: ReactNode }) {
  return (
    <li className="mb-2 text-sm leading-relaxed" style={{ color: "#334155" }}>
      {children}
    </li>
  )
}

export function TravelPolicyContent() {
  return (
    <div>
      <p
        className="mb-1 text-xs font-semibold tracking-widest uppercase"
        style={{ color: "#64748b" }}
      >
        Orono Public Schools
      </p>
      <h2 className="mb-4 text-lg font-bold" style={{ color: "#1d2a5d" }}>
        Travel and Related Expenses
      </h2>
      <P>
        This regulation provides guidelines for District employees and School
        Board members traveling at District expense for work-related events not
        involving the supervision of students.
      </P>
      <P>
        <strong>Definitions</strong> — Travel and related expenses include the
        cost of transportation (public carrier, private automobile,
        District-owned vehicles), meals, lodging, and necessary incidental
        expenses incurred while attending or traveling to and from conferences,
        seminars, and workshops, or while engaged in other travel in accordance
        with District policy.
      </P>

      <Heading>1. Mileage Reimbursement</Heading>
      <P>
        Employees and Board members traveling in their personal vehicle on
        District business may request reimbursement based on the IRS standard
        business mileage rate in effect on the date of travel. The mileage
        reimbursement form must be completed and signed by the employee,
        authorized by the appropriate administrator, and submitted to Accounts
        Payable. The District reimburses mileage in accordance with IRS
        Publication 463.
      </P>
      <ol className="mb-3 list-[lower-alpha] space-y-1 pl-6">
        <Li>
          Mileage is reimbursable for travel to and from a temporary work
          location (a meeting, training, or conference). For each one-way trip,
          reimbursable mileage is the actual miles driven between the
          employee&apos;s point of departure (residence or primary work site)
          and the temporary work location, <em>not to exceed</em> the distance
          between the employee&apos;s primary work site and the temporary work
          location. The employee must identify the point of departure and return
          on the mileage form. Travel between temporary work locations on the
          same day is reimbursable at actual miles.
        </Li>
        <Li>
          Travel is <em>not</em> reimbursable from the employee&apos;s home to
          the regular place of work, <em>even if</em> travel occurs multiple
          times daily or outside regular work hours. Personal side trips are not
          reimbursable.
        </Li>
        <Li>
          &ldquo;Primary work site&rdquo; is the District building to which the
          employee is regularly assigned. A &ldquo;temporary work
          location&rdquo; is a location, other than a regular work site, at
          which District business is realistically expected to be conducted for
          one year or less.
        </Li>
        <Li>
          Mileage reimbursement requests must be submitted within 60 days after
          the travel event. In extraordinary circumstances, the Business
          Services department may allow an exception.
        </Li>
      </ol>

      <Heading>2. Expense Reimbursement</Heading>
      <P>
        Employees and Board members may request reimbursement for expenses
        incurred while attending or traveling to and from work-related events,
        or while engaged in other travel in accordance with District policy.
      </P>
      <ol className="mb-3 list-[lower-alpha] space-y-1 pl-6">
        <Li>
          Expense reimbursements must be submitted on an Employee Check Request
          Form with original, itemized receipts. Credit card statements do not
          serve as sufficient documentation, as they do not provide the itemized
          detail required for review.
        </Li>
        <Li>
          Reimbursement requests must be submitted within 60 days after expenses
          were paid or incurred. Except in extraordinary circumstances, requests
          after 60 days will be treated as taxable income per IRS guidelines.
        </Li>
      </ol>

      <Heading>3. Regional and Out-of-State Travel</Heading>
      <P>
        Regional and state travel may be permitted, with supervisor approval,
        under the following conditions:
      </P>
      <ol className="mb-3 list-[lower-alpha] space-y-1 pl-6">
        <Li>
          The purpose fits District and/or school goals and/or curriculum.
        </Li>
        <Li>There is sufficient budget balance to cover the expenses.</Li>
        <Li>
          Consideration is given to the number of employees from the same
          school, department, or district planning to attend.
        </Li>
        <Li>
          If the travel involves at least one overnight stay outside the
          District, the request is submitted in writing to the supervisor.
        </Li>
      </ol>
      <P>
        The administrator approving attendance and travel is responsible for
        determining the reasonableness and necessity of the expense within
        District policy and may disallow unreasonable or unnecessary expenses.
      </P>

      <Heading>4. Airline Travel</Heading>
      <ol className="mb-3 list-[lower-alpha] space-y-1 pl-6">
        <Li>
          Airline tickets should be booked online or by the least expensive
          method, preferably using a District P-Card. The District provides for
          coach/tourist class only.
        </Li>
        <Li>
          In accordance with state law, frequent flyer miles and other travel
          credit resulting from District-paid airfare accrue to the District and
          may not be used for personal travel. If the airline will not honor a
          transfer or assignment, the employee must report receipt of the credit
          or benefit to the District within 90 days.
        </Li>
      </ol>

      <Heading>5. Accommodations</Heading>
      <ol className="mb-3 list-[lower-alpha] space-y-1 pl-6">
        <Li>
          Individuals are expected to select accommodations, when they have an
          option, at the most reasonable rate, balancing cost with comfort,
          safety, and convenience.
        </Li>
        <Li>
          When traveling with a non-employee, the District reimburses the
          employee&apos;s expenses only.
        </Li>
        <Li>
          The District reimburses overnight accommodations in the seven-county
          Twin Cities metropolitan area only if the employee or Board member is
          working at the conference.
        </Li>
        <Li>Original, itemized receipts are required.</Li>
      </ol>

      <Heading>6. Meals Reimbursement</Heading>
      <ol className="mb-3 list-[lower-alpha] space-y-1 pl-6">
        <Li>
          The District will not use funds sourced from federal grants or awards
          for meal reimbursements.
        </Li>
        <Li>
          Reimbursement will be based on actual expenditures up to the{" "}
          <a
            href="https://www.gsa.gov/travel/plan-book/per-diem-rates"
            target="_blank"
            rel="noreferrer"
            className="underline"
            style={{ color: "#2d3f89" }}
          >
            GSA per-diem limit
          </a>{" "}
          for the specific location of travel, with original, itemized receipts.
        </Li>
        <Li>
          The District will not reimburse the cost of alcoholic beverages.
        </Li>
        <Li>
          The District will reimburse the cost of banquets or special functions
          related to an individual&apos;s responsibility or participated in by
          the general conference audience; these additional expenses must be
          documented.
        </Li>
      </ol>

      <Heading>7. Other Costs</Heading>
      <ol className="mb-3 list-[lower-alpha] space-y-1 pl-6">
        <Li>
          The District reimburses registration fees for conferences, workshops,
          or seminars.
        </Li>
        <Li>
          The District will not reimburse entertainment or recreation costs.
        </Li>
        <Li>
          Relevant printed and audio publications may be purchased with
          supervisor approval.
        </Li>
        <Li>Reasonable baggage handling will be reimbursed when necessary.</Li>
        <Li>
          Individuals are expected to use conference transportation (such as
          shuttle buses) when available and to select transportation at the most
          reasonable rate.
        </Li>
        <Li>
          Rental cars require prior approval by the Superintendent or designee
          (or, for Board members, the Board chairperson).
        </Li>
        <Li>
          Personal or family telephone calls are not reimbursed; for
          District-related calls, the party called must be noted on the receipt.
        </Li>
        <Li>
          Exceptions to allowed travel expenses must be approved by the
          Superintendent or designee for employees and by the Board chairperson
          for Board members.
        </Li>
      </ol>

      <Heading>8. Multiple District Staff</Heading>
      <P>
        When travel involves more than one employee, each must separately
        account for individual expenses.
      </P>
      <ol className="mb-3 list-[lower-alpha] space-y-1 pl-6">
        <Li>
          Employee Check Requests should not contain expenses for more than one
          employee; each employee must pay for and submit their own expenses.
        </Li>
        <Li>
          P-Cards may be used only for the individual cardholder&apos;s expenses
          and may not pay for co-worker expenses (such as airline tickets or
          meals).
        </Li>
      </ol>

      <div
        className="mt-6 rounded-lg px-4 py-3 text-xs"
        style={{ background: "#f8f9fb", color: "#64748b" }}
      >
        Source: Orono Public Schools Business Services Procedures Manual,
        incorporating updates through June 30, 2026.
      </div>
    </div>
  )
}
