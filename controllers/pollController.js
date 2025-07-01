const Poll = require('../models/Poll');
const Response = require('../models/Response');
const { generateSlug } = require('../utils/generateSlug');

exports.createPoll = async (req, res) => {
  const { title, questions } = req.body;
  const slug = generateSlug();
  try {
    const newPoll = await Poll.create({ title, questions, slug, owner: req.user.id });
    res.status(201).json(newPoll);
  } catch (error) {
    res.status(500).json({ error: error });
  }
};

exports.submitResponse = async (req, res) => {
  const { pollId } = req.params;
  const { answers } = req.body;

  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: "Answers must be an array" });
  }

  try {
    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    // ✅ Validate question IDs
    const validQuestionIds = poll.questions.map(q => q._id.toString());
    for (let a of answers) {
      if (!validQuestionIds.includes(a.questionId)) {
        return res.status(400).json({ error: "Invalid question ID in answers" });
      }
    }

    // ✅ Optional: Authenticated user
    const userId = req.user?.id || null;

    // ✅ Prevent double submissions (only if user is logged in)
    if (userId) {
      const existing = await Response.findOne({ poll: pollId, user: userId });
      if (existing) {
        return res.status(400).json({ error: 'You have already submitted this poll' });
      }
    }

    // ✅ Record response
    await Response.create({ poll: pollId, user: userId, answers });

    res.status(200).json({ message: 'Response recorded' });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'You already submitted this poll' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to submit response' });
  }
};


exports.getPollBySlug = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    let alreadySubmitted = false;
    const poll = await Poll.findOne({ slug: req.params.slug });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (userId) {
      const existing = await Response.findOne({ poll: poll._id, user: userId });
      if (existing) {
        alreadySubmitted = true;
      }
    }
    res.json({ title: poll.title, questions: poll.questions, owner: poll.owner, pollId: poll._id,alreadySubmitted });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch poll' });
  }
};

exports.getResponses = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    if (poll.owner.toString() !== req.user.id)
      return res.status(403).json({ error: 'Unauthorized' });

    const responses = await Response.find({ poll: poll._id });
    res.json(responses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get responses' });
  }
};

exports.getQuestionAnalytics = async (req, res) => {
  const { pollId, questionId } = req.params;

  try {
    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    if (poll.owner.toString() !== req.user.id)
      return res.status(403).json({ error: 'Unauthorized' });

    const question = poll.questions.find(q => q._id.toString() === questionId);
    if (!question) return res.status(400).json({ error: 'Invalid question ID' });

    const responses = await Response.find({ poll: pollId });

    const allAnswersToThisQuestion = responses
      .map(r => r.answers.find(a => a.questionId.toString() === questionId))
      .filter(Boolean);

    const counts = {};
    for (const a of allAnswersToThisQuestion) {
      counts[a.answer] = (counts[a.answer] || 0) + 1;
    }

    res.json({
      question: question.text,
      options: question.options,
      counts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

exports.getMyPolls = async (req, res) => {
  try {
    const polls = await Poll.find({ owner: req.user.id });
    res.json(polls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user polls' });
  }
};

