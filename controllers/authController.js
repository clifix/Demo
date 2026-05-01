const User = require('../models/User');
const GlobalStats = require('../models/GlobalStats');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400);
      throw new Error('Please provide all fields');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Create the user
    const user = await User.create({ username, email, password });

    // Update Global Stats (The tree for the new user)
    const globalStats = await GlobalStats.getSingleton();
    globalStats.totalTrees += 1;
    globalStats.totalUsers += 1;
    await globalStats.save();

    // Give the user their first tree credit
    user.treesPlanted += 1;
    await user.save();

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      ecoPoints: user.ecoPoints,
      treesPlanted: user.treesPlanted,
      streak: user.streak,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error); // Pass error to Express error handler
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        ecoPoints: user.ecoPoints,
        treesPlanted: user.treesPlanted,
        streak: user.streak,
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { registerUser, loginUser };