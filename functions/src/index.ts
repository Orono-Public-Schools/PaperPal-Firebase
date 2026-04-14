import { setGlobalOptions } from "firebase-functions/v2"
import { initializeApp } from "firebase-admin/app"

setGlobalOptions({ region: "us-central1" })
initializeApp()

// Function exports are added in later phases (Phase 5+).
export {}
