import React from 'react';
import { ArrowLeft, Star, Trash2, Archive, ExternalLink } from 'lucide-react';
import { EmailItem } from '../types/email';
import { format } from 'date-fns';

interface EmailDetailProps {
  email: EmailItem;
  onBack: () => void;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({ email, onBack }) => {
  const formattedDate = () => {
    try {
      const d = new Date(email.sentAt || email.scheduledFor);
      return format(d, 'MMM d, h:mm a'); // e.g. Nov 3, 10:23 AM
    } catch {
      return 'Nov 3, 10:23 AM';
    }
  };

  const senderName = email.sender.includes('<')
    ? email.sender.split('<')[0].trim()
    : email.sender;
  const initial = senderName.charAt(0).toUpperCase() || 'A';

  const isFigmaSampleEmail =
    email.subject.includes('Oliver, hello there') || email.subject.includes('MJWYT44');

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden h-full">
      {/* Top Bar Header (Matching Figma Image 4) */}
      <div className="h-16 px-6 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 min-w-0 pr-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-gray-900 truncate">
            {email.subject}{' '}
            {isFigmaSampleEmail && (
              <span className="text-gray-400 font-normal text-sm">| MJWYT44 BM#52W01</span>
            )}
          </h2>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {email.etherealPreviewUrl && (
            <a
              href={email.etherealPreviewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-all"
            >
              <span>Ethereal Preview</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button className="p-2 text-gray-400 hover:text-amber-500 rounded-full hover:bg-gray-100">
            <Star className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100">
            <Archive className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-rose-600 rounded-full hover:bg-gray-100">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Email Body Content Container */}
      <div className="flex-1 overflow-y-auto p-8 max-w-4xl">
        {/* Sender Info & Metadata Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            {/* Sender Initial Avatar */}
            <div className="w-10 h-10 rounded-full bg-[#00B050] text-white font-bold flex items-center justify-center text-base shrink-0 shadow-xs">
              {initial}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-sm">{senderName}</span>
                <span className="text-xs text-gray-400 font-mono">&lt;{email.sender}&gt;</span>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <span>to {email.recipient}</span>
                <span className="text-[10px] text-gray-400 font-mono">v</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-400 font-medium shrink-0">
            {formattedDate()}
          </div>
        </div>

        {/* Email Body Content */}
        <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed space-y-6">
          {isFigmaSampleEmail ? (
            <>
              <p className="text-gray-700">Hey Oliver,</p>
              <p className="text-gray-700">You've just RECEIVED something</p>

              {/* Yellow Highlighted Callout Box */}
              <div className="bg-[#FEFCE8] border-l-4 border-[#FACC15] p-4 rounded-r-xl my-4 text-gray-800 text-xs sm:text-sm font-medium space-y-1">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <span>⚡</span>
                  <span>Extremely Exclusive—Only 4 Spots Worldwide Per Year | $25,000 investment</span>
                  <span>⚡</span>
                </div>
                <div className="text-amber-800 text-xs">
                  To explore securing your private transformation, simply reply right now with{' '}
                  <strong className="underline">"FLY OUT FIX"</strong>.
                </div>
              </div>

              <div className="whitespace-pre-wrap text-gray-800 font-sans text-sm">
                {email.body}
              </div>

              <div className="space-y-1 pt-4 text-gray-700">
                <p>Your coach for world-class performance,</p>
                <p className="font-semibold text-gray-900">Grant</p>
              </div>

              <p className="italic text-gray-500 text-xs pt-2">
                P.S. Always remember that you can develop world class technique! 🚀
              </p>

              {/* Sample Attachments */}
              <div className="pt-8 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Attachments (2)
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="w-48 bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden group cursor-pointer hover:shadow-md transition-all">
                    <div className="h-28 bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white relative">
                      <span className="text-3xl">🎾</span>
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                    </div>
                    <div className="p-3">
                      <div className="text-xs font-medium text-gray-800 truncate">Tennis_Coach_Profile.png</div>
                      <div className="text-[10px] text-gray-400">1.2 MB</div>
                    </div>
                  </div>

                  <div className="w-48 bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden group cursor-pointer hover:shadow-md transition-all">
                    <div className="h-28 bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white relative">
                      <span className="text-3xl">🏆</span>
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                    </div>
                    <div className="p-3">
                      <div className="text-xs font-medium text-gray-800 truncate">Tennis_Coach_Profile2.png</div>
                      <div className="text-[10px] text-gray-400">1.2 MB</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Standard User-Composed Email Body */
            <div className="whitespace-pre-wrap text-gray-800 font-sans text-sm leading-relaxed">
              {email.body}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
