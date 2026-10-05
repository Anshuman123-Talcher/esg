const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const prisma = require('../config/prisma');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.substring(7)
    : (req.query && req.query.token ? req.query.token : null);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { subsidiary: true }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session token: User not found.'
      });
    }

    if (user.accessStatus !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Account access has been suspended or revoked. Contact Central MEIL Admin.'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      title: user.title,
      subsidiaryId: user.subsidiaryId,
      subsidiaryName: user.subsidiary ? user.subsidiary.name : null
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session token has expired. Please sign in again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Malformed or invalid authentication token.'
    });
  }
}

module.exports = {
  authenticateToken
};
