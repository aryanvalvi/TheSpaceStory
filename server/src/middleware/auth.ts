import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createAppError } from './errorHandler.js';
import { User } from '../models/User.js';

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.token;

    if (!token) {
      throw createAppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      email: string;
    };

    const user = await User.findById(decoded.userId).select('-passwordHash').lean();

    if (!user || !user.active) {
      throw createAppError(401, 'UNAUTHORIZED', 'User not found or inactive');
    }

    req.user = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if ((error as any).name === 'JsonWebTokenError' || (error as any).name === 'TokenExpiredError') {
      next(createAppError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
    } else {
      next(error);
    }
  }
}
