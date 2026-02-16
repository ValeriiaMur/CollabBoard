import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK singleton.
 * Used server-side for Firestore queries and NextAuth adapter.
 *
 * Requires a service account JSON key via FIREBASE_SERVICE_ACCOUNT_KEY env var
 * (stringified JSON), or individual env vars for project config.
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

  // Option 2: Individual env vars (simpler for dev)
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      // Replace escaped newlines in the private key
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
}

const app = getFirebaseAdmin();
export const db: Firestore = getFirestore(app);
export { app };
