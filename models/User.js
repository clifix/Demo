const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const actionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'bike', 'recycle', 'vegetarian', 'publicTransport',
      'reusable', 'coldWash', 'carpool', 'solar',
      'plantTree', 'shortShower'
    ]
  },
  date: { type: Date, default: Date.now },
  pointsEarned: { type: Number, required: true },
  co2Saved: { type: Number, default: 0 }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  ecoPoints: { type: Number, default: 0 },
  treesPlanted: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  lastActive: { type: Date },
  actions: [actionSchema],
  carbonSaved: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// ✅ Corrected pre-save hook (async without next)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update streak based on last active date
userSchema.methods.updateStreak = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!this.lastActive) {
    this.streak = 1;
  } else {
    const last = new Date(this.lastActive);
    last.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      this.streak += 1;
    } else if (diffDays > 1) {
      this.streak = 1;
    }
  }
  this.lastActive = new Date();
};

const User = mongoose.model('User', userSchema);
module.exports = User;