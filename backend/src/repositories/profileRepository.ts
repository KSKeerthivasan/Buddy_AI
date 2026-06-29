import { db } from '../config/firebase';

const PROFILES_COLLECTION = 'userProfiles';

export const getProfile = async (userId: string) => {
  const doc = await db.collection(PROFILES_COLLECTION).doc(userId).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() };
};

export const saveProfile = async (userId: string, profileData: any) => {
  const docRef = db.collection(PROFILES_COLLECTION).doc(userId);
  // merge: true so we don't accidentally overwrite other fields in the future
  await docRef.set(profileData, { merge: true });
  return { id: userId, ...profileData };
};
