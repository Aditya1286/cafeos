import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User';
import { verifyAuthToken, isTokenRevoked } from '../utils/authToken';
import mongoose from 'mongoose';

export interface AuthRequest extends Request {
  user?: IUser;
  businessId?: mongoose.Types.ObjectId;
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

    const decoded = verifyAuthToken(token);

    const currentUser = await User.findById(decoded.id);

    if (!currentUser || currentUser.status !== 'ACTIVE' || isTokenRevoked(currentUser, decoded)) {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'The user belonging to this token no longer exists or is inactive.' }
      });
    }

    req.user = currentUser;
    if (currentUser.businessId) {
      req.businessId = currentUser.businessId;
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired authentication token.' }
    });
  }
};
