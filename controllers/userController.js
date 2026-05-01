const User = require('../models/User');
const GlobalStats = require('../models/GlobalStats');

// Points mapping for each action type (same as frontend)
const ACTION_POINTS = {
  bike: 10,
  recycle: 5,
  vegetarian: 8,
  publicTransport: 7,
  reusable: 4,
  coldWash: 4,
  carpool: 6,
  solar: 9,
  plantTree: 20,
  shortShower: 5,
};

const ACTION_CO2 = {
  bike: 2.1,
  recycle: 1.0,
  vegetarian: 3.0,
  publicTransport: 1.5,
  reusable: 0.5,
  coldWash: 0.6,
  carpool: 1.2,
  solar: 1.8,
  plantTree: 5.0,
  shortShower: 0.3,
};

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Add an eco action
// @route   POST /api/user/action
// @access  Private
const addEcoAction = async (req, res, next) => {
  try {
    const { actionType } = req.body;

    if (!actionType || !ACTION_POINTS[actionType]) {
      res.status(400);
      throw new Error('Invalid or missing action type');
    }

    const user = await User.findById(req.user._id);
    const pointsEarned = ACTION_POINTS[actionType];
    const co2Saved = ACTION_CO2[actionType] || 0;

    // Update streak
    user.updateStreak();

    // Add action record
    user.actions.push({
      type: actionType,
      pointsEarned,
      co2Saved,
      date: new Date(),
    });

    // Update totals
    user.ecoPoints += pointsEarned;
    user.carbonSaved += co2Saved;

    // If action is planting a tree, increment trees counter
    if (actionType === 'plantTree') {
      user.treesPlanted += 1;
      const globalStats = await GlobalStats.getSingleton();
      globalStats.totalTrees += 1;
      await globalStats.save();
    }

    await user.save();

    res.json({
      message: 'Action logged successfully',
      ecoPoints: user.ecoPoints,
      streak: user.streak,
      carbonSaved: user.carbonSaved,
      treesPlanted: user.treesPlanted,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user stats (for dashboard)
// @route   GET /api/user/stats
// @access  Private
const getUserStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      'ecoPoints streak carbonSaved treesPlanted actions username email createdAt'
    );
    const globalStats = await GlobalStats.getSingleton();
    res.json({
      user,
      global: {
        totalTrees: globalStats.totalTrees,
        totalUsers: globalStats.totalUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUserProfile, addEcoAction, getUserStats };