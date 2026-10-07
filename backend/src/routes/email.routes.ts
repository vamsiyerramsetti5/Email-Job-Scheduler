import { Router, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { prisma } from '../db/prisma.js';
import { emailQueue } from '../queue/queue.js';
import { authenticateUser, AuthRequest } from '../middleware/auth.middleware.js';
import { elasticsearchService } from '../services/elasticsearch.service.js';
import { EmailJobData } from '../queue/worker.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Schedule New Emails Endpoint
 */
router.post('/schedule', authenticateUser, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const {
      senderEmail,
      recipients, // array of email strings or single string
      subject,
      body,
      scheduledTime,
      delaySeconds = 2,
      hourlyLimit = 50,
    } = req.body;

    if (!recipients || (Array.isArray(recipients) && recipients.length === 0)) {
      return res.status(400).json({ error: 'Recipients list is required' });
    }

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and Body are required' });
    }

    const recipientList: string[] = Array.isArray(recipients)
      ? recipients.map((r: string) => r.trim()).filter(Boolean)
      : recipients
          .split(',')
          .map((r: string) => r.trim())
          .filter(Boolean);

    const fromSender = senderEmail || req.user!.email;
    const targetScheduledTime = scheduledTime ? new Date(scheduledTime) : new Date();

    // 1. Create Parent ScheduledJob in DB
    const parentJob = await prisma.scheduledJob.create({
      data: {
        userId,
        senderEmail: fromSender,
        subject,
        body,
        status: 'SCHEDULED',
        scheduledTime: targetScheduledTime,
        delaySeconds: Number(delaySeconds),
        hourlyLimit: Number(hourlyLimit),
        totalLeads: recipientList.length,
        sentCount: 0,
      },
    });

    const emailLogsToCreate = [];
    const now = Date.now();
    const startTime = Math.max(targetScheduledTime.getTime(), now);

    // 2. Prepare individual EmailLog records and BullMQ jobs
    for (let i = 0; i < recipientList.length; i++) {
      const recipient = recipientList[i];
      
      // Calculate schedule time with spacing
      const scheduledFor = new Date(startTime + i * Number(delaySeconds) * 1000);

      emailLogsToCreate.push({
        jobId: parentJob.id,
        userId,
        sender: fromSender,
        recipient,
        subject,
        body,
        status: 'SCHEDULED',
        scheduledFor,
      });
    }

    // Batch insert EmailLogs into Prisma DB
    const createdLogs = await prisma.$transaction(
      emailLogsToCreate.map((data) => prisma.emailLog.create({ data }))
    );

    // 3. Push to BullMQ Queue as Delayed Jobs
    for (let i = 0; i < createdLogs.length; i++) {
      const emailLog = createdLogs[i];
      const initialDelayMs = Math.max(0, emailLog.scheduledFor.getTime() - Date.now());

      const jobData: EmailJobData = {
        emailLogId: emailLog.id,
        jobId: parentJob.id,
        userId,
        sender: fromSender,
        recipient: emailLog.recipient,
        subject: emailLog.subject,
        body: emailLog.body,
        delaySeconds: Number(delaySeconds),
        hourlyLimit: Number(hourlyLimit),
      };

      await emailQueue.add(
        `send-email-${emailLog.id}`,
        jobData,
        {
          delay: initialDelayMs,
          jobId: `email-${emailLog.id}`, // Enforce unique BullMQ Job ID for idempotency!
        }
      );

      // Index initial scheduled email into Elasticsearch
      elasticsearchService.indexEmail(emailLog).catch(() => {});
    }

    console.log(
      `[EmailRoute] Scheduled ${createdLogs.length} emails for job ${parentJob.id} starting at ${targetScheduledTime.toISOString()}`
    );

    return res.status(201).json({
      message: 'Emails scheduled successfully',
      jobId: parentJob.id,
      totalScheduled: createdLogs.length,
      scheduledTime: targetScheduledTime,
    });
  } catch (err: any) {
    console.error('[EmailRoute] Schedule Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Parse CSV Leads Upload Endpoint
 */
router.post('/parse-csv', upload.single('file'), (req: AuthRequest, res: Response): any => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let matches: string[] = fileContent.match(emailRegex) || [];

    // Fallback: If no strict email matches found, extract valid words/tokens per line as lead addresses
    if (matches.length === 0) {
      const lines = fileContent.split(/[\r\n,;]+/);
      const extracted: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim().replace(/['"]/g, '');
        if (trimmed && !trimmed.toLowerCase().startsWith('email') && !trimmed.toLowerCase().startsWith('name')) {
          if (trimmed.includes('@')) {
            extracted.push(trimmed);
          } else {
            // Clean username token to form lead email address
            const sanitized = trimmed.toLowerCase().replace(/[^a-z0-9._-]/g, '');
            if (sanitized.length > 2) {
              extracted.push(`${sanitized}@example.com`);
            }
          }
        }
      }
      matches = extracted;
    }
    
    // Deduplicate emails
    const uniqueEmails = Array.from(new Set(matches));

    return res.json({
      totalDetected: uniqueEmails.length,
      emails: uniqueEmails,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Get Scheduled Emails Endpoint
 */
router.get('/scheduled', authenticateUser, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const scheduledEmails = await prisma.emailLog.findMany({
      where: {
        userId,
        status: { in: ['SCHEDULED', 'DELAYED_RATE_LIMIT'] },
      },
      orderBy: { scheduledFor: 'asc' },
    });

    const totalCount = await prisma.emailLog.count({
      where: {
        userId,
        status: { in: ['SCHEDULED', 'DELAYED_RATE_LIMIT'] },
      },
    });

    return res.json({
      count: totalCount,
      emails: scheduledEmails,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Get Sent Emails Endpoint
 */
router.get('/sent', authenticateUser, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const sentEmails = await prisma.emailLog.findMany({
      where: {
        userId,
        status: { in: ['SENT', 'FAILED'] },
      },
      orderBy: { sentAt: 'desc' },
    });

    const totalCount = await prisma.emailLog.count({
      where: {
        userId,
        status: 'SENT',
      },
    });

    return res.json({
      count: totalCount,
      emails: sentEmails,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Get Email Detail Endpoint
 */
router.get('/detail/:id', authenticateUser, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const email = await prisma.emailLog.findUnique({
      where: { id: req.params.id },
      include: { job: true, user: true },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    return res.json(email);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Elasticsearch Search Endpoint
 */
router.get('/search', authenticateUser, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const query = (req.query.q as string) || '';
    const status = (req.query.status as string) || undefined;

    const results = await elasticsearchService.searchEmails(query, status, userId);

    return res.json({
      query,
      status,
      count: results.length,
      emails: results,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
