import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';

// @desc    Get paginated, searchable, filterable list of orders
// @route   GET /api/orders
// @access  Private
export const getOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status,
    customerId,
    sortBy = 'orderDate',
    sortOrder = 'desc',
  } = req.query;

  const query = {};
  if (status) query.status = status;
  if (customerId) query.customer = customerId;

  const pageNum = Math.max(parseInt(page, 10), 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10), 1), 100);
  const skip = (pageNum - 1) * limitNum;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  let pipeline = [
    { $match: query },
    {
      $lookup: {
        from: 'customers',
        localField: 'customer',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: '$customer' },
  ];

  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { 'customer.name': { $regex: search, $options: 'i' } },
          { 'customer.email': { $regex: search, $options: 'i' } },
        ],
      },
    });
  }

  const countPipeline = [...pipeline, { $count: 'total' }];
  pipeline.push({ $sort: sort }, { $skip: skip }, { $limit: limitNum });

  const [orders, countResult] = await Promise.all([
    Order.aggregate(pipeline),
    Order.aggregate(countPipeline),
  ]);

  const total = countResult[0]?.total || 0;

  res.json({
    success: true,
    data: orders,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('customer', 'name email phone location');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  res.json({ success: true, data: order });
});

// @desc    Create an order and update the related customer's aggregates
// @route   POST /api/orders
// @access  Private
export const createOrder = asyncHandler(async (req, res) => {
  const { customer: customerId, items, amount, status = 'completed', orderDate } = req.body;

  const customer = await Customer.findById(customerId);
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }

  const order = await Order.create({
    customer: customerId,
    items,
    amount,
    status,
    orderDate: orderDate || Date.now(),
  });

  if (status === 'completed') {
    customer.totalSpend += amount;
    customer.totalOrders += 1;
    customer.lastPurchaseDate = order.orderDate;
    await customer.save();
  }

  res.status(201).json({ success: true, data: order });
});

// @desc    Update order status
// @route   PUT /api/orders/:id
// @access  Private
export const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  res.json({ success: true, data: order });
});

// @desc    Delete an order
// @route   DELETE /api/orders/:id
// @access  Private
export const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  res.json({ success: true, message: 'Order deleted' });
});

// @desc    Order summary stats
// @route   GET /api/orders/meta/summary
// @access  Private
export const getOrderSummary = asyncHandler(async (req, res) => {
  const [summary] = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$amount' },
        avgOrderValue: { $avg: '$amount' },
      },
    },
  ]);

  res.json({
    success: true,
    data: summary || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 },
  });
});

export const ObjectId = mongoose.Types.ObjectId;
