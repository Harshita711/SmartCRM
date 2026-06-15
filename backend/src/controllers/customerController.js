import asyncHandler from 'express-async-handler';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';

// @desc    Get paginated, searchable, filterable list of customers
// @route   GET /api/customers
// @access  Private
export const getCustomers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    segment,
    category,
    city,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  if (segment) query.segment = segment;
  if (category) query.category = category;
  if (city) query['location.city'] = city;

  const pageNum = Math.max(parseInt(page, 10), 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10), 1), 100);
  const skip = (pageNum - 1) * limitNum;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [customers, total] = await Promise.all([
    Customer.find(query).sort(sort).skip(skip).limit(limitNum),
    Customer.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: customers,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Get single customer with order history
// @route   GET /api/customers/:id
// @access  Private
export const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }

  const orders = await Order.find({ customer: customer._id }).sort({ orderDate: -1 });

  res.json({ success: true, data: { customer, orders } });
});

// @desc    Create a customer
// @route   POST /api/customers
// @access  Private
export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.create(req.body);
  res.status(201).json({ success: true, data: customer });
});

// @desc    Update a customer
// @route   PUT /api/customers/:id
// @access  Private
export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }

  res.json({ success: true, data: customer });
});

// @desc    Delete a customer
// @route   DELETE /api/customers/:id
// @access  Private
export const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }
  res.json({ success: true, message: 'Customer deleted' });
});

// @desc    Get distinct cities and categories (for filter dropdowns)
// @route   GET /api/customers/meta/filters
// @access  Private
export const getCustomerFilterMeta = asyncHandler(async (req, res) => {
  const [cities, categories, segments] = await Promise.all([
    Customer.distinct('location.city'),
    Customer.distinct('category'),
    Customer.distinct('segment'),
  ]);

  res.json({ success: true, data: { cities, categories, segments } });
});
