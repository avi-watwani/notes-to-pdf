import * as admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (!adminApp) {
    if (admin.apps.length === 0) {
      const encodedKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();

      if (encodedKey) {
        const json = Buffer.from(encodedKey, 'base64').toString('utf8');
        let serviceAccount: admin.ServiceAccount;
        try {
          serviceAccount = JSON.parse(json) as admin.ServiceAccount;
        } catch {
          throw new Error(
            'FIREBASE_SERVICE_ACCOUNT_KEY must be base64-encoded service account JSON (decode failed or invalid JSON).'
          );
        }
        adminApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !privateKey) {
          throw new Error(
            'Firebase Admin credentials not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY (base64 of service account JSON) or individual FIREBASE_ADMIN_* env vars.'
          );
        }

        adminApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      }
    } else {
      adminApp = admin.apps[0] as admin.app.App;
    }
  }
  
  if (!adminApp) {
    throw new Error('Firebase Admin app not initialized');
  }
  
  return adminApp;
}

export function getAdminAuth(): admin.auth.Auth {
  return getFirebaseAdmin().auth();
}

export function getAdminFirestore(): admin.firestore.Firestore {
  return getFirebaseAdmin().firestore();
}
