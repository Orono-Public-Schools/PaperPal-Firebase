import { useState, useRef, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Plus, Trash2, CheckCircle, Send, X, FileText } from "lucide-react"
import AppLayout from "@/components/layout/AppLayout"
import { type QuickFill } from "@/components/forms/AddressAutocomplete"
import RouteEditor from "@/components/forms/RouteEditor"
import Tooltip from "@/components/forms/Tooltip"
import BudgetCodeBuilder from "@/components/forms/BudgetCodeBuilder"
import BudgetCodeAutocomplete from "@/components/forms/BudgetCodeAutocomplete"
import PolicyDrawer, {
  TravelPolicyContent,
} from "@/components/forms/PolicyDrawer"
import SignatureField, {
  type SignatureFieldRef,
} from "@/components/forms/SignatureField"
import DatePicker from "@/components/forms/DatePicker"
import StaffEmailAutocomplete from "@/components/forms/StaffEmailAutocomplete"
import { deleteField, arrayUnion, Timestamp } from "firebase/firestore"
import { useAuth } from "@/hooks/useAuth"
import { useSandbox } from "@/hooks/useSandbox"
import { useFormFields } from "@/hooks/useFormFields"
import { useDraft } from "@/hooks/useDraft"
import {
  createSubmission,
  getSubmission,
  updateSubmission,
  getAppSettings,
  createOrUpdateUserProfile,
  recordBudgetCodes,
  resolveRoutingChain,
} from "@/lib/firestore"
import RoutingChainPreview from "@/components/forms/RoutingChainPreview"
import type { MileageData } from "@/lib/types"
import { getCommuteMiles } from "@/lib/commute"
import {
  emptyRoute,
  routeMiles,
  routeProblem,
  tripHomeLegs,
  upgradeTrip,
} from "@/lib/route"
import {
  diffSubmissionChanges,
  editActionForRole,
  mileageRateForDate,
  mileageRateGroups,
  stampTrips,
} from "@/lib/utils"
import type { MileageTrip, MileageRateEntry, TripRoute } from "@/lib/types"

function emptyTrip(): MileageTrip {
  return {
    date: "",
    purpose: "",
    miles: 0,
    route: emptyRoute(),
    isWorkingDay: true,
  }
}

