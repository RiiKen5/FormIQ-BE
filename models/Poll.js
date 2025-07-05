const mongoose = require('mongoose');
const optionSchema = new mongoose.Schema({
  options: [String]
}, { _id: true });


const pollSchema = new mongoose.Schema(
  {
    title: String,
    options: { type: [optionSchema], required: true },
    slug: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    public: { type: Boolean, default: true }
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model('Poll', pollSchema);