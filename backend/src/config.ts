import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  elasticsearchUrl: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  jwtSecret: process.env.JWT_SECRET || 'reachinbox-super-secret-key-2026',
  concurrency: parseInt(process.env.CONCURRENCY || '5', 10),
  defaultMinDelaySeconds: parseInt(process.env.DEFAULT_MIN_DELAY_SECONDS || '2', 10),
  defaultMaxEmailsPerHour: parseInt(process.env.DEFAULT_MAX_EMAILS_PER_HOUR || '50', 10),
  slack: {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  }
};
