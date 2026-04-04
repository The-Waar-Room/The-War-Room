import * as admin from "firebase-admin";

let db: FirebaseFirestore.Firestore;

export function initFirebase(): void {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      // Uses Application Default Credentials on Cloud Run
      // or GOOGLE_APPLICATION_CREDENTIALS locally
    });
  }

  db = admin.firestore();
  console.log("[firebase] Initialized");
}

export function getFirestore(): FirebaseFirestore.Firestore {
  if (!db) throw new Error("Firestore not initialized — call initFirebase() first");
  return db;
}

export function getAuth(): admin.auth.Auth {
  return admin.auth();
}
