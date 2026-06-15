import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true },
    category: {
      type: String,
      enum: ['Fashion', 'Coffee', 'Beauty', 'Retail'],
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled', 'refunded'],
      default: 'completed',
      index: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

orderSchema.index({ customer: 1, orderDate: -1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
