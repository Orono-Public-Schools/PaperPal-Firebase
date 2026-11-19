// Moves a person to the address Google now reports for their account, after a
// Workspace rename. Firebase keeps the old address on the account, and
// PaperPal matches people by email, so every stored copy moves together.
const { FieldValue } = require("firebase-admin/firestore")
const { HttpsError } = require("firebase-functions/v2/https")

const DISTRICT_DOMAIN = "@orono.k12.mn.us"
const BATCH_SIZE = 400

const lower = (s) => (s ?? "").trim().toLowerCase()

function googleEmail(authUser) {
  return lower(
    authUser.providerData.find((p) => p.providerId === "google.com")?.email
  )
}

async function findEmailChanges(db, auth) {
  const changes = []
  let pageToken
  do {
    const page = await auth.listUsers(1000, pageToken)
    const signedIn = page.users.filter((u) => googleEmail(u))
    const profiles = signedIn.length
      ? await db.getAll(...signedIn.map((u) => db.doc(`users/${u.uid}`)))
      : []
    signedIn.forEach((user, i) => {
      const profile = profiles[i].data()
      const newEmail = googleEmail(user)
      if (profile && lower(profile.email) !== newEmail) {
        changes.push({
          uid: user.uid,
          name: profile.fullName || profile.email,
          oldEmail: lower(profile.email),
          newEmail,
        })
      }
    })
    pageToken = page.pageToken
  } while (pageToken)
  return changes
}

function replaceInMappings(list, oldEmail, newEmail, newName) {
  let changed = 0
  const next = (list ?? []).map((m) => {
    const patch = {}
    if (lower(m.supervisorEmail) === oldEmail)
      Object.assign(patch, {
        supervisorEmail: newEmail,
        supervisorName: newName,
      })
    if (lower(m.approverEmail) === oldEmail)
      Object.assign(patch, { approverEmail: newEmail, approverName: newName })
    if (Object.keys(patch).length) changed++
    return { ...m, ...patch }
  })
  return { next, changed }
}

// Profile goes last, so a run that fails partway still shows as pending and
// can simply be run again
async function changeUserEmail(db, auth, uid, changedBy) {
  const authUser = await auth.getUser(uid)
  const profileRef = db.doc(`users/${uid}`)
  const profile = (await profileRef.get()).data()
  if (!profile)
    throw new HttpsError("not-found", "This account has no PaperPal profile.")

  const oldEmail = lower(profile.email)
  const newEmail = googleEmail(authUser)
  if (!newEmail || newEmail === oldEmail)
    throw new HttpsError(
      "failed-precondition",
      "Google reports no new address for this account. They need to sign in to PaperPal with the new address first."
    )

  const allowed =
    newEmail.endsWith(DISTRICT_DOMAIN) ||
    (await db.doc(`allowedExternalEmails/${newEmail}`).get()).exists
  if (!allowed)
    throw new HttpsError(
      "failed-precondition",
      `${newEmail} is not a district address.`
    )

  const holder = await auth.getUserByEmail(newEmail).catch((err) => {
    if (err.code === "auth/user-not-found") return null
    throw err
  })
  const clash = await db
    .collection("users")
    .where("email", "==", newEmail)
    .get()
  if ((holder && holder.uid !== uid) || clash.docs.some((d) => d.id !== uid))
    throw new HttpsError(
      "already-exists",
      `${newEmail} already belongs to another PaperPal account. Remove that account first.`
    )

  const staff = (await db.doc(`staff/${newEmail}`).get()).data()
  const firstName = staff?.firstName ?? profile.firstName
  const lastName = staff?.lastName ?? profile.lastName
  const fullName = staff
    ? `${staff.firstName} ${staff.lastName}`.trim()
    : profile.fullName

  await auth.updateUser(uid, {
    email: newEmail,
    emailVerified: true,
    ...(fullName ? { displayName: fullName } : {}),
  })

  // Only email fields change: a status or activity log change would make the
  // status trigger send notifications
  const writes = new Map()
  const patch = (ref, data) =>
    writes.set(ref.path, {
      ref,
      data: { ...(writes.get(ref.path)?.data ?? {}), ...data },
    })

  for (const field of ["submitterEmail", "supervisorEmail", "approverEmail"]) {
    const snap = await db
      .collection("submissions")
      .where(field, "==", oldEmail)
      .get()
    snap.docs.forEach((d) => patch(d.ref, { [field]: newEmail }))
  }
  const submissions = writes.size

  const supervised = await db
    .collection("users")
    .where("supervisorEmail", "==", oldEmail)
    .get()
  supervised.docs.forEach((d) => patch(d.ref, { supervisorEmail: newEmail }))

  const buildings = await db
    .collection("buildings")
    .where("approverEmail", "==", oldEmail)
    .get()
  buildings.docs.forEach((d) =>
    patch(d.ref, { approverEmail: newEmail, approverName: fullName })
  )

  const settingsRef = db.doc("settings/app")
  const settings = (await settingsRef.get()).data() ?? {}
  const settingsChanged = []
  if (lower(settings.finalApproverEmail) === oldEmail) {
    patch(settingsRef, {
      finalApproverEmail: newEmail,
      finalApproverName: fullName,
    })
    settingsChanged.push("Final approver")
  }
  if (lower(settings.replyToEmail) === oldEmail) {
    patch(settingsRef, { replyToEmail: newEmail })
    settingsChanged.push("Reply-to address")
  }
  const warnings =
    lower(settings.senderEmail) === oldEmail
      ? [
          "PaperPal sends mail as the old address. Change the sender in Email Settings yourself, since it is tied to the mail account.",
        ]
      : []

  const mappingsRef = db.doc("settings/supervisorMappings")
  const mappingsDoc = (await mappingsRef.get()).data()
  let mappings = 0
  if (mappingsDoc) {
    const titles = replaceInMappings(
      mappingsDoc.mappings,
      oldEmail,
      newEmail,
      fullName
    )
    const byBuilding = replaceInMappings(
      mappingsDoc.buildingMappings,
      oldEmail,
      newEmail,
      fullName
    )
    mappings = titles.changed + byBuilding.changed
    if (mappings)
      patch(mappingsRef, {
        mappings: titles.next,
        buildingMappings: byBuilding.next,
      })
  }

  const all = [...writes.values()]
  for (let i = 0; i < all.length; i += BATCH_SIZE) {
    const batch = db.batch()
    all
      .slice(i, i + BATCH_SIZE)
      .forEach(({ ref, data }) => batch.update(ref, data))
    await batch.commit()
  }

  await profileRef.update({
    email: newEmail,
    firstName,
    lastName,
    fullName,
    updatedAt: FieldValue.serverTimestamp(),
  })

  const summary = {
    oldEmail,
    newEmail,
    fullName,
    submissions,
    supervisedUsers: supervised.size,
    buildings: buildings.size,
    mappings,
    settings: settingsChanged,
    warnings,
  }
  await db.collection("auditLog").add({
    action: "email_changed",
    uid,
    changedBy,
    ...summary,
    at: FieldValue.serverTimestamp(),
  })
  return summary
}

module.exports = { findEmailChanges, changeUserEmail }
