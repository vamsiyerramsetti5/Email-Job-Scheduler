import React from 'react';
import { Send, Star, ExternalLink, AlertTriangle } from 'lucide-react';
import { EmailItem } from '../types/email';

interface SentListProps {
  emails: EmailItem[];
  isLoading: boolean;
  onSelectEmail: (email: EmailItem) => void;
}

export const SentList: React.FC<SentListProps> = ({
  emails,
  isLoading,
  onSelectEmail,
}) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-400">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs">Loading sent emails...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-3">
          <Send className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">No Sent Emails Yet</h3>
        <p className="text-xs text-gray-500 max-w-sm">
          Emails will appear here once they are successfully dispatched via Ethereal fake SMTP.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
      {emails.map((email) => {
        const isFailed = email.status === 'FAILED';

        return (
          <div
            key={email.id}
            onClick={() => onSelectEmail(email)}
            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/80 cursor-pointer transition-colors group"
          >
            {/* Recipient & Subject & Body Preview */}
            <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
              {/* Recipient Name */}
              <div className="w-36 font-semibold text-xs text-gray-900 truncate shrink-0">
                To: {email.recipient}
              </div>

              {/* Sent Grey Pill Badge (Matching Figma Image 3) */}
              <div
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${
                  isFailed
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-[#F3F4F6] text-[#4B5563]'
                }`}
              >
                <span>{isFailed ? 'Failed' : 'Sent'}</span>
              </div>

              {/* Subject & Body Snippet */}
              <div className="min-w-0 flex-1 truncate text-xs">
                <span className="font-semibold text-gray-900">{email.subject}</span>
                <span className="text-gray-400 mx-1.5">-</span>
                <span className="text-gray-500 font-normal truncate">{email.body}</span>
              </div>
            </div>

            {/* Actions / Ethereal Link / Star */}
            <div className="flex items-center gap-3 shrink-0 text-gray-400">
              {email.etherealPreviewUrl && (
                <a
                  href={email.etherealPreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="View fake SMTP preview on Ethereal Email"
                  className="text-[11px] text-brand-600 hover:underline flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100"
                >
                  <span>Preview</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {isFailed && (
                <span title={email.error || 'Failed to send email'} className="text-rose-500">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              )}
              <Star className="w-4 h-4 text-gray-300 group-hover:text-gray-400 hover:text-amber-400 transition-colors" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
