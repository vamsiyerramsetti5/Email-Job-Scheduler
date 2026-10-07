import { Router, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { authenticateUser, AuthRequest } from '../middleware/auth.middleware.js';
import { rateLimiterService } from '../services/rateLimiter.service.js';
import { config } from '../config.js';

const router = Router();

router.get('/', authenticateUser, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    const scheduledCount = await prisma.emailLog.count({
      where: {
        userId,
        status: { in: ['SCHEDULED', 'DELAYED_RATE_LIMIT'] },
      },
    });

    const sentCount = await prisma.emailLog.count({
      where: {
        userId,
        status: 'SENT',
      },
    });

    const rateStats = await rateLimiterService.getSenderStats(
      userEmail,
      config.defaultMaxEmailsPerHour
    );

    return res.json({
      scheduledCount,
      sentCount,
      rateLimit: rateStats,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
