const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getUserProfile,
  addEcoAction,
  getUserStats
} = require('../controllers/userController');

const router = express.Router();

router.route('/profile').get(protect, getUserProfile);
router.route('/action').post(protect, addEcoAction);
router.route('/stats').get(protect, getUserStats);

module.exports = router;