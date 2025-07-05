// models/Vote.js
const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  poll: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll' },
  option: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  ip: String,
  votedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vote', voteSchema);