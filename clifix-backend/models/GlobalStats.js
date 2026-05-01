const mongoose = require('mongoose');

const globalStatsSchema = new mongoose.Schema({
  totalTrees: { type: Number, default: 0 },
  totalUsers: { type: Number, default: 0 }
});

// Ensure only one document exists
globalStatsSchema.statics.getSingleton = async function () {
  let stats = await this.findOne();
  if (!stats) {
    stats = await this.create({ totalTrees: 0, totalUsers: 0 });
  }
  return stats;
};

module.exports = mongoose.model('GlobalStats', globalStatsSchema);