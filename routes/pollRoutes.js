const express = require('express');
const router = express.Router();
const { 
  createPoll, 
  getPollBySlug, 
  getMyPolls, 
  createVote, 
  updatePoll, 
  deletePoll, 
  duplicatePoll 
} = pollControllelr = require('../controllers/pollController');
const auth = require('../middlewares/auth');
const authOptional = require('../middlewares/authOptional');

// 1. Create a new poll (login required)
router.post('/poll', auth, createPoll);

// 2. Get poll by slug (guest or user)
router.get('/poll/:slug', authOptional, getPollBySlug);

// 3. Get logged-in user's polls with response count
router.get('/polls/me', auth, getMyPolls);

// 4. Submit vote (guest or user)
router.post('/poll/vote', authOptional, createVote);

// 5. Update a poll (login required)
router.put('/poll/:id', auth, updatePoll);

// 6. Delete a poll (login required)
router.delete('/poll/:id', auth, deletePoll);

// 7. Duplicate a poll (login required)
router.post('/poll/:id/duplicate', auth, duplicatePoll);

module.exports = router;