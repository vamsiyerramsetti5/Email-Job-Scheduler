import React from 'react';
import { Clock, Star, AlertCircle } from 'lucide-react';
import { EmailItem } from '../types/email';
import { format } from 'date-fns';

interface ScheduledListProps {
  emails: EmailItem[];
  isLoading: boolean;
  onSelectEmail: (email: EmailItem) => void;
}

export const ScheduledList: React.FC<ScheduledListProps> = ({
  emails,
  isLoading,
  onSelectEmail,
}) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-400">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs">Loading scheduled emails...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-3">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">No Scheduled Emails</h3>
        <p className="text-xs text-gray-500 max-w-sm">
          You don't have any upcoming scheduled emails. Click "Compose" to schedule a new email campaign.
        </p>
      </div>
    );
  }

  const formatScheduledBadge = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return format(d, 'EEE h:mm:ss a'); // e.g. Tue 9:15:12 AM
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
      {emails.map((email) => {
        const isDelayed = email.status === 'DELAYED_RATE_LIMIT';

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

              {/* Schedule Orange Pill Badge (Matching Figma Image 2) */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${
                  isDelayed
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-[#FEF3C7] text-[#D97706]'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>{formatScheduledBadge(email.scheduledFor)}</span>
                {isDelayed && (
                  <span className="text-[10px] font-bold bg-amber-200 px-1 rounded">
                    Rate Limited
                  </span>
                )}
              </div>

              {/* Subject & Body Snippet */}
              <div className="min-w-0 flex-1 truncate text-xs">
                <span className="font-semibold text-gray-900">{email.subject}</span>
                <span className="text-gray-400 mx-1.5">-</span>
                <span className="text-gray-500 font-normal truncate">{email.body}</span>
              </div>
            </div>

            {/* Actions / Star */}
            <div className="flex items-center gap-3 shrink-0 text-gray-300 group-hover:text-gray-400">
              {isDelayed && (
                <span title="Rescheduled due to hourly rate limit" className="text-amber-500">
                  <AlertCircle className="w-4 h-4" />
                </span>
              )}
              <Star className="w-4 h-4 hover:text-amber-400 transition-colors" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
