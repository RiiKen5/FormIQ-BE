// middlewares/authOptional.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  req.ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id };
    } catch (err) {
      // Invalid token — continue as guest
    }
  }

  next(); // Proceed either way
};
