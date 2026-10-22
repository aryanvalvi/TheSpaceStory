import { Response, NextFunction } from 'express';
import { Client } from '../models/Client.js';
import { Project } from '../models/Project.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAppError } from '../middleware/errorHandler.js';
import type { CreateClientInput, UpdateClientInput } from '../validators/client.js';

export const clientController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { search, page = 1, limit = 20 } = req.query as any;
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ];
      }

      const [clients, total] = await Promise.all([
        Client.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Client.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: clients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const client = await Client.findById(req.params.id).lean();
      if (!client) {
        throw createAppError(404, 'NOT_FOUND', 'Client not found');
      }
      res.json({ success: true, data: client });
    } catch (error) {
      next(error);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateClientInput;
      const client = await Client.create(data);
      res.status(201).json({ success: true, data: client });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = req.body as UpdateClientInput;
      const client = await Client.findByIdAndUpdate(
        req.params.id,
        { $set: data },
        { new: true, runValidators: true }
      ).lean();

      if (!client) {
        throw createAppError(404, 'NOT_FOUND', 'Client not found');
      }

      res.json({ success: true, data: client });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Check if client has projects
      const projectCount = await Project.countDocuments({ clientId: req.params.id });
      if (projectCount > 0) {
        throw createAppError(
          400,
          'VALIDATION_ERROR',
          `Cannot delete client with ${projectCount} linked project(s). Remove projects first.`
        );
      }

      const client = await Client.findByIdAndDelete(req.params.id);
      if (!client) {
        throw createAppError(404, 'NOT_FOUND', 'Client not found');
      }

      res.json({ success: true, data: { message: 'Client deleted' } });
    } catch (error) {
      next(error);
    }
  },
};
