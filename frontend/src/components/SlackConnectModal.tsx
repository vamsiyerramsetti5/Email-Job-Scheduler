import React, { useState, useEffect } from 'react';
import { X, Slack, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { slackApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface SlackConnectModalProps {
  onClose: () => void;
  onStatusChange: () => void;
}

export const SlackConnectModal: React.FC<SlackConnectModalProps> = ({
  onClose,
  onStatusChange,
}) => {
  const { refreshUser } = useAuth();
  const [tab, setTab] = useState<'webhook' | 'oauth'>('webhook');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [botToken, setBotToken] = useState('');
  const [channel, setChannel] = useState('#email-alerts');
  const [isConnected, setIsConnected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    slackApi.getStatus().then((res) => {
      setIsConnected(res.isConnected);
      if (res.channel) setChannel(res.channel);
    });
  }, []);

  const handleConnectWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await slackApi.connectWebhook(webhookUrl, channel);
      setMessage({ type: 'success', text: res.message });
      setIsConnected(true);
      await refreshUser();
      onStatusChange();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectOAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await slackApi.connectOAuth(botToken, channel);
      setMessage({ type: 'success', text: res.message });
      setIsConnected(true);
      await refreshUser();
      onStatusChange();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestSlack = async () => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await slackApi.sendTest();
      if (res.success) {
        setMessage({ type: 'success', text: `Test Alert Sent: ${res.message}` });
      } else {
        setMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsSubmitting(true);
    try {
      await slackApi.disconnect();
      setIsConnected(false);
      setMessage({ type: 'success', text: 'Slack disconnected cleanly.' });
      await refreshUser();
      onStatusChange();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-200 p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#ECB22E]/10 rounded-2xl flex items-center justify-center text-[#E01E5A]">
            <Slack className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Connect Slack Alerts</h3>
            <p className="text-xs text-gray-500">Receive live Slack alerts whenever rate limits are hit</p>
          </div>
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            className={`p-4 rounded-2xl mb-6 text-xs flex items-center gap-2.5 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Status indicator */}
        {isConnected ? (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <div>
                  <div className="text-xs font-bold text-emerald-900">Slack is Connected</div>
                  <div className="text-[11px] text-emerald-700">Channel: {channel}</div>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={isSubmitting}
                className="text-xs text-rose-600 hover:underline font-semibold"
              >
                Disconnect
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleTestSlack}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-all shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Test Live Slack Alert</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Tabs for Webhook vs OAuth */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => setTab('webhook')}
                className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center transition-all ${
                  tab === 'webhook'
                    ? 'border-[#00B050] text-[#00B050]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Slack Webhook URL
              </button>
              <button
                onClick={() => setTab('oauth')}
                className={`flex-1 py-2.5 text-xs font-semibold border-b-2 text-center transition-all ${
                  tab === 'oauth'
                    ? 'border-[#00B050] text-[#00B050]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Slack OAuth Bot Token
              </button>
            </div>

            {tab === 'webhook' ? (
              <form onSubmit={handleConnectWebhook} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Slack Incoming Webhook URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:outline-none text-xs text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:outline-none text-xs text-gray-800"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-[#00B050] hover:bg-[#009643] text-white font-semibold text-xs transition-all shadow-sm mt-2"
                >
                  {isSubmitting ? 'Connecting...' : 'Connect Slack Webhook'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConnectOAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Slack Bot OAuth Token (xoxb-...)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="xoxb-your-slack-bot-token"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:outline-none text-xs text-gray-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Target Channel
                  </label>
                  <input
                    type="text"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-500 focus:outline-none text-xs text-gray-800"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-[#00B050] hover:bg-[#009643] text-white font-semibold text-xs transition-all shadow-sm mt-2"
                >
                  {isSubmitting ? 'Connecting...' : 'Connect Slack OAuth'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
