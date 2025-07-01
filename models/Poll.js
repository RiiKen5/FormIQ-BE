const mongoose = require('mongoose');
const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [String]
}, { _id: true });

const pollSchema = new mongoose.Schema({
  title: String,
  questions: {type:[questionSchema],required: true},
  slug: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});
module.exports = mongoose.model('Poll', pollSchema);