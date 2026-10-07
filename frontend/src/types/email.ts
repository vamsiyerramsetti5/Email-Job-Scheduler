export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  slackConnected?: boolean;
  slackChannel?: string | null;
}

export interface EmailItem {
  id: string;
  jobId: string;
  userId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  status: 'SCHEDULED' | 'SENT' | 'FAILED' | 'DELAYED_RATE_LIMIT';
  scheduledFor: string;
  sentAt?: string | null;
  etherealPreviewUrl?: string | null;
  messageId?: string | null;
  error?: string | null;
  createdAt: string;
}

export interface SchedulePayload {
  senderEmail: string;
  recipients: string[];
  subject: string;
  body: string;
  scheduledTime?: string;
  delaySeconds: number;
  hourlyLimit: number;
}

export interface StatsResponse {
  scheduledCount: number;
  sentCount: number;
  rateLimit: {
    currentCount: number;
    limit: number;
    resetInSeconds: number;
  };
}
