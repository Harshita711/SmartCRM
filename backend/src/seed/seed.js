import 'dotenv/config';
import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import logger from '../config/logger.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Segment from '../models/Segment.js';
import Campaign from '../models/Campaign.js';
import Communication from '../models/Communication.js';
import { buildSegmentQuery } from '../services/segmentEngine.js';

const CITIES = [
  { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'Delhi', state: 'Delhi' },
  { city: 'Bangalore', state: 'Karnataka' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Hyderabad', state: 'Telangana' },
  { city: 'Kolkata', state: 'West Bengal' },
  { city: 'Ahmedabad', state: 'Gujarat' },
  { city: 'Jaipur', state: 'Rajasthan' },
  { city: 'Kochi', state: 'Kerala' },
];

const CATEGORIES = ['Fashion', 'Coffee', 'Beauty', 'Retail'];

const PRODUCTS = {
  Fashion: [
    { name: 'Cotton Casual Shirt', price: 1299 },
    { name: 'Slim Fit Jeans', price: 1899 },
    { name: 'Printed Kurta', price: 1499 },
    { name: 'Running Sneakers', price: 2999 },
    { name: 'Leather Belt', price: 799 },
    { name: 'Summer Dress', price: 1799 },
    { name: 'Denim Jacket', price: 2499 },
  ],
  Coffee: [
    { name: 'Arabica Beans 250g', price: 449 },
    { name: 'Cold Brew Concentrate', price: 599 },
    { name: 'Espresso Capsules (Pack of 10)', price: 699 },
    { name: 'French Press 600ml', price: 1299 },
    { name: 'Filter Coffee Powder 500g', price: 399 },
    { name: 'Reusable Coffee Mug', price: 499 },
  ],
  Beauty: [
    { name: 'Vitamin C Face Serum', price: 899 },
    { name: 'Hydrating Face Wash', price: 449 },
    { name: 'Matte Lipstick', price: 599 },
    { name: 'Sunscreen SPF 50', price: 749 },
    { name: 'Herbal Hair Oil', price: 399 },
    { name: 'Compact Makeup Kit', price: 1599 },
  ],
  Retail: [
    { name: 'Wireless Earbuds', price: 2499 },
    { name: 'Ceramic Dinner Set', price: 1999 },
    { name: 'Yoga Mat', price: 999 },
    { name: 'Stainless Steel Bottle', price: 599 },
    { name: 'Desk Organizer', price: 799 },
    { name: 'LED Table Lamp', price: 1199 },
  ],
};

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const computeSegment = ({ totalSpend, totalOrders, lastPurchaseDate }) => {
  const daysSincePurchase = (Date.now() - new Date(lastPurchaseDate).getTime()) / (24 * 60 * 60 * 1000);

  if (totalOrders === 0) return 'New';
  if (daysSincePurchase > 120) return 'Churned';
  if (daysSincePurchase > 60) return 'Inactive';
  if (totalSpend > 25000 && totalOrders >= 5) return 'Premium';
  if (daysSincePurchase > 30 && totalSpend > 5000) return 'At Risk';
  if (totalOrders >= 5) return 'Loyal';
  return 'Active';
};

const computeLeadScore = ({ totalSpend, totalOrders, daysSincePurchase }) => {
  let score = 0;
  score += Math.min(totalSpend / 500, 40); // up to 40 pts for spend
  score += Math.min(totalOrders * 4, 30); // up to 30 pts for order frequency
  score += Math.max(30 - daysSincePurchase / 4, 0); // recency bonus, up to 30 pts
  return Math.round(Math.min(Math.max(score, 0), 100));
};

const seed = async () => {
  await connectDB();
  logger.info('Connected to database. Clearing existing data...');

  await Promise.all([
    Customer.deleteMany({}),
    Order.deleteMany({}),
    Segment.deleteMany({}),
    Campaign.deleteMany({}),
    Communication.deleteMany({}),
  ]);

  // --- Demo user ---------------------------------------------------------
  const existingUser = await User.findOne({ email: 'demo@smartcrm.com' });
  if (!existingUser) {
    await User.create({
      name: 'Demo Admin',
      email: 'demo@smartcrm.com',
      password: 'demo1234',
      role: 'admin',
      company: 'SmartCRM Demo Brand',
    });
    logger.info('Created demo user: demo@smartcrm.com / demo1234');
  }

  // --- Customers -----------------------------------------------------------
  const CUSTOMER_COUNT = 500;
  const customerDocs = [];

  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    const location = pick(CITIES);
    const category = pick(CATEGORIES);
    const createdAt = faker.date.between({ from: daysAgo(365), to: daysAgo(1) });

    customerDocs.push({
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      phone: `+91${randInt(7000000000, 9999999999)}`,
      location: { city: location.city, state: location.state, country: 'India' },
      category,
      totalSpend: 0,
      totalOrders: 0,
      segment: 'New',
      leadScore: 0,
      tags: [],
      createdAt,
      updatedAt: createdAt,
    });
  }

  // Ensure unique emails (faker can occasionally collide at this volume)
  const seenEmails = new Set();
  customerDocs.forEach((c, idx) => {
    while (seenEmails.has(c.email)) {
      c.email = `${idx}.${c.email}`;
    }
    seenEmails.add(c.email);
  });

  const customers = await Customer.insertMany(customerDocs);
  logger.info(`Inserted ${customers.length} customers`);

  // --- Orders ----------------------------------------------------------------
  const ORDER_COUNT = 1500;
  const orderDocs = [];

  // Weighted distribution: some customers are "power users" with many orders
  const customerOrderCounts = new Array(customers.length).fill(0);
  for (let i = 0; i < ORDER_COUNT; i++) {
    // 70% of orders go to top 30% of customers (power users)
    let customerIdx;
    if (Math.random() < 0.7) {
      customerIdx = randInt(0, Math.floor(customers.length * 0.3) - 1);
    } else {
      customerIdx = randInt(0, customers.length - 1);
    }
    customerOrderCounts[customerIdx] += 1;

    const customer = customers[customerIdx];
    const category = pick(CATEGORIES);
    const productPool = PRODUCTS[category];
    const itemCount = randInt(1, 3);
    const items = [];
    let amount = 0;

    for (let j = 0; j < itemCount; j++) {
      const product = pick(productPool);
      const quantity = randInt(1, 3);
      items.push({ productName: product.name, category, quantity, price: product.price });
      amount += product.price * quantity;
    }

    const orderDate = faker.date.between({ from: daysAgo(180), to: daysAgo(0) });
    const statusRoll = Math.random();
    const status = statusRoll < 0.88 ? 'completed' : statusRoll < 0.95 ? 'pending' : statusRoll < 0.98 ? 'cancelled' : 'refunded';

    orderDocs.push({
      customer: customer._id,
      items,
      amount,
      status,
      orderDate,
      createdAt: orderDate,
      updatedAt: orderDate,
    });
  }

  const orders = await Order.insertMany(orderDocs);
  logger.info(`Inserted ${orders.length} orders`);

  // --- Aggregate order data back onto customers ------------------------------
  const customerAggregates = new Map();
  orders.forEach((order) => {
    if (order.status !== 'completed') return;
    const key = order.customer.toString();
    const existing = customerAggregates.get(key) || { totalSpend: 0, totalOrders: 0, lastPurchaseDate: null };
    existing.totalSpend += order.amount;
    existing.totalOrders += 1;
    if (!existing.lastPurchaseDate || order.orderDate > existing.lastPurchaseDate) {
      existing.lastPurchaseDate = order.orderDate;
    }
    customerAggregates.set(key, existing);
  });

  const bulkOps = customers.map((customer) => {
    const agg = customerAggregates.get(customer._id.toString()) || { totalSpend: 0, totalOrders: 0, lastPurchaseDate: null };
    const lastPurchaseDate = agg.lastPurchaseDate || daysAgo(365);
    const daysSincePurchase = (Date.now() - lastPurchaseDate.getTime()) / (24 * 60 * 60 * 1000);

    const segment = computeSegment({ totalSpend: agg.totalSpend, totalOrders: agg.totalOrders, lastPurchaseDate });
    const leadScore = computeLeadScore({ totalSpend: agg.totalSpend, totalOrders: agg.totalOrders, daysSincePurchase });

    return {
      updateOne: {
        filter: { _id: customer._id },
        update: {
          $set: {
            totalSpend: Math.round(agg.totalSpend),
            totalOrders: agg.totalOrders,
            lastPurchaseDate: agg.totalOrders > 0 ? lastPurchaseDate : undefined,
            segment,
            leadScore,
          },
        },
      },
    };
  });

  await Customer.bulkWrite(bulkOps);
  logger.info('Updated customer aggregates (totalSpend, totalOrders, segment, leadScore)');

  const segmentCounts = await Customer.aggregate([{ $group: { _id: '$segment', count: { $sum: 1 } } }]);
  logger.info(`Segment distribution: ${JSON.stringify(Object.fromEntries(segmentCounts.map((s) => [s._id, s.count])))}`);

  // --- Audience Segments -------------------------------------------------
  // These are the saved "Segment" documents used by the Audience Segmentation
  // and Campaign Creation pages (the "Audience Segment" dropdown reads from
  // this collection). Without these, the campaign creation dropdown is empty.
  const demoUserForSegments = await User.findOne({ email: 'demo@smartcrm.com' });

  const segmentDefs = [
    {
      name: 'High-Value Inactive Customers',
      description: 'Customers who spent above ₹5000 and have not purchased in 45+ days',
      ruleGroup: {
        condition: 'AND',
        rules: [
          { field: 'totalSpend', operator: 'gt', value: 5000 },
          { field: 'lastPurchaseDate', operator: 'olderThanDays', value: 45 },
        ],
        groups: [],
      },
      source: 'manual',
    },
    {
      name: 'Loyal Chennai Customers',
      description: 'Customers from Chennai with 3 or more orders',
      ruleGroup: {
        condition: 'AND',
        rules: [
          { field: 'location.city', operator: 'eq', value: 'Chennai' },
          { field: 'totalOrders', operator: 'gte', value: 3 },
        ],
        groups: [],
      },
      source: 'manual',
    },
    {
      name: 'Premium Customers',
      description: 'All customers currently in the Premium segment',
      ruleGroup: {
        condition: 'AND',
        rules: [{ field: 'segment', operator: 'eq', value: 'Premium' }],
        groups: [],
      },
      source: 'manual',
    },
    {
      name: 'At Risk Customers',
      description: 'Customers flagged At Risk - target with retention offers',
      ruleGroup: {
        condition: 'AND',
        rules: [{ field: 'segment', operator: 'eq', value: 'At Risk' }],
        groups: [],
      },
      source: 'manual',
    },
    {
      name: 'Churned Customers',
      description: 'Customers who have not purchased in over 120 days',
      ruleGroup: {
        condition: 'AND',
        rules: [{ field: 'segment', operator: 'eq', value: 'Churned' }],
        groups: [],
      },
      source: 'manual',
    },
    {
      name: 'New Customers',
      description: 'Customers who have not placed an order yet',
      ruleGroup: {
        condition: 'AND',
        rules: [{ field: 'segment', operator: 'eq', value: 'New' }],
        groups: [],
      },
      source: 'manual',
    },
    {
      name: 'High Lead Score',
      description: 'Customers with an AI lead score of 70 or above',
      ruleGroup: {
        condition: 'AND',
        rules: [{ field: 'leadScore', operator: 'gte', value: 70 }],
        groups: [],
      },
      source: 'manual',
    },
  ];

  const segmentDocs = [];
  for (const def of segmentDefs) {
    const query = buildSegmentQuery(def.ruleGroup);
    const audienceSize = await Customer.countDocuments(query);
    segmentDocs.push({
      ...def,
      audienceSize,
      lastEvaluatedAt: new Date(),
      createdBy: demoUserForSegments?._id,
    });
  }

  await Segment.insertMany(segmentDocs);
  logger.info(`Inserted ${segmentDocs.length} audience segments`);

  logger.info('Seeding complete!');
  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  logger.error(`Seeding failed: ${err.message}`);
  process.exit(1);
});
