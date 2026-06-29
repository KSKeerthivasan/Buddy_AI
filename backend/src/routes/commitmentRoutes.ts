import { Router } from 'express';
import { getCommitments, createCommitment, updateCommitment, deleteCommitment } from '../controllers/commitmentController';

const router = Router();

router.get('/:userId', getCommitments);
router.post('/:userId', createCommitment);
router.put('/:userId/:commitmentId', updateCommitment);
router.delete('/:userId/:commitmentId', deleteCommitment);

export default router;
