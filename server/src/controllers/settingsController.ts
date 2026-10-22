import { Response, NextFunction } from 'express';
import { StudioSettings } from '../models/StudioSettings.js';
import { AuthRequest } from '../middleware/auth.js';
import type { UpdateStudioSettingsInput } from '../validators/settings.js';

export const settingsController = {
  async getStudio(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      let settings = await StudioSettings.findOne();
      if (!settings) {
        settings = await StudioSettings.create({});
      }
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  },

  async updateStudio(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = req.body as UpdateStudioSettingsInput;
      let settings = await StudioSettings.findOne();

      if (!settings) {
        settings = new StudioSettings(data);
      } else {
        Object.assign(settings, data);
      }

      await settings.save();
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  },
};
