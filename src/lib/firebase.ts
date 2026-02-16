import { initializeApp, cert, getApps, applicationDefault, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK singleton.
 * Used server-side for Firestore queries and NextAuth adapter.
 *
 * Supports three auth methods (tried in order):
 *   1. FIREBASE_SERVICE_ACCOUNT_KEY — full JSON key (stringified)
 *   2. FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY — individual env vars
 *   3. Application Default Credentials (ADC) — uses `gcloud auth application-default login`
 */
function getFirebaseAdmin(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Option 1: Full service account JSON (recommended for production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    );
    return initializeApp({
      credential: cert(serviceAccount),
    });
  }

  // Option 2: Individual env vars
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return initializeApp({
      credential: cert({
        projectId: process.env.MY_FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    });
  }

  // Option 3: Application Default Credentials (ADC)
  // Works with `gcloud auth application-default login` — no key file needed
  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.MY_FIREBASE_PROJECT_ID,
  });
}

const app = getFirebaseAdmin();
export const db: Firestore = getFirestore(app);
export { app };
