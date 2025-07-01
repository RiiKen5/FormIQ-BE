const express = require('express');
const router = express.Router();
const pollController = require('../controllers/pollController');
const auth = require('../middlewares/auth');

router.get('/mypoll', auth, pollController.getMyPolls);
router.get('/:slug', auth, pollController.getPollBySlug);
router.get('/:pollId/responses', auth, pollController.getResponses);
router.post('/create', auth, pollController.createPoll);
router.post('/:pollId/response',auth, pollController.submitResponse);
router.get('/:pollId/question/:questionId/analytics', auth, pollController.getQuestionAnalytics);
module.exports = router;