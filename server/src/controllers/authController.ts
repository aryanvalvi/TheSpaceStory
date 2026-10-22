import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAppError } from '../middleware/errorHandler.js';
import type { LoginInput, RegisterInput } from '../validators/auth.js';

function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
}

function setTokenCookie(res: Response, token: string): void {
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

export const authController = {
  async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body as LoginInput;

      const user = await User.findOne({ email, active: true }).select('+passwordHash');
      if (!user) {
        throw createAppError(401, 'UNAUTHORIZED', 'Invalid email or password');
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw createAppError(401, 'UNAUTHORIZED', 'Invalid email or password');
      }

      const token = generateToken(user._id.toString(), user.email);
      setTokenCookie(res, token);

      res.json({
        success: true,
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async logout(_req: AuthRequest, res: Response) {
    res.clearCookie('token', { path: '/' });
    res.json({ success: true, data: { message: 'Logged out' } });
  },

  async me(req: AuthRequest, res: Response) {
    res.json({ success: true, data: req.user });
  },

  async register(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body as RegisterInput;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw createAppError(409, 'CONFLICT', 'Email already registered');
      }

      const user = new User({
        name,
        email,
        passwordHash: password,
        role: 'owner',
      });
      await user.save();

      const token = generateToken(user._id.toString(), user.email);
      setTokenCookie(res, token);

      res.status(201).json({
        success: true,
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
