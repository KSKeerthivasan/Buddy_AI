import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Replace literal string "\n" with actual newlines for private key parsing
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

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
    });
  } else if (fs.existsSync(rootKeyPath)) {
    initializeApp({
      credential: cert(require(rootKeyPath))
    });
  } else if (fs.existsSync(backendKeyPath)) {
    initializeApp({
      credential: cert(require(backendKeyPath))
    });
  } else {
    // Fall back to Application Default Credentials if specific vars are not provided
    initializeApp({
      credential: applicationDefault(),
    });
  }
}

export const db = getFirestore();
