import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { config } from '../config.js';
import { authenticateUser, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * Google Login Endpoint
 */
router.post('/google', async (req, res): Promise<any> => {
  try {
    const { email, name, avatar, googleId } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email)}&background=00B050&color=fff`,
          googleId,
        },
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        hasSlack: !!(user.slackWebhookUrl || user.slackToken),
      },
    });
  } catch (err: any) {
    console.error('[AuthRoute] Google login error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Demo Login Endpoint
 */
router.post('/demo', async (req, res): Promise<any> => {
  try {
    let user = await prisma.user.findFirst({
      where: { email: 'oliver.brown@domain.io' },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'oliver.brown@domain.io',
          name: 'Oliver Brown',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
        },
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        hasSlack: !!(user.slackWebhookUrl || user.slackToken),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Get current user
 */
router.get('/me', authenticateUser, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      avatar: dbUser.avatar,
      slackConnected: !!(dbUser.slackWebhookUrl || dbUser.slackToken),
      slackChannel: dbUser.slackChannel || (dbUser.slackWebhookUrl ? 'Webhook Configured' : null),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
