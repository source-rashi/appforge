import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';
import { eventBus } from '../services/event-bus.service';

const router = Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Ensure all routes require authentication
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const unreadOnly = req.query.unreadOnly === 'true';
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;

  const result = await notificationService.getNotifications(userId, { unreadOnly, page, pageSize });
  res.status(200).json(result);
}));

router.get('/count', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const result = await notificationService.getNotifications(userId, { unreadOnly: true, pageSize: 1 });
  res.status(200).json({ unreadCount: result.unreadCount });
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const notificationId = req.params.id;
  await notificationService.markAsRead(notificationId, userId);
  res.status(200).json({ message: 'Marked as read' });
}));

router.patch('/read-all', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  await notificationService.markAllAsRead(userId);
  res.status(200).json({ message: 'All marked as read' });
}));

// SSE endpoint for real-time notifications
router.get('/stream', (req, res) => {
  const userId = req.user!.id;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Initial connection response
  res.write(': connected\n\n');

  // Event listener
  const listener = (payload: { userId: string; notification: import('@prisma/client').Notification }) => {
    if (payload.userId === userId) {
      const data = JSON.stringify({
        type: payload.notification.type,
        subject: payload.notification.subject,
        body: payload.notification.body,
        createdAt: payload.notification.createdAt
      });
      res.write(`data: ${data}\n\n`);
    }
  };

  eventBus.on('notification:new', listener);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`data: {"type":"ping"}\n\n`);
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    eventBus.off('notification:new', listener);
    res.end();
  });
});

export default router;
