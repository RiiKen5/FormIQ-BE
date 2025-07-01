const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  answer: String
});

const responseSchema = new mongoose.Schema({
  poll: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // ✅ track who answered
  answers: [answerSchema],
  submittedAt: { type: Date, default: Date.now },
});

responseSchema.index({ poll: 1, user: 1 }, { unique: true }); // ✅ Prevent multiple per user per poll

module.exports = mongoose.model('Response', responseSchema);
