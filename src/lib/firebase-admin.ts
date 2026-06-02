import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Attempt to initialize using default credentials (e.g. env vars or gcloud auth)
    // If you have a specific service account key JSON, you would load it here.
    // For now, we rely on GOOGLE_APPLICATION_CREDENTIALS or Firebase project ID if passed.
    
    // In many Next.js setups, you'd pass a service account string in env vars,
    // e.g., JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)
    
    // As a fallback for local testing, if it fails, it might throw if no credentials are set,
    // but typically you configure env vars on Vercel.
    admin.initializeApp();
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const auth = admin.auth();
export const messaging = admin.messaging();

export async function verifyFirebaseToken(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing or invalid token format');
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw new Error('Unauthorized: Invalid token');
  }
}
