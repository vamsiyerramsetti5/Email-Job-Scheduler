import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config.js';

export const QUEUE_NAME = 'email-queue';

export const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
});

redisConnection.on('error', (err) => {
  console.error('[BullMQ Redis Connection Error]:', err.message);
});

export const emailQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // keep for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep failed for 7 days
    },
  },
});
