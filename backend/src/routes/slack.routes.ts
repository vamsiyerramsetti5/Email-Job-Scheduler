import { Router, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { slackService } from '../services/slack.service.js';
import { authenticateUser, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * Connect Slack Webhook
 */
router.post('/connect-webhook', authenticateUser, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { webhookUrl, channel = '#email-alerts' } = req.body;

    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      return res.status(400).json({ error: 'Invalid Slack Webhook URL. Format: https://hooks.slack.com/services/...' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        slackWebhookUrl: webhookUrl,
        slackChannel: channel,
      },
    });

    // Send test notification instantly
    await slackService.sendTestNotification(userId);

    return res.json({
      success: true,
      message: 'Slack Webhook connected successfully!',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Connect Slack OAuth Token
 */
router.post('/connect-oauth', authenticateUser, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { botToken, channel = '#general' } = req.body;

    if (!botToken || !botToken.startsWith('xoxb-')) {
      return res.status(400).json({ error: 'Invalid Slack Bot Token. Format: xoxb-...' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        slackToken: botToken,
        slackChannel: channel,
      },
    });

    await slackService.sendTestNotification(userId);

    return res.json({
      success: true,
      message: 'Slack OAuth Bot Token connected successfully!',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Test Slack Notification
 */
router.post('/test-notification', authenticateUser, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const result = await slackService.sendTestNotification(userId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Disconnect Slack
 */
router.post('/disconnect', authenticateUser, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    await prisma.user.update({
      where: { id: userId },
      data: {
        slackWebhookUrl: null,
        slackToken: null,
        slackChannel: null,
      },
    });

    return res.json({ success: true, message: 'Slack disconnected cleanly.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Get Slack Connection Status
 */
router.get('/status', authenticateUser, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    return res.json({
      isConnected: !!(user?.slackWebhookUrl || user?.slackToken),
      type: user?.slackWebhookUrl ? 'Webhook' : user?.slackToken ? 'OAuth' : 'None',
      channel: user?.slackChannel || null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
