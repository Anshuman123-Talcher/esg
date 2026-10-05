const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Both email and password are required.'
        });
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
        include: { subsidiary: true }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User account with this email address was not found.'
        });
      }

      if (user.accessStatus !== 'Active') {
        return res.status(403).json({
          success: false,
          message: 'Your account access has been suspended or revoked. Contact Central MEIL Admin.'
        });
      }

      // Verify password strictly against stored bcrypt hash (no bypasses permitted)
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please verify your password.'
        });
      }

      // Generate JWT
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          subsidiaryId: user.subsidiaryId
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Update lastLogin
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          actor: user.name,
          role: user.role,
          userId: user.id,
          subsidiaryId: user.subsidiaryId,
          action: 'LOGIN',
          entity: 'Session',
          entityId: user.id,
          details: `User signed in successfully as ${user.role}`,
          ipAddress: req.ip || req.connection.remoteAddress
        }
      });

      // Role normalization matching frontend: 'main_admin' or 'sub_admin'
      const normalizedRole = user.role === 'MAIN_ADMIN' ? 'main_admin' : 'sub_admin';

      return res.json({
        success: true,
        message: 'Authentication successful.',
        token,
        user: {
          id: user.id,
          userId: user.id,
          email: user.email,
          name: user.name,
          role: normalizedRole,
          rawRole: user.role,
          title: user.title,
          assignedSubsidiaryId: user.subsidiaryId,
          subsidiaryId: user.subsidiaryId,
          subsidiaryName: user.subsidiary ? user.subsidiary.name : null,
          loginTimestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { subsidiary: true }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const normalizedRole = user.role === 'MAIN_ADMIN' ? 'main_admin' : 'sub_admin';

      return res.json({
        success: true,
        user: {
          id: user.id,
          userId: user.id,
          email: user.email,
          name: user.name,
          role: normalizedRole,
          rawRole: user.role,
          title: user.title,
          assignedSubsidiaryId: user.subsidiaryId,
          subsidiaryId: user.subsidiaryId,
          subsidiaryName: user.subsidiary ? user.subsidiary.name : null,
          accessStatus: user.accessStatus
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      if (req.user) {
        await prisma.auditLog.create({
          data: {
            actor: req.user.name,
            role: req.user.role,
            userId: req.user.id,
            subsidiaryId: req.user.subsidiaryId,
            action: 'LOGOUT',
            entity: 'Session',
            entityId: req.user.id,
            details: 'User logged out of active session.'
          }
        });
      }
      return res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
