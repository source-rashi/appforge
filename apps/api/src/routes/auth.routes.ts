import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { requireAuth } from '../middleware/auth.middleware';
import { AppError } from '../utils/errors';

const router = Router();

// Wrap async handlers for Express to catch rejected promises
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.post('/register', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('Valid email is required', 400, 'VALIDATION_ERROR');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400, 'VALIDATION_ERROR');
  }

  const user = await AuthService.createUser(email, password);
  
  // Auto-login after registration
  const { token } = await AuthService.loginUser(email, password);

  res.status(201).json({
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
    token,
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
  }

  const { user, token } = await AuthService.loginUser(email, password);

  res.status(200).json({
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
    token,
  });
}));

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const token = req.headers.authorization!.split(' ')[1];
  await AuthService.logoutUser(token);
  
  res.status(200).json({ message: 'Logged out' });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  // req.user is guaranteed to exist due to requireAuth
  const { id, email } = req.user!;
  
  // Note: we fetch fresh data if needed, but req.user has what's requested
  res.status(200).json({
    user: { id, email },
  });
}));

export default router;