export default function MileageReimbursement() {
  const { user, userProfile, refreshUserProfile } = useAuth()
  const { sandbox } = useSandbox()
  const { isVisible, getOrder } = useFormFields("mileage")
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const resubmitId = searchParams.get("resubmit")
  const editId = searchParams.get("edit")
  const loadId = resubmitId || editId
  const isEdit = !!editId
  const signatureRef = useRef<SignatureFieldRef>(null)
  const draft = useDraft<{
    submitterName: string
    routeRequestTo: string
    employeeId: string
    accountCode: string
    trips: MileageTrip[]
  }>("paperpal-draft-mileage", !!loadId)
  const {
    save: saveDraft,
    load: loadDraft,
    clear: clearDraft,
    lastSaved: draftLastSaved,
  } = draft

  const draftLoaded = useRef(false)
  const saved = loadDraft()

  const [submitterName, setSubmitterName] = useState(
    saved?.submitterName ?? userProfile?.fullName ?? ""
  )
  const [routeRequestTo, setRouteRequestTo] = useState(
    sandbox ? (user?.email ?? "") : (userProfile?.supervisorEmail ?? "")
  )
  const [employeeId, setEmployeeId] = useState(
    saved?.employeeId ?? userProfile?.employeeId ?? ""
  )
  const [accountCode, setAccountCode] = useState(saved?.accountCode ?? "")
  const [trips, setTrips] = useState<MileageTrip[]>(
    saved?.trips?.length ? saved.trips.map(upgradeTrip) : [emptyTrip()]
  )
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submissionId, setSubmissionId] = useState("")
  const [policyOpen, setPolicyOpen] = useState(false)
  const [quickFills, setQuickFills] = useState<QuickFill[]>([])
  const [school, setSchool] = useState<{ address: string; label: string }>()
  const [commuteMiles, setCommuteMiles] = useState<number | null>(null)
  const [mileageRates, setMileageRates] = useState<
    MileageRateEntry[] | undefined
  >(undefined)

  useEffect(() => {
    if (!userProfile) return
    let cancelled = false
    const load = async () => {
      const settings = await getAppSettings()
      if (cancelled) return
      setMileageRates(settings.mileageRates)
      if (!settings.commuteDeductionEnabled) {
        setCommuteMiles(null)
        return
      }
      const miles = await getCommuteMiles(userProfile, settings.schoolAddress)
      if (!cancelled) setCommuteMiles(miles)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [userProfile])

  // Auto-save draft
  useEffect(() => {
    if (draftLoaded.current) {
      saveDraft({
        submitterName,
        routeRequestTo,
        employeeId,
        accountCode,
        trips,
      })
    }
    draftLoaded.current = true
  }, [saveDraft, submitterName, routeRequestTo, employeeId, accountCode, trips])

  // Build quick-fill options for From/To fields
  useEffect(() => {
    const fills: QuickFill[] = []

    if (userProfile?.homeAddress) {
      fills.push({
        label: "Home",
        address: userProfile.homeAddress,
        icon: "home",
      })
    }

    getAppSettings().then((settings) => {
      if (settings.schoolAddress) {
        const label = settings.schoolAddressLabel || "School"
        fills.push({
          label,
          address: settings.schoolAddress,
          icon: "building",
        })
        if (settings.closerOriginEnabled) {
          setSchool({ address: settings.schoolAddress, label })
        }
      }
      setQuickFills(fills)
    })
  }, [userProfile?.homeAddress])

  // Load existing submission for resubmit or staff/approver/supervisor/controller edit
  const editTargetRef = useRef<{
    approverEmail?: string
    supervisorEmail?: string
    formData?: MileageData
  }>({})
  const [changeNote, setChangeNote] = useState("")
  useEffect(() => {
    if (!loadId) return
    getSubmission(loadId).then((sub) => {
      if (!sub || sub.formType !== "mileage") return
      editTargetRef.current = {
        approverEmail: sub.approverEmail,
        supervisorEmail: sub.supervisorEmail,
        formData: sub.formData as MileageData,
      }
      const fd = sub.formData as MileageData
      setSubmitterName(sub.submitterName)
      setRouteRequestTo(sub.supervisorEmail)
      setEmployeeId(fd.employeeId)
      setAccountCode(fd.accountCode)
      setTrips(fd.trips.length > 0 ? fd.trips.map(upgradeTrip) : [emptyTrip()])
    })
  }, [loadId])

  const {
    trips: stampedTrips,
    totalMiles,
    totalCommuteDeduction,
    reimbursableMiles,
    totalReimbursement,
  } = stampTrips(
    trips,
    commuteMiles,
    userProfile?.homeAddress ?? "",
    mileageRates
  )
  const rateGroups = mileageRateGroups(stampedTrips)

  function updateTrip<K extends keyof MileageTrip>(
    index: number,
    field: K,
    value: MileageTrip[K]
  ) {
    setTrips((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    )
  }

  function updateRoute(index: number, update: (r: TripRoute) => TripRoute) {
    setTrips((prev) =>
      prev.map((t, i) => {
        if (i !== index) return t
        const route = update(t.route ?? emptyRoute())
        return { ...t, route, miles: routeMiles(route) }
      })
    )
  }

  function addTrip() {
    setTrips((prev) => [...prev, emptyTrip()])
  }

  function removeTrip(index: number) {
    setTrips((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !userProfile) return
    const signatureUrl = isEdit
      ? ""
      : ((await signatureRef.current?.getDataUrl()) ?? "")
    if (!isEdit && !signatureUrl) {
      alert("Please add your signature before submitting.")
      return
    }
    for (const [i, t] of trips.entries()) {
      const problem = routeProblem(t.route ?? emptyRoute())
      if (problem) {
        alert(`Trip ${i + 1}: ${problem}`)
        return
      }
    }
    setSubmitting(true)
    try {
      const formData: MileageData = {
        name: submitterName,
        employeeId,
        accountCode,
        trips: stampedTrips,
        totalMiles,
        totalReimbursement,
        ...(commuteMiles && totalCommuteDeduction > 0
          ? {
              commuteMilesUsed: commuteMiles,
              totalCommuteDeduction,
              reimbursableMiles,
              commuteHomeAddress: userProfile.homeAddress ?? "",
            }
          : {}),
      }

      // Resolve approval chain from the Route To value's role.
      // Sandbox: route everything to self; the user's own role decides flow.
      // Production: look up the routeRequestTo user. If they're an approver,
      // the chain is 4-step (approver → their supervisor → controller).
      // Otherwise it's 2-step (supervisor → controller).
      let chain: {
        approverEmail?: string
        approverName?: string
        supervisorEmail: string
        supervisorName: string
      }
      if (sandbox) {
        if (userProfile.role === "approver") {
          chain = {
            approverEmail: user.email ?? "",
            approverName: userProfile.fullName,
            supervisorEmail: user.email ?? "",
            supervisorName: userProfile.fullName,
          }
        } else {
          chain = {
            supervisorEmail: user.email ?? "",
            supervisorName: userProfile.fullName,
          }
        }
      } else {
        const resolved = await resolveRoutingChain(
          routeRequestTo || userProfile.supervisorEmail || ""
        )
        chain = {
          approverEmail: resolved.approverEmail,
          approverName: resolved.approverName,
          supervisorEmail: resolved.supervisorEmail,
          supervisorName: resolved.supervisorName,
        }
      }
      const approverFields = chain.approverEmail
        ? {
            approverEmail: chain.approverEmail,
            approverName: chain.approverName ?? "",
          }
        : {}

      const changes = editTargetRef.current.formData
        ? diffSubmissionChanges(
            { formData: editTargetRef.current.formData },
            { formData }
          )
        : []
      const note = changeNote.trim()

      if (editId) {
        await updateSubmission(editId, {
          formData,
          summary: `Mileage — ${totalMiles.toFixed(1)} mi`,
          amount: totalReimbursement,
          activityLog: arrayUnion({
            action: editActionForRole(
              user.email ?? "",
              editTargetRef.current.approverEmail,
              editTargetRef.current.supervisorEmail
            ),
            by: user.email ?? "",
            at: Timestamp.now(),
            ...(note && { comments: note }),
            ...(changes.length > 0 && { changes }),
          }),
        })
        setSubmissionId(editId)
      } else if (resubmitId) {
        await updateSubmission(resubmitId, {
          status: "pending",
          submitterName: userProfile.fullName,
          supervisorEmail: chain.supervisorEmail,
          supervisorName: chain.supervisorName,
          ...approverFields,
          employeeSignatureUrl: signatureUrl,
          formData,
          summary: `Mileage — ${totalMiles.toFixed(1)} mi`,
          amount: totalReimbursement,
          sandbox: sandbox || false,
          approverSignatureUrl: "",
          supervisorSignatureUrl: "",
          finalApproverSignatureUrl: "",
          reviewedAt: deleteField() as never,
          approvedAt: deleteField() as never,
          denialComments: deleteField() as never,
          revisionComments: deleteField() as never,
          approvalProcessingError: deleteField() as never,
          pdfDriveId: deleteField() as never,
          pdfDriveUrl: deleteField() as never,
          activityLog: arrayUnion({
            action: "resubmitted",
            by: user.email ?? "",
            at: Timestamp.now(),
            ...(note && { comments: note }),
            ...(changes.length > 0 && { changes }),
          }),
        })
        setSubmissionId(resubmitId)
      } else {
        const id = await createSubmission({
          formType: "mileage",
          status: "pending",
          submitterUid: user.uid,
          submitterEmail: user.email ?? "",
          submitterName: userProfile.fullName,
          supervisorEmail: chain.supervisorEmail,
          supervisorName: chain.supervisorName,
          ...approverFields,
          employeeSignatureUrl: signatureUrl,
          formData,
          attachments: [],
          revisionHistory: [],
          activityLog: [
            {
              action: "submitted",
              by: user.email ?? "",
              at: Timestamp.now(),
            },
          ],
          summary: `Mileage — ${totalMiles.toFixed(1)} mi`,
          amount: totalReimbursement,
          ...(sandbox && { sandbox: true }),
        })
        setSubmissionId(id)
      }
      await recordBudgetCodes(user.uid, [accountCode])
      void refreshUserProfile()
      clearDraft()
      if (isEdit && editId) {
        navigate(`/forms/mileage/${editId}`)
        return
      }
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <AppLayout>
        <div
          className="mx-auto max-w-lg rounded-xl p-10 text-center"
          style={{
            background: "#ffffff",
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
          }}
        >
          <CheckCircle
            size={48}
            className="mx-auto mb-4"
            style={{ color: "#4356a9" }}
          />
          <h2 className="text-xl font-bold" style={{ color: "#1d2a5d" }}>
            Submitted!
          </h2>
          <p className="mt-2 text-sm" style={{ color: "#64748b" }}>
            Your mileage reimbursement request{" "}
            <span className="font-semibold" style={{ color: "#1d2a5d" }}>
              {submissionId}
            </span>{" "}
            has been submitted for approval.
          </p>
          <p
            className="mt-1 text-sm font-semibold"
            style={{ color: "#4356a9" }}
          >
            ${totalReimbursement.toFixed(2)} for {reimbursableMiles.toFixed(1)}{" "}
            miles
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 cursor-pointer rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #1d2a5d 0%, #2d3f89 100%)",
              boxShadow: "0 2px 8px rgba(29,42,93,0.25)",
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      {/* Page header */}
      <div className="mb-5 sm:mb-8">
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "#ffffff" }}
        >
          {isEdit ? "Edit Mileage Reimbursement" : "Mileage Reimbursement"}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          {isEdit
            ? "Editing as controller — changes will not change the approval status."
            : null}
          {!isEdit && (
            <>
              Reimbursed at the IRS rate in effect on each trip&apos;s date
              (currently{" "}
              <span className="font-semibold">
                ${mileageRateForDate(mileageRates, undefined).toFixed(3)} per
                mile
              </span>
              ). Enter each trip below and submit for supervisor approval.{" "}
            </>
          )}
          <button
            type="button"
            onClick={() => setPolicyOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1 underline"
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            <FileText size={12} />
            Travel Policy
          </button>
        </p>
        {draftLastSaved && (
          <div className="mt-2 flex items-center gap-3">
            <span
              className="text-[11px]"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Draft saved {draftLastSaved.toLocaleTimeString()}
            </span>
            <button
              type="button"
              onClick={() => {
                clearDraft()
                window.location.reload()
              }}
              className="cursor-pointer text-[11px] font-medium underline"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Clear draft
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Employee info */}
        <Section
          title="Employee Information"
          style={{ order: getOrder("fullName") }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name">
              <input
                type="text"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                required
                className="input-neu w-full"
              />
            </Field>
            {isVisible("employeeId") && (
              <Field label="Employee ID">
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. 12345"
                  className="input-neu w-full"
                />
              </Field>
            )}
            {isVisible("accountCode") && (
              <Field label="Account Code">
                <BudgetCodeAutocomplete
                  value={accountCode}
                  onChange={setAccountCode}
                  recentCodes={userProfile?.recentBudgetCodes}
                  disabled={userProfile?.role === "staff"}
                />
                {userProfile?.role !== "staff" && (
                  <BudgetCodeBuilder
                    value={accountCode}
                    onChange={setAccountCode}
                  />
                )}
                {userProfile?.role === "staff" && (
                  <p className="mt-1 text-[11px]" style={{ color: "#94a3b8" }}>
                    Assigned by your supervisor during review.
                  </p>
                )}
              </Field>
            )}
            {isVisible("routeTo") && !isEdit && !sandbox && (
              <Field label="Route To">
                <StaffEmailAutocomplete
                  value={routeRequestTo}
                  onChange={setRouteRequestTo}
                  placeholder="Supervisor or approver email"
                  className="input-neu"
                />
                <p className="mt-1 text-[11px]" style={{ color: "#94a3b8" }}>
                  Route to a supervisor for a 2-step approval, or to an approver
                  to add their supervisor as a middle step.
                </p>
                <RoutingChainPreview routeToEmail={routeRequestTo} />
              </Field>
            )}
          </div>
          {sandbox && !isEdit && (
            <p className="mt-3 text-[11px]" style={{ color: "#94a3b8" }}>
              Sandbox: all approval steps will be routed to your own email. Flow
              follows your role ({userProfile?.role ?? "staff"}).
            </p>
          )}
        </Section>

        {/* Trip log */}
        <Section title="Trip Log" style={{ order: getOrder("trips") }}>
          <div
            className="divide-y"
            style={{ borderColor: "rgba(180,185,195,0.25)" }}
          >
            {trips.map((trip, i) => (
              <TripRow
                key={i}
                trip={trip}
                index={i}
                onChange={updateTrip}
                onRouteChange={(update) => updateRoute(i, update)}
                onRemove={trips.length > 1 ? () => removeTrip(i) : undefined}
                quickFills={quickFills}
                showAddHome={!userProfile?.homeAddress}
                homeAddress={userProfile?.homeAddress ?? ""}
                school={school}
                showWorkingDayToggle={
                  !!commuteMiles &&
                  commuteMiles > 0 &&
                  tripHomeLegs(trip, userProfile?.homeAddress ?? "") > 0
                }
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addTrip}
            className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200"
            style={{ color: "#4356a9" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(67,86,169,0.06)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <Plus size={15} />
            Add Trip
          </button>
        </Section>

        {/* Totals */}
        <div
          className="rounded-xl p-4 sm:p-5"
          style={{
            order: 90,
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: "#64748b" }}>
              Total Miles
            </span>
            <span className="font-semibold" style={{ color: "#1d2a5d" }}>
              {totalMiles.toFixed(1)} mi
            </span>
          </div>
          {totalCommuteDeduction > 0 && (
            <>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className="text-sm font-medium"
                  style={{ color: "#64748b" }}
                >
                  Less commute deduction
                  {commuteMiles && (
                    <span className="ml-1 text-xs" style={{ color: "#94a3b8" }}>
                      ({commuteMiles.toFixed(1)} mi one-way, on trips to/from
                      home)
                    </span>
                  )}
                </span>
                <span className="font-semibold" style={{ color: "#ad2122" }}>
                  −{totalCommuteDeduction.toFixed(1)} mi
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className="text-sm font-medium"
                  style={{ color: "#64748b" }}
                >
                  Reimbursable Miles
                </span>
                <span className="font-semibold" style={{ color: "#1d2a5d" }}>
                  {reimbursableMiles.toFixed(1)} mi
                </span>
              </div>
            </>
          )}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: "#64748b" }}>
              Rate
            </span>
            <span
              className="text-right font-semibold"
              style={{ color: "#1d2a5d" }}
            >
              {rateGroups.length > 1
                ? rateGroups
                    .map(
                      (g) => `${g.miles.toFixed(1)} mi × $${g.rate.toFixed(3)}`
                    )
                    .join(" + ")
                : `$${(
                    rateGroups[0]?.rate ??
                    mileageRateForDate(mileageRates, undefined)
                  ).toFixed(3)} / mile`}
            </span>
          </div>
          <div
            className="mt-3 flex items-center justify-between border-t pt-3"
            style={{ borderColor: "rgba(180,185,195,0.4)" }}
          >
            <span className="text-base font-bold" style={{ color: "#1d2a5d" }}>
              Total Reimbursement
            </span>
            <span className="text-lg font-bold" style={{ color: "#4356a9" }}>
              ${totalReimbursement.toFixed(2)}
            </span>
          </div>
        </div>

        {!isEdit && (
          <Section title="Employee Signature" style={{ order: 91 }}>
            <SignatureField
              ref={signatureRef}
              savedSignatureUrl={userProfile?.savedSignatureUrl}
              fullName={userProfile?.fullName}
              onSaveSignature={(dataUrl) => {
                if (user)
                  createOrUpdateUserProfile(user.uid, {
                    savedSignatureUrl: dataUrl,
                  })
              }}
            />
          </Section>
        )}

        {(isEdit || resubmitId) && (
          <div
            className="rounded-xl p-4 sm:p-5"
            style={{
              order: 92,
              background: "#ffffff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <label
              className="mb-1.5 block text-xs font-semibold tracking-wider uppercase"
              style={{ color: "#64748b" }}
            >
              Note About Your Changes (Optional)
            </label>
            <textarea
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              rows={2}
              placeholder="Briefly describe what you changed and why"
              className="input-neu w-full resize-none"
            />
          </div>
        )}

        {/* Actions */}
        <div
          className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
          style={{ order: 99 }}
        >
          <button
            type="button"
            onClick={() => navigate("/")}
            className="btn-cancel"
          >
            <X size={16} />
            <span>Cancel</span>
          </button>
          <button type="submit" disabled={submitting} className="btn-submit">
            <div className="svg-wrapper">
              <Send size={16} />
            </div>
            <span>
              {submitting
                ? isEdit
                  ? "Saving…"
                  : "Submitting…"
                : isEdit
                  ? "Save Changes"
                  : "Submit"}
            </span>
          </button>
        </div>
      </form>
      <PolicyDrawer
        open={policyOpen}
        onClose={() => setPolicyOpen(false)}
        title="Travel Policy"
      >
        <TravelPolicyContent />
      </PolicyDrawer>
    </AppLayout>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({
  title,
  children,
  style: extraStyle,
}: {
  title: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      className="rounded-xl p-4 sm:p-5"
      style={{
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
        ...extraStyle,
      }}
    >
      <h2
        className="mb-4 text-sm font-semibold tracking-widest uppercase"
        style={{ color: "#1d2a5d" }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        className="mb-1 block text-xs font-semibold tracking-wider uppercase"
        style={{ color: "#64748b" }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function TripRow({
  trip,
  index,
  onChange,
  onRouteChange,
  onRemove,
  quickFills,
  showAddHome,
  homeAddress,
  school,
  showWorkingDayToggle,
}: {
  trip: MileageTrip
  index: number
  onChange: <K extends keyof MileageTrip>(
    i: number,
    field: K,
    value: MileageTrip[K]
  ) => void
  onRouteChange: (update: (r: TripRoute) => TripRoute) => void
  onRemove?: () => void
  quickFills: QuickFill[]
  showAddHome: boolean
  homeAddress: string
  school?: { address: string; label: string }
  showWorkingDayToggle: boolean
}) {
  const route = trip.route ?? emptyRoute()
  const tripMiles = routeMiles(route)

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="mb-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Field label="Date">
          <DatePicker
            value={trip.date}
            onChange={(v) => onChange(index, "date", v)}
            required
          />
        </Field>
        <Field label="Purpose">
          <input
            type="text"
            value={trip.purpose}
            required
            placeholder="Reason for travel"
            onChange={(e) => onChange(index, "purpose", e.target.value)}
            className="input-neu w-full"
          />
        </Field>
      </div>
      <RouteEditor
        route={route}
        onChange={onRouteChange}
        quickFills={quickFills}
        showAddHome={showAddHome}
        homeAddress={homeAddress}
        school={school}
      />
      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Tooltip
            text="Total miles for this trip across every leg."
            className="text-sm font-semibold"
            style={{
              color: "#1d2a5d",
              fontVariantNumeric: "tabular-nums",
              cursor: "help",
            }}
          >
            {tripMiles.toFixed(1)} mi
          </Tooltip>
          {showWorkingDayToggle && (
            <label
              className="flex cursor-pointer items-center gap-2 text-sm font-medium"
              style={{ color: "#334155" }}
            >
              <input
                type="checkbox"
                checked={trip.isWorkingDay !== false}
                onChange={(e) =>
                  onChange(index, "isWorkingDay", e.target.checked)
                }
                className="h-4 w-4 cursor-pointer accent-[#4356a9]"
              />
              <Tooltip
                text="Uncheck for non-working days (weekend PD, holiday travel, etc.). When checked, your commute is deducted from this trip."
                className="tip-label"
              >
                Working day
              </Tooltip>
            </label>
          )}
        </div>
        {onRemove && (
          <Tooltip text="Remove this trip." focusable={false}>
            <button
              type="button"
              onClick={onRemove}
              className="cursor-pointer rounded-lg p-1.5 transition-colors duration-150"
              style={{ color: "#94a3b8" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "#ad2122")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "#94a3b8")
              }
            >
              <Trash2 size={15} />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
