import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, IUser, UserRole } from '../models/User';
import mongoose from 'mongoose';

export interface AuthRequest extends Request {
  user?: IUser;
  tenantId?: mongoose.Types.ObjectId;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'You are not logged in. Please provide a valid authentication token.' }
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; role: UserRole; tenantId?: string };

    const currentUser = await User.findById(decoded.id);

    if (!currentUser || currentUser.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'The user belonging to this token no longer exists or is inactive.' }
      });
    }

    req.user = currentUser;
    if (currentUser.tenantId) {
      req.tenantId = currentUser.tenantId;
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired authentication token.' }
    });
  }
};
