import axios from 'axios';
import { EmailItem, SchedulePayload, StatsResponse, User } from '../types/email';

const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
});

// Attach Authorization header if token exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('reachinbox_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  googleLogin: async (data: { email: string; name: string; avatar?: string; googleId?: string }) => {
    const res = await api.post<{ token: string; user: User }>('/auth/google', data);
    return res.data;
  },
  demoLogin: async () => {
    const res = await api.post<{ token: string; user: User }>('/auth/demo');
    return res.data;
  },
  getCurrentUser: async () => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
};

export const emailApi = {
  schedule: async (payload: SchedulePayload) => {
    const res = await api.post<{ message: string; jobId: string; totalScheduled: number }>('/emails/schedule', payload);
    return res.data;
  },
  parseCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ totalDetected: number; emails: string[] }>('/emails/parse-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getScheduled: async () => {
    const res = await api.get<{ count: number; emails: EmailItem[] }>('/emails/scheduled');
    return res.data;
  },
  getSent: async () => {
    const res = await api.get<{ count: number; emails: EmailItem[] }>('/emails/sent');
    return res.data;
  },
  getDetail: async (id: string) => {
    const res = await api.get<EmailItem>(`/emails/detail/${id}`);
    return res.data;
  },
  search: async (q: string, status?: string) => {
    const res = await api.get<{ count: number; emails: EmailItem[] }>('/emails/search', {
      params: { q, status },
    });
    return res.data;
  },
};

export const slackApi = {
  connectWebhook: async (webhookUrl: string, channel?: string) => {
    const res = await api.post('/slack/connect-webhook', { webhookUrl, channel });
    return res.data;
  },
  connectOAuth: async (botToken: string, channel?: string) => {
    const res = await api.post('/slack/connect-oauth', { botToken, channel });
    return res.data;
  },
  sendTest: async () => {
    const res = await api.post<{ success: boolean; message: string }>('/slack/test-notification');
    return res.data;
  },
  disconnect: async () => {
    const res = await api.post('/slack/disconnect');
    return res.data;
  },
  getStatus: async () => {
    const res = await api.get<{ isConnected: boolean; type: string; channel: string | null }>('/slack/status');
    return res.data;
  },
};

export const statsApi = {
  getStats: async () => {
    const res = await api.get<StatsResponse>('/stats');
    return res.data;
  },
};
