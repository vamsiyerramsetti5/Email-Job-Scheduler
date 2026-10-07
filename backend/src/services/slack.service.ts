import axios from 'axios';
import { prisma } from '../db/prisma.js';

class SlackService {
  /**
   * Send notification when rate limit is hit for a sender
   */
  async notifyRateLimitHit(params: {
    userId: string;
    senderEmail: string;
    limit: number;
    currentCount: number;
    rescheduledTime: Date;
  }): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
      });

      if (!user) return false;

      // Check if Slack is connected via Webhook URL or OAuth Token
      const webhookUrl = user.slackWebhookUrl;
      const slackToken = user.slackToken;
      const slackChannel = user.slackChannel || '#general';

      if (!webhookUrl && !slackToken) {
        console.log(`[SlackService] User ${params.userId} has not connected Slack. Notification skipped.`);
        return false;
      }

      const formattedTime = params.rescheduledTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      const messagePayload = {
        text: `⚠️ *Hourly Rate Limit Exceeded for Email Scheduler*`,
        attachments: [
          {
            color: '#f59e0b', // Warning Amber
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Rate Limit Alert for Sender:* \`${params.senderEmail}\`\nHourly limit of *${params.limit} emails/hour* has been reached (Current count: *${params.currentCount}*).`,
                },
              },
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `🕒 Remaining queued emails for this sender have been automatically rescheduled for *${formattedTime}* to enforce provider throttling.`,
                  },
                ],
              },
            ],
          },
        ],
      };

      if (webhookUrl) {
        await axios.post(webhookUrl, messagePayload);
        console.log(`[SlackService] Webhook alert sent successfully for ${params.senderEmail}`);
        return true;
      } else if (slackToken) {
        await axios.post(
          'https://slack.com/api/chat.postMessage',
          {
            channel: slackChannel,
            ...messagePayload,
          },
          {
            headers: {
              Authorization: `Bearer ${slackToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log(`[SlackService] OAuth Slack message sent to channel ${slackChannel}`);
        return true;
      }
    } catch (err: any) {
      console.error('[SlackService] Error sending Slack notification:', err?.response?.data || err.message);
    }
    return false;
  }

  /**
   * Send test notification
   */
  async sendTestNotification(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (!user.slackWebhookUrl && !user.slackToken)) {
      return { success: false, message: 'Slack is not connected yet.' };
    }

    const testPayload = {
      text: '✅ *ReachInbox Email Scheduler Slack Integration Test*',
      attachments: [
        {
          color: '#00B050',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '🎉 Your Slack channel is successfully connected! You will receive live alerts whenever an email sender hits their hourly sending quota.',
              },
            },
          ],
        },
      ],
    };

    try {
      if (user.slackWebhookUrl) {
        await axios.post(user.slackWebhookUrl, testPayload);
        return { success: true, message: 'Test message sent to Slack Webhook!' };
      } else if (user.slackToken) {
        await axios.post(
          'https://slack.com/api/chat.postMessage',
          { channel: user.slackChannel || '#general', ...testPayload },
          { headers: { Authorization: `Bearer ${user.slackToken}` } }
        );
        return { success: true, message: 'Test message sent to Slack Channel!' };
      }
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.error || err.message };
    }

    return { success: false, message: 'Failed to send test message.' };
  }
}

export const slackService = new SlackService();
