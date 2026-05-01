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
        Board members traveling at district expense to conferences, seminars,
        workshops and other appropriate, work-related meetings or events not
        involving the supervision of students.
      </P>
      <P>
        <strong>Definitions</strong> — Travel and related expenses include the
        cost of transportation (by public carrier, private automobile,
        district-owned vehicles), meals, lodging and necessary incidental
        expenses incurred by district employees or board members while in
        attendance at or traveling to and from conferences, seminars and
        workshops or while engaged in other travel in accordance with district
        policy.
      </P>

      <Heading>1. Mileage Reimbursement</Heading>
      <P>
        District employees and School Board members traveling in their personal
        vehicle on District business may request reimbursement based on the
        Internal Revenue Service (IRS) standard mileage rate.
      </P>
      <ol className="mb-3 list-[lower-alpha] space-y-1 pl-6">
        <Li>
          Travel is reimbursable from the employee's regular job location to the
          employee's temporary work location.
        </Li>
        <Li>
          Travel is <em>not</em> reimbursable from the employee's home to the
          employee's regular place of work, <em>even if</em> travel occurs
          multiple times daily or outside of regular work hours.
        </Li>
        <Li>
          Mileage reimbursement requests must be submitted within 60 days after
          the travel event. Requests submitted after the 60-day period will be
          treated as taxable income per IRS guidelines.
        </Li>
      </ol>

      <Heading>2. Expense Reimbursement</Heading>
      <P>
        District employees and School Board members may request reimbursement
        for expenses incurred while in attendance at or traveling to and from
        conferences, seminars and workshops, or while engaged in other travel in
        accordance with district policy.
      </P>
      <ol className="mb-3 list-[lower-alpha] space-y-1 pl-6">
        <Li>
          Expense reimbursements must be submitted on an Employee Check Request
          Form and include original, itemized receipts. Credit card statements
          do not serve as sufficient documentation.
        </Li>
        <Li>
          Reimbursement requests must be submitted within 60 days after the
          expenses were paid or incurred. Requests submitted after the 60-day
          period will be treated as taxable income per IRS guidelines.
        </Li>
      </ol>

      <Heading>3. Regional and Out-of-State Travel</Heading>
      <P>
        Regional and state travel may be permitted, with supervisor approval,
        under the following conditions:
      </P>
      <ol className="mb-3 list-[lower-alpha] space-y-1 pl-6">
        <Li>
          The purpose of the travel fits with district and/or school goals
          and/or curriculum.
        </Li>
        <Li>
          There is a sufficient balance in the appropriate budget to cover the
          expenses.
        </Li>
        <Li>
          Consideration is given to the number of employees from that particular
          school and/or department and/or the district planning to attend the
          same event.
        </Li>
        <Li>
          If the travel involves at least one overnight stay outside the
          district, the travel request is submitted in writing to the employee's
          supervisor.
        </Li>
      </ol>
      <P>
        The administrator approving attendance and travel is responsible for
        determining the reasonableness and necessity of the expense and has the
        authority to disallow unreasonable or unnecessary expenses.
      </P>

      <Heading>4. Airline Travel</Heading>
      <ol className="mb-3 list-[lower-alpha] space-y-1 pl-6">
        <Li>
          Airline tickets should be booked online or by the least expensive
          method, preferably using a district procurement card (PCard). The
          district provides for travel on coach class or tourist class only.
        </Li>
        <Li>
          Frequent flyer miles and other airline travel credit resulting from
          district-paid airfare accrue to the district and may not be used for
          personal travel. Employees must report receipt of any credit or
          benefit to the district within 90 days.
        </Li>
      </ol>

      <Heading>5. Accommodations</Heading>
      <ol className="mb-3 list-[lower-alpha] space-y-1 pl-6">
        <Li>
          Individuals are expected to select accommodations at the most
          reasonable rate. Lodging shall be selected on the basis of reasonable
          cost in conjunction with comfort, safety and convenience.
        </Li>
        <Li>
          When traveling with a non-employee, the district will reimburse
          expenses for the employee only.
        </Li>
        <Li>
          Overnight accommodations in the seven-county Twin Cities metro area
          will only be reimbursed if the employee or School Board member is
          working at the conference.
        </Li>
        <Li>
          Original, itemized receipts are required for all accommodation claims.
        </Li>
      </ol>

      <Heading>6. Meals Reimbursement</Heading>
      <ol className="mb-3 list-[lower-alpha] space-y-1 pl-6">
        <Li>
          The district will not use funds sourced from federal grants or awards
          for meal reimbursements.
        </Li>
        <Li>
          Reimbursement will be based upon actual expenditures; individuals must
          provide original, itemized receipts.
        </Li>
        <Li>
          Maximum reimbursement for meals per person, including tax and tip:{" "}
          <strong>$60 per day</strong>, or for partial days:{" "}
          <strong>$12 breakfast</strong>, <strong>$18 lunch</strong>, and{" "}
          <strong>$30 dinner</strong>.
        </Li>
        <Li>
          The district will not reimburse the cost of alcoholic beverages.
        </Li>
        <Li>
          The district will reimburse the cost of banquets or special functions
          related to an individual's responsibility or participated in by the
          general audience attending the conference. It is necessary to document
          these additional expenses.
        </Li>
      </ol>

      <Heading>7. Other Costs</Heading>
      <ol className="mb-3 list-[lower-alpha] space-y-1 pl-6">
        <Li>
          The district will reimburse registration fees relating to conference,
          workshop or seminar attendance.
        </Li>
        <Li>
          The district will not reimburse for entertainment or recreation costs.
        </Li>
        <Li>
          Relevant printed and audio publications from the conference may be
          purchased with supervisor approval.
        </Li>
        <Li>
          The district will reimburse a reasonable cost of baggage handling when
          necessary.
        </Li>
        <Li>
          Individuals are expected to select transportation at the most
          reasonable rate. Conference transportation (shuttles) should be used
          whenever available.
        </Li>
        <Li>
          Rental car reimbursement requires prior approval by the superintendent
          or designee.
        </Li>
        <Li>
          The district will not reimburse telephone calls for personal or family
          purposes. District-related calls must note the party called on the
          receipt.
        </Li>
        <Li>
          Exceptions to allowed travel expenses must be approved by the
          superintendent or designee.
        </Li>
      </ol>

      <Heading>8. Multiple District Staff</Heading>
      <P>
        When travel involves more than one district employee, each employee must
        separately account for their own individual expenses.
      </P>
      <ol className="mb-3 list-[lower-alpha] space-y-1 pl-6">
        <Li>
          Employee Check Requests should not contain expenses for more than one
          employee. Each employee must submit their own request.
        </Li>
        <Li>
          PCards may be used only for the individual cardholder's expenses and
          may not be used to pay for co-worker expenses.
        </Li>
      </ol>

      <div
        className="mt-6 rounded-lg px-4 py-3 text-xs"
        style={{ background: "#f8f9fb", color: "#64748b" }}
      >
        Source: Orono Public Schools Business Services Procedure Manual
      </div>
    </div>
  )
}
