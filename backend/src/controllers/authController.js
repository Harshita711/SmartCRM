import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  company: user.company,
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, company } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(400);
    throw new Error('A user with this email already exists');
  }

  const user = await User.create({ name, email, password, company });
  const token = signToken(user._id);

  res.status(201).json({ success: true, token, user: sanitizeUser(user) });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const token = signToken(user._id);
  res.json({ success: true, token, user: sanitizeUser(user) });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
});

// @desc    Demo login - seeds/returns a demo account for quick evaluation
// @route   POST /api/auth/demo
// @access  Public
export const demoLogin = asyncHandler(async (req, res) => {
  const demoEmail = 'demo@smartcrm.com';
  let user = await User.findOne({ email: demoEmail });

  if (!user) {
    user = await User.create({
      name: 'Demo Admin',
      email: demoEmail,
      password: 'demo1234',
      role: 'admin',
      company: 'SmartCRM Demo Brand',
    });
  }

  const token = signToken(user._id);
  res.json({ success: true, token, user: sanitizeUser(user) });
});
