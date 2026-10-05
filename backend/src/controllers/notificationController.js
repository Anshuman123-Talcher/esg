const prisma = require('../config/prisma');

class NotificationController {
  _getScopeFilter(user) {
    if (user.role === 'SUB_ADMIN') {
      return {
        AND: [
          {
            OR: [
              { roleTarget: 'ALL' },
              { roleTarget: 'SUB_ADMIN' }
            ]
          },
          {
            OR: [
              { subsidiaryId: null },
              { subsidiaryId: user.subsidiaryId }
            ]
          },
          {
            OR: [
              { userId: null },
              { userId: user.id }
            ]
          }
        ]
      };
    }
    // MAIN_ADMIN scope
    return {
      OR: [
        { roleTarget: 'ALL' },
        { roleTarget: 'MAIN_ADMIN' },
        { userId: user.id }
      ]
    };
  }

  async getNotifications(req, res, next) {
    try {
      const scopeFilter = this._getScopeFilter(req.user);

      const notifs = await prisma.notification.findMany({
        where: scopeFilter,
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      return res.json({ success: true, data: notifs });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark single notification read with authorization check (Requirement 13)
   */
  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;

      const notif = await prisma.notification.findUnique({
        where: { id }
      });

      if (!notif) {
        return res.status(404).json({ success: false, message: 'Notification not found.' });
      }

      // Check user authorization against notification target
      if (req.user.role === 'SUB_ADMIN') {
        const matchesRole = notif.roleTarget === 'ALL' || notif.roleTarget === 'SUB_ADMIN';
        const matchesSub = !notif.subsidiaryId || notif.subsidiaryId === req.user.subsidiaryId;
        const matchesUser = !notif.userId || notif.userId === req.user.id;

        if (!matchesRole || !matchesSub || !matchesUser) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You are not authorized to modify this notification.'
          });
        }
      } else {
        const matchesRole = notif.roleTarget === 'ALL' || notif.roleTarget === 'MAIN_ADMIN';
        const matchesUser = !notif.userId || notif.userId === req.user.id;

        if (!matchesRole && !matchesUser) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You are not authorized to modify this notification.'
          });
        }
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      });

      return res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mark all scoped notifications read (Requirement 13: strictly filtered by user scope)
   */
  async markAllRead(req, res, next) {
    try {
      const scopeFilter = this._getScopeFilter(req.user);

      const result = await prisma.notification.updateMany({
        where: {
          isRead: false,
          ...scopeFilter
        },
        data: { isRead: true }
      });

      return res.json({
        success: true,
        count: result.count,
        message: 'Authorized notifications marked as read.'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NotificationController();
