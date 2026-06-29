import { Request, Response } from 'express';
import { db } from '../config/firebase';

const PROFILES_COLLECTION = 'userProfiles';

export const getCommitments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const commitmentsRef = db.collection(PROFILES_COLLECTION).doc(userId).collection('weeklyCommitments');
    const snapshot = await commitmentsRef.get();
    
    const commitments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, commitments });
  } catch (error: any) {
    console.error('Error fetching commitments:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const createCommitment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const data = req.body;
    
    if (!userId || !data.title || !data.category || !data.dayOfWeek || !data.startTime || !data.endTime) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    if (data.startTime >= data.endTime) {
      res.status(400).json({ success: false, message: 'End time must be after start time' });
      return;
    }

    // Check for overlaps
    const commitmentsRef = db.collection(PROFILES_COLLECTION).doc(userId).collection('weeklyCommitments');
    const snapshot = await commitmentsRef.where('dayOfWeek', '==', data.dayOfWeek).get();
    const existing = snapshot.docs.map(doc => doc.data());
    
    const hasOverlap = existing.some(c => {
      // Logic for overlap: (StartA < EndB) && (EndA > StartB)
      return data.startTime < c.endTime && data.endTime > c.startTime;
    });

    if (hasOverlap) {
      res.status(409).json({ success: false, message: 'Commitment overlaps with an existing one.' });
      return;
    }

    const newCommitment = {
      ...data,
      ownerId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await commitmentsRef.add(newCommitment);
    res.status(201).json({ success: true, commitment: { id: docRef.id, ...newCommitment } });
  } catch (error: any) {
    console.error('Error creating commitment:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateCommitment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const commitmentId = req.params.commitmentId as string;
    const data = req.body;

    if (!userId || !commitmentId) {
      res.status(400).json({ success: false, message: 'Missing userId or commitmentId' });
      return;
    }

    const commitmentsRef = db.collection(PROFILES_COLLECTION).doc(userId).collection('weeklyCommitments');
    
    // Check for overlaps if time or day changed
    if (data.startTime || data.endTime || data.dayOfWeek) {
      const docRef = await commitmentsRef.doc(commitmentId).get();
      if (!docRef.exists) {
        res.status(404).json({ success: false, message: 'Commitment not found' });
        return;
      }
      
      const current = docRef.data() as any;
      const newStart = data.startTime || current.startTime;
      const newEnd = data.endTime || current.endTime;
      const newDay = data.dayOfWeek || current.dayOfWeek;

      if (newStart >= newEnd) {
        res.status(400).json({ success: false, message: 'End time must be after start time' });
        return;
      }

      const snapshot = await commitmentsRef.where('dayOfWeek', '==', newDay).get();
      const existing = snapshot.docs.filter(d => d.id !== commitmentId).map(d => d.data());
      
      const hasOverlap = existing.some(c => {
        return newStart < c.endTime && newEnd > c.startTime;
      });

      if (hasOverlap) {
        res.status(409).json({ success: false, message: 'Commitment overlaps with an existing one.' });
        return;
      }
    }

    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    await commitmentsRef.doc(commitmentId).update(updateData);
    const updatedDoc = await commitmentsRef.doc(commitmentId).get();
    
    res.json({ success: true, commitment: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error: any) {
    console.error('Error updating commitment:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const deleteCommitment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const commitmentId = req.params.commitmentId as string;
    if (!userId || !commitmentId) {
      res.status(400).json({ success: false, message: 'Missing userId or commitmentId' });
      return;
    }

    await db.collection(PROFILES_COLLECTION).doc(userId).collection('weeklyCommitments').doc(commitmentId).delete();
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting commitment:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
