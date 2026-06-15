import express from 'express';
import { body } from 'express-validator';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  getOrderSummary,
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(protect);

router.get('/meta/summary', getOrderSummary);

router
  .route('/')
  .get(getOrders)
  .post(
    [
      body('customer').isMongoId().withMessage('Valid customer id is required'),
      body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
      body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    ],
    validate,
    createOrder
  );

router.route('/:id').get(getOrderById).put(updateOrder).delete(deleteOrder);

export default router;
