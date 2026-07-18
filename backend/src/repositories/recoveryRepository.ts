import { db } from '../config/firebase';
import { RecoveryReport } from '../executionCore/recovery/recoveryTypes';

const RECOVERY_COLLECTION = 'recoveries';

export async function saveRecoveryReport(report: RecoveryReport): Promise<RecoveryReport> {
  const docRef = db.collection(RECOVERY_COLLECTION).doc();
  const reportWithId = { ...report, id: docRef.id };
  await docRef.set(reportWithId);
  return reportWithId;
}

export async function getRecoveryReport(reportId: string): Promise<RecoveryReport | null> {
  const doc = await db.collection(RECOVERY_COLLECTION).doc(reportId).get();
  if (!doc.exists) return null;
  return doc.data() as RecoveryReport;
}
