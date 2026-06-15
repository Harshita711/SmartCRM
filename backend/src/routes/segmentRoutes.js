import express from 'express';
import { body } from 'express-validator';
import {
  getSegments,
  getSegmentById,
  previewSegment,
  createSegment,
  updateSegment,
  deleteSegment,
  getSegmentCustomers,
} from '../controllers/segmentController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(protect);

router.post('/preview', [body('ruleGroup').isObject().withMessage('ruleGroup is required')], validate, previewSegment);

router
  .route('/')
  .get(getSegments)
  .post(
    [
      body('name').notEmpty().withMessage('Segment name is required'),
      body('ruleGroup').isObject().withMessage('ruleGroup is required'),
    ],
    validate,
    createSegment
  );

router.get('/:id/customers', getSegmentCustomers);
router.route('/:id').get(getSegmentById).put(updateSegment).delete(deleteSegment);

export default router;
