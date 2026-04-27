import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { prisma } from '../db/prisma';

// Augment Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = AuthService.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Token is invalid or has expired',
      });
    }

    // Check if token exists in session table (optional security measure, useful for logout)
    const session = await prisma.appSession.findUnique({ where: { token } });
    if (!session) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Session invalidated or expired',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User no longer exists',
      });
    }

    req.user = { id: user.id, email: user.email };
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = AuthService.verifyToken(token);

    if (decoded) {
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (user) {
        req.user = { id: user.id, email: user.email };
      }
    }
    
    next();
  } catch (error) {
    // optionalAuth shouldn't fail the request on auth errors
    next();
  }
};
