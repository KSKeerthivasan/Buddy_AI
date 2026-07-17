import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Replace literal string "\n" with actual newlines for private key parsing
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'buddy-ai-007.appspot.com'; // Defaulting to derive from standard appspot domain

if (!getApps().length) {
  // If running from backend folder, process.cwd() is e:\ME\Buddy_AI\backend
  // The JSON is at e:\ME\Buddy_AI\buddy-ai-007-firebase-adminsdk.json
  const rootKeyPath = path.join(process.cwd(), '../buddy-ai-007-firebase-adminsdk.json');
  const backendKeyPath = path.join(process.cwd(), 'buddy-ai-007-firebase-adminsdk.json');

  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket
    });
  } else if (fs.existsSync(rootKeyPath)) {
    initializeApp({
      credential: cert(require(rootKeyPath)),
      storageBucket
    });
  } else if (fs.existsSync(backendKeyPath)) {
    initializeApp({
      credential: cert(require(backendKeyPath)),
      storageBucket
    });
  } else {
    // Fall back to Application Default Credentials if specific vars are not provided
    initializeApp({
      credential: applicationDefault(),
      storageBucket
    });
  }
}

export const db = getFirestore();
export const storage = getStorage();
