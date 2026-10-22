import { Response, NextFunction } from 'express';
import { CatalogueItem } from '../models/CatalogueItem.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAppError } from '../middleware/errorHandler.js';
import type { CreateCatalogueItemInput, UpdateCatalogueItemInput } from '../validators/catalogue.js';

export const catalogueController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { category, search, active, page = 1, limit = 50 } = req.query as any;
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (category) filter.category = category;
      if (active !== undefined) filter.active = active === 'true';
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      const [items, total] = await Promise.all([
        CatalogueItem.find(filter).sort({ category: 1, name: 1 }).skip(skip).limit(limit).lean(),
        CatalogueItem.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const item = await CatalogueItem.findById(req.params.id).lean();
      if (!item) {
        throw createAppError(404, 'NOT_FOUND', 'Catalogue item not found');
      }
      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = req.body as CreateCatalogueItemInput;
      const item = await CatalogueItem.create(data);
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = req.body as UpdateCatalogueItemInput;
      const item = await CatalogueItem.findByIdAndUpdate(
        req.params.id,
        { $set: data },
        { new: true, runValidators: true }
      ).lean();

      if (!item) {
        throw createAppError(404, 'NOT_FOUND', 'Catalogue item not found');
      }

      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Archive instead of hard delete
      const item = await CatalogueItem.findByIdAndUpdate(
        req.params.id,
        { $set: { active: false } },
        { new: true }
      ).lean();

      if (!item) {
        throw createAppError(404, 'NOT_FOUND', 'Catalogue item not found');
      }

      res.json({ success: true, data: { message: 'Catalogue item archived' } });
    } catch (error) {
      next(error);
    }
  },
};
