const Poll = require('../models/Poll');
const Vote = require('../models/Vote');
const Response = require('../models/Response');
const { generateSlug } = require('../utils/generateSlug');
const { raw } = require('express');

// works well
exports.createPoll = async (req, res) => {
  const { title, options } = req.body;
  const slug = generateSlug();

  try {
    const newPoll = await Poll.create({
      title,
      options,
      slug,
      owner: req.user.id,
    });

    res.status(201).json(newPoll);
  } catch (error) {
    res.status(500).json({ error: error.message || error });
  }
};

// update poll
exports.updatePoll = async (req, res) => {
  const { id } = req.params;
  const { title, options } = req.body;

  try {
    const updatedPoll = await Poll.findByIdAndUpdate(
      id,
      { title, options },
      { new: true, runValidators: true }
    );

    if (!updatedPoll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    res.json(updatedPoll);
  } catch (error) {
    res.status(500).json({ error: error.message || error });
  }
};

// delete poll
exports.deletePoll = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedPoll = await Poll.findByIdAndDelete(id);

    if (!deletedPoll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    res.json({ message: 'Poll deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message || error });
  }
};

// duplicate poll
exports.duplicatePoll = async (req, res) => {
  const { id } = req.params;

  try {
    const existingPoll = await Poll.findById(id);

    if (!existingPoll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const duplicatedPoll = await Poll.create({
      title: existingPoll.title + ' (Copy)',
      options: existingPoll.options,
      slug: generateSlug(),
      owner: req.user.id,
    });

    res.status(201).json(duplicatedPoll);
  } catch (error) {
    res.status(500).json({ error: error.message || error });
  }
};


// get all polls
exports.getMyPolls = async (req, res) => {
  try {
    const polls = await Poll.find({ owner: req.user.id });

    const pollIds = polls.map(p => p._id);

    // Get vote count per poll & option (by text)
    const voteCounts = await Vote.aggregate([
      { $match: { poll: { $in: pollIds } } },
      {
        $group: {
          _id: { poll: '$poll', option: '$option' }, // option is text
          count: { $sum: 1 }
        }
      }
    ]);

    // Build a map: { pollId: { optionText: count } }
    const voteMap = {};
    voteCounts.forEach(({ _id, count }) => {
      const pollId = _id.poll.toString();
      const optionText = _id.option;

      if (!voteMap[pollId]) voteMap[pollId] = {};
      voteMap[pollId][optionText] = count;
    });

    // Enrich each poll
    const enrichedPolls = polls.map(poll => {
      const pollObj = poll.toObject();
      const pollId = poll._id.toString();
      const rawOptions = poll.options[0]?.options || [];

      const optionVotes = voteMap[pollId] || {};

      // New 'voted' field: [{ text, votes }]
      const voted = rawOptions.map(text => ({
        text,
        votes: optionVotes[text] || 0
      }));

      // Total responses = sum of all option votes
      const responseCount = voted.reduce((sum, o) => sum + o.votes, 0);

      return {
        ...pollObj,
        voted,           // ← add vote counts without modifying raw options
        responseCount
      };
    });

    res.json(enrichedPolls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user polls' });
  }
};




// get poll by slug
exports.getPollBySlug = async (req, res) => {
  const { slug } = req.params;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userId = req.user?.id || null;

  try {
    const poll = await Poll.findOne({ slug });
    if (!poll || !poll.public) {
      return res.status(404).json({ error: 'Poll not found or is private' });
    }

    const hasVoted = await Vote.exists({
      poll: poll._id,
      $or: [{ user: userId || null }, { ip }]
    });

    const rawOptions = poll.options[0]?.options || [];

 // Get vote count per poll & option (by option text)
const voteCounts = await Vote.aggregate([
  { $match: { poll: poll._id } },
  { $group: { _id: '$option', count: { $sum: 1 } } } // group by text
]);

// Build count map using text as key
const countMap = {};
voteCounts.forEach(vc => {
  countMap[vc._id] = vc.count;
});

// Then map options with votes
const voted = rawOptions.map(text => ({
  text,
  votes: countMap[text] || 0
}));


    res.json({
      ...poll.toObject(),
      voted,
      hasVoted: !!hasVoted
    });
  } catch (error) {
    res.status(500).json({ error: error.message || error });
  }
};



// create vote

exports.createVote = async (req, res) => {
  const { pollId, option } = req.body;
  const ip =
    req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userId = req.user?.id || null;

  try {
    const alreadyVoted = await Vote.findOne({
      poll: pollId,
      $or: [
        { user: userId || null },
        { ip }
      ]
    });

    if (alreadyVoted) {
      return res.status(400).json({ error: 'You have already voted on this poll' });
    }

    const newVote = await Vote.create({
      poll: pollId,
      option,
      user: userId,
      ip
    });

    res.status(201).json({ message: 'Vote recorded successfully', vote: newVote });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record vote' });
  }
};


// exports.submitResponse = async (req, res) => {
//   const { pollId } = req.params;
//   const { answers } = req.body;

//   if (!Array.isArray(answers)) {
//     return res.status(400).json({ error: "Answers must be an array" });
//   }

//   try {
//     const poll = await Poll.findById(pollId);
//     if (!poll) return res.status(404).json({ error: 'Poll not found' });

//     // ✅ Validate question IDs
//     const validQuestionIds = poll.questions.map(q => q._id.toString());
//     for (let a of answers) {
//       if (!validQuestionIds.includes(a.questionId)) {
//         return res.status(400).json({ error: "Invalid question ID in answers" });
//       }
//     }

//     // ✅ Optional: Authenticated user
//     const userId = req.user?.id || null;

//     // ✅ Prevent double submissions (only if user is logged in)
//     if (userId) {
//       const existing = await Response.findOne({ poll: pollId, user: userId });
//       if (existing) {
//         return res.status(400).json({ error: 'You have already submitted this poll' });
//       }
//     }

//     // ✅ Record response
//     await Response.create({ poll: pollId, user: userId, answers });

//     res.status(200).json({ message: 'Response recorded' });

//   } catch (err) {
//     if (err.code === 11000) {
//       return res.status(400).json({ error: 'You already submitted this poll' });
//     }
//     console.error(err);
//     res.status(500).json({ error: 'Failed to submit response' });
//   }
// };


// exports.getResponses = async (req, res) => {
//   try {
//     const poll = await Poll.findById(req.params.pollId);
//     if (!poll) return res.status(404).json({ error: 'Poll not found' });

//     if (poll.owner.toString() !== req.user.id)
//       return res.status(403).json({ error: 'Unauthorized' });

//     const responses = await Response.find({ poll: poll._id });
//     res.json(responses);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to get responses' });
//   }
// };

// exports.getQuestionAnalytics = async (req, res) => {
//   const { pollId, questionId } = req.params;

//   try {
//     const poll = await Poll.findById(pollId);
//     if (!poll) return res.status(404).json({ error: 'Poll not found' });

//     if (poll.owner.toString() !== req.user.id)
//       return res.status(403).json({ error: 'Unauthorized' });

//     const question = poll.questions.find(q => q._id.toString() === questionId);
//     if (!question) return res.status(400).json({ error: 'Invalid question ID' });

//     const responses = await Response.find({ poll: pollId });

//     const allAnswersToThisQuestion = responses
//       .map(r => r.answers.find(a => a.questionId.toString() === questionId))
//       .filter(Boolean);

//     const counts = {};
//     for (const a of allAnswersToThisQuestion) {
//       counts[a.answer] = (counts[a.answer] || 0) + 1;
//     }

//     res.json({
//       question: question.text,
//       options: question.options,
//       counts
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to fetch analytics' });
//   }
// };



