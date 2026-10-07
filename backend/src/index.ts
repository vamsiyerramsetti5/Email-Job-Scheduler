import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { prisma } from './db/prisma.js';
import { emailQueue } from './queue/queue.js';
import { startWorker } from './queue/worker.js';
import { setupBullBoard } from './queue/board.js';

import authRoutes from './routes/auth.routes.js';
import emailRoutes from './routes/email.routes.js';
import slackRoutes from './routes/slack.routes.js';
import statsRoutes from './routes/stats.routes.js';
import { EmailJobData } from './queue/worker.js';

const app = express();

app.use(cors());
app.use(express.json());

// BullMQ Live Dashboard UI
app.use('/admin/queues', setupBullBoard());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/stats', statsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Startup Job Recovery & Persisted State Restoration
 */
async function recoverPendingJobsOnStartup() {
  console.log('[Recovery] Checking for pending/scheduled jobs in DB to restore across server restart...');
  try {
    const pendingEmails = await prisma.emailLog.findMany({
      where: {
        status: { in: ['SCHEDULED', 'DELAYED_RATE_LIMIT'] },
      },
      include: { job: true },
    });

    console.log(`[Recovery] Found ${pendingEmails.length} pending email jobs in DB.`);

    for (const emailLog of pendingEmails) {
      const now = Date.now();
      const scheduledTime = emailLog.scheduledFor.getTime();
      const remainingDelayMs = Math.max(0, scheduledTime - now);

      const jobData: EmailJobData = {
        emailLogId: emailLog.id,
        jobId: emailLog.jobId,
        userId: emailLog.userId,
        sender: emailLog.sender,
        recipient: emailLog.recipient,
        subject: emailLog.subject,
        body: emailLog.body,
        delaySeconds: emailLog.job.delaySeconds,
        hourlyLimit: emailLog.job.hourlyLimit,
      };

      // Upsert job into BullMQ using deterministic jobId for idempotency
      await emailQueue.add(
        `send-email-${emailLog.id}`,
        jobData,
        {
          delay: remainingDelayMs,
          jobId: `email-${emailLog.id}`,
        }
      );
    }

    console.log('[Recovery] All pending jobs successfully synced with BullMQ!');
  } catch (err: any) {
    console.error('[Recovery] Error restoring jobs on startup:', err.message);
  }
}

/**
 * Seed Sample Data matching Figma UI screenshots if DB is empty
 */
async function seedInitialFigmaData() {
  try {
    const count = await prisma.emailLog.count();
    if (count > 0) return;

    console.log('[Seed] Seeding sample emails matching Figma design...');

    let demoUser = await prisma.user.findFirst({ where: { email: 'oliver.brown@domain.io' } });
    if (!demoUser) {
      demoUser = await prisma.user.create({
        data: {
          email: 'oliver.brown@domain.io',
          name: 'Oliver Brown',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
        },
      });
    }

    const parentJob = await prisma.scheduledJob.create({
      data: {
        userId: demoUser.id,
        senderEmail: 'oliver.brown@domain.io',
        subject: 'Figma Demo Campaign',
        body: 'Sample campaign content',
        status: 'SCHEDULED',
        scheduledTime: new Date(),
        delaySeconds: 2,
        hourlyLimit: 50,
        totalLeads: 4,
        sentCount: 2,
      },
    });

    const now = new Date();
    const tomorrowMorning = new Date(now.getTime() + 24 * 3600 * 1000);
    tomorrowMorning.setHours(9, 15, 12, 0);

    const tomorrowEvening = new Date(now.getTime() + 28 * 3600 * 1000);
    tomorrowEvening.setHours(20, 15, 12, 0);

    // Scheduled emails matching Image 2
    await prisma.emailLog.createMany({
      data: [
        {
          jobId: parentJob.id,
          userId: demoUser.id,
          sender: 'oliver.brown@domain.io',
          recipient: 'John Smith',
          subject: 'Meeting follow-up - Scheduled',
          body: 'Hi John, just wanted to follow up on our meeting...',
          status: 'SCHEDULED',
          scheduledFor: tomorrowMorning,
        },
        {
          jobId: parentJob.id,
          userId: demoUser.id,
          sender: 'oliver.brown@domain.io',
          recipient: 'Olive',
          subject: 'Ramit, great to meet you - you\'ll love it',
          body: 'Hi Olive, just wanted to follow up on our meeting...',
          status: 'SCHEDULED',
          scheduledFor: tomorrowEvening,
        },
        // Sent emails matching Image 3 & 4
        {
          jobId: parentJob.id,
          userId: demoUser.id,
          sender: 'Amanda Clark <sender@example.com>',
          recipient: 'oliver.brown@domain.io',
          subject: 'Oliver, hello there! | MJWYT44 BM#52W01',
          body: `Hey Oliver,

You've just RECEIVED something

⚡ Extremely Exclusive—Only 4 Spots Worldwide Per Year | $25,000 investment ⚡
To explore securing your private transformation, simply reply right now with "FLY OUT FIX".

Your coach for world-class performance,

Grant

P.S. Always remember that you can develop world class technique! 🚀`,
          status: 'SENT',
          scheduledFor: new Date(now.getTime() - 2 * 3600 * 1000),
          sentAt: new Date(now.getTime() - 2 * 3600 * 1000),
          etherealPreviewUrl: 'https://ethereal.email',
        },
        {
          jobId: parentJob.id,
          userId: demoUser.id,
          sender: 'oliver.brown@domain.io',
          recipient: 'Sarah Wilson',
          subject: 'Re: Project Update',
          body: 'Thanks for the update, Sarah. Looks good!',
          status: 'SENT',
          scheduledFor: new Date(now.getTime() - 5 * 3600 * 1000),
          sentAt: new Date(now.getTime() - 5 * 3600 * 1000),
          etherealPreviewUrl: 'https://ethereal.email',
        },
        {
          jobId: parentJob.id,
          userId: demoUser.id,
          sender: 'oliver.brown@domain.io',
          recipient: 'Support',
          subject: 'Issue with login',
          body: 'I am having trouble logging in to the dashboard...',
          status: 'SENT',
          scheduledFor: new Date(now.getTime() - 8 * 3600 * 1000),
          sentAt: new Date(now.getTime() - 8 * 3600 * 1000),
          etherealPreviewUrl: 'https://ethereal.email',
        },
      ],
    });

    console.log('[Seed] Sample Figma data seeded successfully!');
  } catch (err: any) {
    console.error('[Seed] Error seeding sample data:', err.message);
  }
}

// Start Server and BullMQ Worker
app.listen(config.port, async () => {
  console.log(`==================================================`);
  console.log(`🚀 ReachInbox Email Scheduler API running on port ${config.port}`);
  console.log(`📊 BullMQ Queue Board: http://localhost:${config.port}/admin/queues`);
  console.log(`==================================================`);

  await seedInitialFigmaData();
  await recoverPendingJobsOnStartup();
  startWorker();
});
