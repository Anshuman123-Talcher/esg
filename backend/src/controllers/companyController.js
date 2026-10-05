const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

class CompanyController {
  // Main Company
  async getMainCompany(req, res, next) {
    try {
      const company = await prisma.mainCompany.findFirst({
        include: { subsidiaries: true }
      });
      return res.json({ success: true, data: company });
    } catch (err) {
      next(err);
    }
  }

  async updateMainCompany(req, res, next) {
    try {
      if (req.user.role !== 'MAIN_ADMIN') {
        return res.status(403).json({ success: false, message: 'Only Main Company Admin can modify enterprise profile.' });
      }

      const { name, cin, headquarters, reportingYear, turnover, totalEmployees, activeProjects } = req.body;
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (cin !== undefined) updateData.cin = cin;
      if (headquarters !== undefined) updateData.headquarters = headquarters;
      if (reportingYear !== undefined) updateData.reportingYear = reportingYear;
      if (turnover !== undefined) updateData.turnover = Number(turnover);
      if (totalEmployees !== undefined) updateData.totalEmployees = Number(totalEmployees);
      if (activeProjects !== undefined) updateData.activeProjects = Number(activeProjects);

      const updated = await prisma.mainCompany.update({
        where: { id: 'main-meil' },
        data: updateData
      });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          action: 'UPDATE',
          entity: 'MainCompany',
          entityId: 'main-meil',
          details: 'Updated central MEIL group enterprise profile.'
        }
      });

      return res.json({ success: true, data: updated, message: 'Main company profile updated.' });
    } catch (err) {
      next(err);
    }
  }

  // Subsidiaries
  async getSubsidiaries(req, res, next) {
    try {
      // Sub Admin only sees assigned subsidiary
      const where = req.user.role === 'SUB_ADMIN' ? { id: req.user.subsidiaryId } : {};

      const subsidiaries = await prisma.subsidiary.findMany({
        where,
        include: {
          businessUnits: true,
          _count: { select: { projects: true, submissions: true } }
        },
        orderBy: { name: 'asc' }
      });

      return res.json({ success: true, data: subsidiaries });
    } catch (err) {
      next(err);
    }
  }

  async getSubsidiaryById(req, res, next) {
    try {
      const { id } = req.params;

      if (req.user.role === 'SUB_ADMIN' && req.user.subsidiaryId !== id) {
        return res.status(403).json({ success: false, message: 'Forbidden: Access to other subsidiary is restricted.' });
      }

      const subsidiary = await prisma.subsidiary.findUnique({
        where: { id },
        include: {
          businessUnits: { include: { projects: true } },
          companyProfile: true,
          businessActivities: true
        }
      });

      if (!subsidiary) {
        return res.status(404).json({ success: false, message: 'Subsidiary not found.' });
      }

      return res.json({ success: true, data: subsidiary });
    } catch (err) {
      next(err);
    }
  }

  async createSubsidiary(req, res, next) {
    try {
      if (req.user.role !== 'MAIN_ADMIN') {
        return res.status(403).json({ success: false, message: 'Only Main Company Admin can onboard new subsidiaries.' });
      }

      const {
        id,
        name,
        code,
        sector,
        location,
        headquarters,
        cin,
        equityHolding = 100.0,
        contactEmail,
        status = 'Active'
      } = req.body;

      const subId = id || `sub-${Date.now().toString(36)}`;
      const created = await prisma.subsidiary.create({
        data: {
          id: subId,
          name,
          code: code.toUpperCase(),
          sector,
          location,
          headquarters,
          cin,
          equityHolding: Number(equityHolding) || 100.0,
          contactEmail,
          status
        }
      });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: created.id,
          action: 'CREATE',
          entity: 'Subsidiary',
          entityId: created.id,
          details: `Created new subsidiary: ${created.name} (${created.code})`
        }
      });

      return res.status(201).json({ success: true, data: created, message: 'Subsidiary onboarded successfully.' });
    } catch (err) {
      next(err);
    }
  }

  async updateSubsidiary(req, res, next) {
    try {
      const { id } = req.params;

      if (req.user.role === 'SUB_ADMIN' && req.user.subsidiaryId !== id) {
        return res.status(403).json({ success: false, message: 'Access denied: You cannot edit other subsidiaries.' });
      }

      const { name, sector, location, headquarters, cin, equityHolding, contactEmail, status } = req.body;
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (sector !== undefined) updateData.sector = sector;
      if (location !== undefined) updateData.location = location;
      if (headquarters !== undefined) updateData.headquarters = headquarters;
      if (cin !== undefined) updateData.cin = cin;
      if (equityHolding !== undefined) updateData.equityHolding = Number(equityHolding);
      if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
      if (status !== undefined && req.user.role === 'MAIN_ADMIN') updateData.status = status;

      const updated = await prisma.subsidiary.update({
        where: { id },
        data: updateData
      });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: id,
          action: 'UPDATE',
          entity: 'Subsidiary',
          entityId: id,
          details: `Updated subsidiary profile for ${updated.name}`
        }
      });

      return res.json({ success: true, data: updated, message: 'Subsidiary profile updated.' });
    } catch (err) {
      next(err);
    }
  }

  // Business Units
  async getBusinessUnits(req, res, next) {
    try {
      const { subsidiaryId } = req.query;
      let where = {};

      if (req.user.role === 'SUB_ADMIN') {
        where.subsidiaryId = req.user.subsidiaryId;
      } else if (subsidiaryId && subsidiaryId !== 'all') {
        where.subsidiaryId = subsidiaryId;
      }

      const bus = await prisma.businessUnit.findMany({
        where,
        include: { subsidiary: true, projects: true },
        orderBy: { name: 'asc' }
      });

      return res.json({ success: true, data: bus });
    } catch (err) {
      next(err);
    }
  }

  async createBusinessUnit(req, res, next) {
    try {
      const { id, name, code, head, location, employeeCount = 0, budgetCr = 0.0, subsidiaryId } = req.body;

      const effectiveSubId = req.user.role === 'SUB_ADMIN' ? req.user.subsidiaryId : (subsidiaryId || req.user.subsidiaryId);
      if (!effectiveSubId) {
        return res.status(400).json({ success: false, message: 'Subsidiary ID is required to register a business unit.' });
      }

      const buId = id || `bu-${Date.now().toString(36)}`;
      const created = await prisma.businessUnit.create({
        data: {
          id: buId,
          subsidiaryId: effectiveSubId,
          name,
          code,
          head,
          location,
          employeeCount: Number(employeeCount) || 0,
          budgetCr: Number(budgetCr) || 0.0
        }
      });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: effectiveSubId,
          action: 'CREATE',
          entity: 'BusinessUnit',
          entityId: created.id,
          details: `Created business unit ${created.name} (${created.code})`
        }
      });

      return res.status(201).json({ success: true, data: created, message: 'Business Unit added successfully.' });
    } catch (err) {
      next(err);
    }
  }

  async updateBusinessUnit(req, res, next) {
    try {
      const { id } = req.params;
      const bu = await prisma.businessUnit.findUnique({ where: { id } });

      if (!bu) {
        return res.status(404).json({ success: false, message: 'Business unit not found.' });
      }

      if (req.user.role === 'SUB_ADMIN' && req.user.subsidiaryId !== bu.subsidiaryId) {
        return res.status(403).json({ success: false, message: 'Access denied: You cannot edit business units of another subsidiary.' });
      }

      // Explicit field whitelisting (Prevents reassignment of subsidiaryId)
      const { name, code, head, location, employeeCount, budgetCr } = req.body;
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (code !== undefined) updateData.code = code;
      if (head !== undefined) updateData.head = head;
      if (location !== undefined) updateData.location = location;
      if (employeeCount !== undefined) updateData.employeeCount = Number(employeeCount);
      if (budgetCr !== undefined) updateData.budgetCr = Number(budgetCr);

      const updated = await prisma.businessUnit.update({
        where: { id },
        data: updateData
      });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: bu.subsidiaryId,
          action: 'UPDATE',
          entity: 'BusinessUnit',
          entityId: id,
          details: `Updated business unit ${updated.name}`
        }
      });

      return res.json({ success: true, data: updated, message: 'Business Unit updated.' });
    } catch (err) {
      next(err);
    }
  }

  // User Management (Authoritative & Secure)
  async getUsers(req, res, next) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          title: true,
          subsidiaryId: true,
          accessStatus: true,
          lastLogin: true,
          createdAt: true,
          subsidiary: { select: { id: true, name: true, code: true } }
        },
        orderBy: { name: 'asc' }
      });
      return res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  async createUser(req, res, next) {
    try {
      if (req.user.role !== 'MAIN_ADMIN') {
        return res.status(403).json({ success: false, message: 'Only Main Company Admin can register user accounts.' });
      }

      const { name, email, password, role, title, subsidiaryId } = req.body;

      const cleanEmail = email.trim().toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existing) {
        return res.status(409).json({ success: false, message: `A user with email '${cleanEmail}' already exists.` });
      }

      if (role === 'SUB_ADMIN' && !subsidiaryId) {
        return res.status(400).json({ success: false, message: 'Subsidiary assignment is required for Sub-Company Admin.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const created = await prisma.user.create({
        data: {
          name,
          email: cleanEmail,
          passwordHash,
          role,
          title: title || (role === 'MAIN_ADMIN' ? 'Main Company Admin' : 'Sub-Company Admin'),
          subsidiaryId: role === 'MAIN_ADMIN' ? null : subsidiaryId,
          accessStatus: 'Active'
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          title: true,
          subsidiaryId: true,
          accessStatus: true,
          createdAt: true
        }
      });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: created.subsidiaryId,
          action: 'CREATE',
          entity: 'User',
          entityId: created.id,
          details: `Created new user account for ${created.name} (${created.email}) with role ${created.role}`
        }
      });

      return res.status(201).json({ success: true, data: created, message: 'User created successfully.' });
    } catch (err) {
      next(err);
    }
  }

  async updateUserAccess(req, res, next) {
    try {
      if (req.user.role !== 'MAIN_ADMIN') {
        return res.status(403).json({ success: false, message: 'Only Main Company Admin can grant or revoke access.' });
      }

      const { id } = req.params;
      const { accessStatus } = req.body; // Active, Suspended, Revoked

      const updated = await prisma.user.update({
        where: { id },
        data: { accessStatus },
        select: { id: true, email: true, name: true, role: true, accessStatus: true }
      });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: updated.subsidiaryId,
          action: 'ACCESS_CHANGE',
          entity: 'User',
          entityId: id,
          details: `Changed access status of user ${updated.email} to ${accessStatus}`
        }
      });

      return res.json({ success: true, data: updated, message: `Access status updated to ${accessStatus}.` });
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req, res, next) {
    try {
      if (req.user.role !== 'MAIN_ADMIN') {
        return res.status(403).json({ success: false, message: 'Only Main Company Admin can remove user accounts.' });
      }

      const { id } = req.params;
      if (id === req.user.id) {
        return res.status(400).json({ success: false, message: 'You cannot delete your own active administrator account.' });
      }

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      await prisma.user.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          actor: req.user.name,
          role: req.user.role,
          userId: req.user.id,
          subsidiaryId: existing.subsidiaryId,
          action: 'DELETE',
          entity: 'User',
          entityId: id,
          details: `Deleted user account for ${existing.name} (${existing.email})`
        }
      });

      return res.json({ success: true, message: 'User account removed successfully.' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CompanyController();
