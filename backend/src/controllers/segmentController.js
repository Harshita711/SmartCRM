import asyncHandler from 'express-async-handler';
import Segment from '../models/Segment.js';
import Customer from '../models/Customer.js';
import { buildSegmentQuery, validateRuleGroup } from '../services/segmentEngine.js';

// @desc    List all segments
// @route   GET /api/segments
// @access  Private
export const getSegments = asyncHandler(async (req, res) => {
  const segments = await Segment.find().sort({ createdAt: -1 });
  res.json({ success: true, data: segments });
});

// @desc    Get single segment
// @route   GET /api/segments/:id
// @access  Private
export const getSegmentById = asyncHandler(async (req, res) => {
  const segment = await Segment.findById(req.params.id);
  if (!segment) {
    res.status(404);
    throw new Error('Segment not found');
  }
  res.json({ success: true, data: segment });
});

// @desc    Preview audience size for a given rule group (without saving)
// @route   POST /api/segments/preview
// @access  Private
export const previewSegment = asyncHandler(async (req, res) => {
  const { ruleGroup } = req.body;

  validateRuleGroup(ruleGroup);
  const query = buildSegmentQuery(ruleGroup);
  const count = await Customer.countDocuments(query);

  // Sample of matching customers for preview
  const sample = await Customer.find(query).limit(5).select('name email segment totalSpend totalOrders location category');

  res.json({ success: true, data: { audienceSize: count, query, sample } });
});

// @desc    Create a new segment
// @route   POST /api/segments
// @access  Private
export const createSegment = asyncHandler(async (req, res) => {
  const { name, description, ruleGroup, source, naturalLanguageQuery } = req.body;

  validateRuleGroup(ruleGroup);
  const query = buildSegmentQuery(ruleGroup);
  const audienceSize = await Customer.countDocuments(query);

  const segment = await Segment.create({
    name,
    description,
    ruleGroup,
    source: source || 'manual',
    naturalLanguageQuery: naturalLanguageQuery || '',
    audienceSize,
    lastEvaluatedAt: new Date(),
    createdBy: req.user?._id,
  });

  res.status(201).json({ success: true, data: segment });
});

// @desc    Update a segment
// @route   PUT /api/segments/:id
// @access  Private
export const updateSegment = asyncHandler(async (req, res) => {
  const { name, description, ruleGroup } = req.body;

  const segment = await Segment.findById(req.params.id);
  if (!segment) {
    res.status(404);
    throw new Error('Segment not found');
  }

  if (ruleGroup) {
    validateRuleGroup(ruleGroup);
    const query = buildSegmentQuery(ruleGroup);
    segment.audienceSize = await Customer.countDocuments(query);
    segment.ruleGroup = ruleGroup;
    segment.lastEvaluatedAt = new Date();
  }

  if (name) segment.name = name;
  if (description !== undefined) segment.description = description;

  await segment.save();
  res.json({ success: true, data: segment });
});

// @desc    Delete a segment
// @route   DELETE /api/segments/:id
// @access  Private
export const deleteSegment = asyncHandler(async (req, res) => {
  const segment = await Segment.findByIdAndDelete(req.params.id);
  if (!segment) {
    res.status(404);
    throw new Error('Segment not found');
  }
  res.json({ success: true, message: 'Segment deleted' });
});

// @desc    Get the list of customers matching a segment
// @route   GET /api/segments/:id/customers
// @access  Private
export const getSegmentCustomers = asyncHandler(async (req, res) => {
  const segment = await Segment.findById(req.params.id);
  if (!segment) {
    res.status(404);
    throw new Error('Segment not found');
  }

  const query = buildSegmentQuery(segment.ruleGroup);
  const { page = 1, limit = 10 } = req.query;
  const pageNum = Math.max(parseInt(page, 10), 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10), 1), 100);

  const [customers, total] = await Promise.all([
    Customer.find(query)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Customer.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: customers,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  });
});
