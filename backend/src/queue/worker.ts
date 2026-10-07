import { Worker, Job } from 'bullmq';
import { QUEUE_NAME, redisConnection, emailQueue } from './queue.js';
import { config } from '../config.js';
import { prisma } from '../db/prisma.js';
import { etherealService } from '../services/ethereal.service.js';
import { rateLimiterService } from '../services/rateLimiter.service.js';
import { slackService } from '../services/slack.service.js';
import { elasticsearchService } from '../services/elasticsearch.service.js';

export interface EmailJobData {
  emailLogId: string;
  jobId: string;
  userId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  delaySeconds: number;
  hourlyLimit: number;
}

export const startWorker = () => {
  const worker = new Worker<EmailJobData>(
    QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailLogId, jobId, userId, sender, recipient, subject, body, delaySeconds, hourlyLimit } = job.data;

      console.log(`[Worker] Processing email job ${job.id} for recipient: ${recipient} (Log ID: ${emailLogId})`);

      // 1. Idempotency Check: Verify email status in DB
      const existingEmail = await prisma.emailLog.findUnique({
        where: { id: emailLogId },
      });

      if (!existingEmail) {
        console.warn(`[Worker] Email log ${emailLogId} not found in DB. Skipping.`);
        return;
      }

      if (existingEmail.status === 'SENT') {
        console.log(`[Worker] Email ${emailLogId} already marked as SENT. Skipping for idempotency.`);
        return;
      }

      // 2. Hourly Rate Limit Check
      const rateLimitCheck = await rateLimiterService.checkAndIncrement(sender, hourlyLimit);

      if (!rateLimitCheck.allowed) {
        console.warn(
          `[Worker] Sender ${sender} hit hourly limit (${hourlyLimit}). Rescheduling email ${emailLogId} for ${rateLimitCheck.nextWindowStart.toISOString()}`
        );

        // Update DB status to DELAYED_RATE_LIMIT
        await prisma.emailLog.update({
          where: { id: emailLogId },
          data: {
            status: 'DELAYED_RATE_LIMIT',
            scheduledFor: rateLimitCheck.nextWindowStart,
          },
        });

        // Trigger Slack Notification on Rate Limit Hit
        await slackService.notifyRateLimitHit({
          userId,
          senderEmail: sender,
          limit: hourlyLimit,
          currentCount: rateLimitCheck.currentCount,
          rescheduledTime: rateLimitCheck.nextWindowStart,
        });

        // Re-queue delayed job into BullMQ preserving order for next window
        await emailQueue.add(
          `email-delayed-${emailLogId}`,
          job.data,
          {
            delay: rateLimitCheck.delayMs,
            jobId: `delayed-${emailLogId}-${Date.now()}`,
          }
        );

        return { delayed: true, nextWindowStart: rateLimitCheck.nextWindowStart };
      }

      // 3. Minimum Throttling Delay (Provider Throttling)
      const minDelay = Math.max(delaySeconds, config.defaultMinDelaySeconds) * 1000;
      if (minDelay > 0) {
        console.log(`[Worker] Applying provider throttling delay of ${minDelay / 1000}s before sending to ${recipient}...`);
        await new Promise((resolve) => setTimeout(resolve, minDelay));
      }

      // 4. Send Email via Fake SMTP (Ethereal)
      try {
        const result = await etherealService.sendEmail({
          from: sender,
          to: recipient,
          subject,
          body,
        });

        // 5. Update DB Status to SENT
        const updatedEmail = await prisma.emailLog.update({
          where: { id: emailLogId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            etherealPreviewUrl: result.previewUrl,
            messageId: result.messageId,
          },
        });

        // 6. Increment ScheduledJob sentCount
        await prisma.scheduledJob.update({
          where: { id: jobId },
          data: {
            sentCount: { increment: 1 },
          },
        });

        // Check if job is fully completed
        const parentJob = await prisma.scheduledJob.findUnique({
          where: { id: jobId },
          include: { _count: { select: { emails: true } } },
        });

        if (parentJob && parentJob.sentCount >= parentJob.totalLeads) {
          await prisma.scheduledJob.update({
            where: { id: jobId },
            data: { status: 'COMPLETED' },
          });
          console.log(`[Worker] Parent job ${jobId} marked as COMPLETED.`);
        }

        // 7. Index into Elasticsearch
        await elasticsearchService.indexEmail(updatedEmail);

        return { success: true, messageId: result.messageId, previewUrl: result.previewUrl };
      } catch (err: any) {
        console.error(`[Worker] Error sending email ${emailLogId}:`, err.message);

        // Update DB status to FAILED
        const failedEmail = await prisma.emailLog.update({
          where: { id: emailLogId },
          data: {
            status: 'FAILED',
            error: err.message,
          },
        });

        await elasticsearchService.indexEmail(failedEmail);
        throw err;
      }
    },
    {
      connection: redisConnection,
      concurrency: config.concurrency, // Configurable concurrency!
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error: ${err.message}`);
  });

  console.log(`[Worker] Started BullMQ Worker with concurrency = ${config.concurrency}`);
  return worker;
};
