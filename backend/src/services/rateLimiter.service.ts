import Redis from 'ioredis';
import { config } from '../config.js';

class RateLimiterService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null,
    });

    this.redis.on('error', (err) => {
      console.error('[RateLimiterService] Redis Error:', err.message);
    });
  }

  /**
   * Helper to get the current hourly window string (YYYYMMDDHH)
   */
  private getHourlyKey(date: Date = new Date()): string {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const hh = String(date.getUTCHours()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}`;
  }

  /**
   * Helper to calculate the start timestamp of the next hourly window
   */
  public getNextHourStart(date: Date = new Date()): Date {
    const nextHour = new Date(date);
    nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
    return nextHour;
  }

  /**
   * Check and increment the rate limit count in Redis atomically
   */
  async checkAndIncrement(
    senderEmail: string,
    limit: number
  ): Promise<{
    allowed: boolean;
    currentCount: number;
    nextWindowStart: Date;
    delayMs: number;
  }> {
    const now = new Date();
    const hourKey = this.getHourlyKey(now);
    const redisKey = `email_rate:${senderEmail.toLowerCase()}:${hourKey}`;

    // Redis Multi/Pipeline for atomic INCR + EXPIRE
    const pipeline = this.redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.expire(redisKey, 7200); // Expire after 2 hours
    const results = await pipeline.exec();

    const currentCount = (results?.[0]?.[1] as number) || 1;
    const nextWindowStart = this.getNextHourStart(now);
    const delayMs = nextWindowStart.getTime() - now.getTime();

    if (currentCount > limit) {
      console.warn(
        `[RateLimiterService] SENDER LIMIT HIT! Sender: ${senderEmail}, Count: ${currentCount}/${limit}. Rescheduling in ${Math.round(
          delayMs / 1000
        )}s`
      );
      return {
        allowed: false,
        currentCount,
        nextWindowStart,
        delayMs,
      };
    }

    return {
      allowed: true,
      currentCount,
      nextWindowStart,
      delayMs: 0,
    };
  }

  /**
   * Get current rate stats for a sender
   */
  async getSenderStats(senderEmail: string, limit: number): Promise<{
    currentCount: number;
    limit: number;
    resetInSeconds: number;
  }> {
    const now = new Date();
    const hourKey = this.getHourlyKey(now);
    const redisKey = `email_rate:${senderEmail.toLowerCase()}:${hourKey}`;

    const countStr = await this.redis.get(redisKey);
    const currentCount = countStr ? parseInt(countStr, 10) : 0;

    const nextWindowStart = this.getNextHourStart(now);
    const resetInSeconds = Math.max(0, Math.round((nextWindowStart.getTime() - now.getTime()) / 1000));

    return {
      currentCount,
      limit,
      resetInSeconds,
    };
  }
}

export const rateLimiterService = new RateLimiterService();
