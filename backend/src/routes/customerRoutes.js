import express from 'express';
import { body } from 'express-validator';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerFilterMeta,
} from '../controllers/customerController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(protect);

router.get('/meta/filters', getCustomerFilterMeta);

router
  .route('/')
  .get(getCustomers)
  .post(
    [
      body('name').notEmpty().withMessage('Name is required'),
      body('email').isEmail().withMessage('Valid email is required'),
      body('phone').notEmpty().withMessage('Phone is required'),
      body('location.city').notEmpty().withMessage('City is required'),
    ],
    validate,
    createCustomer
  );

router.route('/:id').get(getCustomerById).put(updateCustomer).delete(deleteCustomer);

export default router;
