# Travel and Related Expenses — district policy reference

Source: Orono Public Schools ISD No. 278 **Business Services Procedures Manual**, edition
"Incorporating Updates Through June 30, 2026" (file dated 2026-09-30), section "District Credit
Card (P-Card) Procedures › Travel and Related Expenses", pages 27–29. Supersedes the May 1, 2021
edition. Transcribed 2026-10-13. When the manual changes, replace this file; the in-app policy
drawer (`src/components/forms/PolicyDrawer.tsx`) should match it.

This regulation provides guidelines for District employees and School Board members traveling at
District expense for work-related events not involving the supervision of students.

**Definitions.** Travel and related expenses include the cost of transportation (public carrier,
private automobile, District-owned vehicles), meals, lodging, and necessary incidental expenses
incurred while attending or traveling to and from conferences, seminars, and workshops, or while
engaged in other travel in accordance with District policy.

## Mileage Reimbursement

Employees and Board members traveling in their personal vehicle on District business may request
reimbursement based on the IRS standard business mileage rate in effect on the date of travel. The
mileage reimbursement form must be completed and signed by the employee, authorized by the
appropriate administrator, and submitted to Accounts Payable. The District reimburses mileage in
accordance with IRS Publication 463.

- Mileage is reimbursable for travel to and from a temporary work location (e.g., a meeting,
  training, or conference). For each one-way trip, reimbursable mileage is the actual miles driven
  between the employee's point of departure (residence or primary work site) and the temporary
  work location, **not to exceed** the distance between the employee's primary work site and the
  temporary work location. The employee must identify the point of departure and return on the
  mileage form. Travel between temporary work locations on the same day is reimbursable at actual
  miles.
- Travel is **not** reimbursable from the employee's home to the regular place of work, even if
  travel occurs multiple times daily or outside regular work hours. Personal side trips are not
  reimbursable.
- Definitions: "Primary work site" is the District building to which the employee is regularly
  assigned. A "temporary work location" is a location, other than a regular work site, at which
  District business is realistically expected to be conducted for one year or less.
- Mileage reimbursement requests must be submitted within 60 days after the travel event. In
  extraordinary circumstances, the Business Services department may allow an exception.

How PaperPal maps this: a mileage trip is a **point of departure** (home or primary work site),
zero or more **temporary work locations** (stops, actual miles between them), and a **return
destination**. Legs that begin or end at home are capped at the primary-work-site distance (see
`schoolBasedLeg` in `src/lib/commute.ts`).

## Expense Reimbursement

Employees and Board members may request reimbursement for expenses incurred while attending or
traveling to and from work-related events, or while engaged in other travel in accordance with
District policy.

- Expense reimbursements must be submitted on an Employee Check Request Form with original,
  itemized receipts. Credit card statements do not serve as sufficient documentation, as they do
  not provide the itemized detail required for review.
- Reimbursement requests must be submitted within 60 days after expenses were paid or incurred.
  Except in extraordinary circumstances, requests after 60 days will be treated as taxable income
  per IRS guidelines.

## Regional and Out-of-State Travel

Regional and state travel may be permitted, with supervisor approval, under the following
conditions: the purpose fits District and/or school goals and/or curriculum; there is sufficient
budget balance to cover the expenses; consideration is given to the number of employees from the
same school/department/district planning to attend; and, if the travel involves at least one
overnight stay outside the District, the request is submitted in writing to the supervisor.

The administrator approving attendance and travel is responsible for determining the
reasonableness and necessity of the expense within District policy and may disallow unreasonable
or unnecessary expenses.

## Airline Travel

Airline tickets should be booked online or by the least expensive method, preferably using a
District P-Card. The District provides for coach/tourist class only. In accordance with state law,
frequent flyer miles and other travel credit resulting from District-paid airfare accrue to the
District and may not be used for personal travel. If the airline will not honor a transfer or
assignment, the employee must report receipt of the credit or benefit to the District within 90
days.

## Accommodations

Individuals are expected to select accommodations, when they have an option, at the most
reasonable rate, balancing cost with comfort, safety, and convenience. When traveling with a
non-employee, the District reimburses the employee's expenses only. The District reimburses
overnight accommodations in the seven-county Twin Cities metropolitan area only if the employee or
Board member is working at the conference. Original, itemized receipts are required.

## Meals Reimbursement

The District will not use funds sourced from federal grants or awards for meal reimbursements.
Reimbursement will be based on actual expenditures up to the **GSA per-diem limit** for the
specific location of travel, with original, itemized receipts. The District will not reimburse the
cost of alcoholic beverages. The District will reimburse the cost of banquets or special functions
related to an individual's responsibility or participated in by the general conference audience;
these additional expenses must be documented.

(The 2021 edition's flat caps of $60/day and $12 / $18 / $30 per meal are gone; the GSA per-diem
table for the travel location replaces them.)

## Other Costs

The District reimburses registration fees for conferences, workshops, or seminars. The District
will not reimburse entertainment or recreation costs. Relevant printed and audio publications may
be purchased with supervisor approval. Reasonable baggage handling will be reimbursed when
necessary. Individuals are expected to use conference transportation (e.g., shuttle buses) when
available and to select transportation at the most reasonable rate. Rental cars require prior
approval by the Superintendent or designee (or, for Board members, the Board chairperson).
Personal or family telephone calls are not reimbursed; for District-related calls, the party called
must be noted on the receipt. Exceptions to allowed travel expenses must be approved by the
Superintendent or designee for employees and by the Board chairperson for Board members.

## Multiple District Staff

When travel involves more than one employee, each must separately account for individual expenses.
Employee Check Requests should not contain expenses for more than one employee; each employee must
pay for and submit their own expenses. P-Cards may be used only for the individual cardholder's
expenses and may not pay for co-worker expenses (such as airline tickets or meals).

## Related P-Card rules (same manual, pages 26–27)

P-Cards may be used for approved conference registrations and authorized travel, among other
listed categories, and may not be used to circumvent the normal purchasing or requisitioning
process. Credit card balances must be paid within sixty (60) days of the initial statement date.
