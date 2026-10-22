import { Response, NextFunction } from 'express';
import { Project } from '../models/Project.js';
import { Client } from '../models/Client.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAppError } from '../middleware/errorHandler.js';
import type { CreateProjectInput, UpdateProjectInput } from '../validators/project.js';

export const projectController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { clientId, status, search, page = 1, limit = 20 } = req.query as any;
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (clientId) filter.clientId = clientId;
      if (status) filter.status = status;
      if (search) {
        filter.projectName = { $regex: search, $options: 'i' };
      }

      const [projects, total] = await Promise.all([
        Project.find(filter)
          .populate('clientId', 'name phone email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Project.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: projects,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const project = await Project.findById(req.params.id)
        .populate('clientId', 'name phone email billingAddress')
        .lean();
      if (!project) {
        throw createAppError(404, 'NOT_FOUND', 'Project not found');
      }
      res.json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateProjectInput;

      // Verify client exists
      const client = await Client.findById(data.clientId);
      if (!client) {
        throw createAppError(404, 'NOT_FOUND', 'Client not found');
      }

      const project = await Project.create(data);
      res.status(201).json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = req.body as UpdateProjectInput;
      const project = await Project.findByIdAndUpdate(
        req.params.id,
        { $set: data },
        { new: true, runValidators: true }
      ).lean();

      if (!project) {
        throw createAppError(404, 'NOT_FOUND', 'Project not found');
      }

      res.json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  },
};
