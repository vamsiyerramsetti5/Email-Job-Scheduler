import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Send,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Code,
  FileSpreadsheet,
  X,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { emailApi } from '../services/api';
import { SendLaterPopover } from './SendLaterPopover';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

interface ComposeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [fromEmail, setFromEmail] = useState(user?.email || 'oliver.brown@domain.io');
  const [toInput, setToInput] = useState('');
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [showSendLater, setShowSendLater] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csvStatus, setCsvStatus] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Handle Any File Attachment (Paperclip Icon)
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setAttachedFiles((prev) => [...prev, ...newFiles]);
    if (e.target) e.target.value = '';
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Handle Lead CSV / Text Upload
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCsvStatus(`Parsing "${file.name}"...`);
      const res = await emailApi.parseCsv(file);
      setParsedEmails(res.emails);
      if (res.emails.length > 0) {
        setToInput(res.emails.join(', '));
        setCsvStatus(`✅ Successfully loaded ${res.totalDetected} lead email addresses from "${file.name}"!`);
      } else {
        setCsvStatus(`⚠️ Could not parse lead emails from "${file.name}". Please check file format.`);
      }
    } catch (err: any) {
      setCsvStatus(`❌ Parse failed: ${err.message}`);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleSend = async () => {
    let finalRecipients: string[] = [];

    if (parsedEmails.length > 0) {
      finalRecipients = parsedEmails;
    } else if (toInput) {
      finalRecipients = toInput
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
    }

    if (finalRecipients.length === 0) {
      alert('Please enter at least one recipient email or upload a lead file.');
      return;
    }

    if (!subject || !body) {
      alert('Subject and Body are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await emailApi.schedule({
        senderEmail: fromEmail,
        recipients: finalRecipients,
        subject,
        body,
        scheduledTime: scheduledTime ? scheduledTime.toISOString() : undefined,
        delaySeconds,
        hourlyLimit,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Error scheduling email: ${err?.response?.data?.error || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col h-[90vh] overflow-hidden">
        {/* Top Header Bar (Matching Figma Image 5) */}
        <div className="h-16 px-6 border-b border-gray-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-gray-900">Compose New Email</h2>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Paperclip Icon for Any File Format Attachment */}
            <button
              onClick={() => attachmentInputRef.current?.click()}
              title="Attach File (Any Format: PDF, PNG, DOC, ZIP, CSV, etc.)"
              className={`p-2 rounded-full transition-colors ${
                attachedFiles.length > 0
                  ? 'text-brand-600 bg-emerald-50 border border-emerald-200'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Hidden Input for Attachments (Accepts Any File Format!) */}
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              onChange={handleAttachmentUpload}
              className="hidden"
            />

            {/* Hidden Input for CSV Lead Email Upload */}
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,.txt,.xlsx"
              onChange={handleCsvUpload}
              className="hidden"
            />

            {/* Schedule Clock Button */}
            <button
              onClick={() => setShowSendLater(!showSendLater)}
              title="Schedule Send Later"
              className={`p-2 rounded-full transition-colors ${
                scheduledTime
                  ? 'text-brand-600 bg-emerald-50 border border-emerald-200'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* Send Later Popover */}
            {showSendLater && (
              <SendLaterPopover
                onSelectTime={(date) => setScheduledTime(date)}
                onClose={() => setShowSendLater(false)}
              />
            )}

            {/* Green Send / Schedule Button */}
            <button
              onClick={handleSend}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 rounded-full border border-[#00B050] text-[#00B050] hover:bg-[#E8F8EE] font-semibold text-xs transition-all shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Scheduling...' : scheduledTime ? 'Schedule' : 'Send'}</span>
            </button>
          </div>
        </div>

        {/* Input Form Fields Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Scheduled Indicator Banner */}
          {scheduledTime && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-2 font-medium">
                <Clock className="w-4 h-4 text-brand-600" />
                <span>Scheduled to start sending on: <strong>{format(scheduledTime, 'PPpp')}</strong></span>
              </div>
              <button
                onClick={() => setScheduledTime(null)}
                className="text-emerald-600 hover:text-emerald-900 underline font-semibold"
              >
                Clear
              </button>
            </div>
          )}

          {/* From Selector Row */}
          <div className="flex items-center gap-4 py-2 border-b border-gray-100">
            <span className="w-16 text-xs font-medium text-gray-500 shrink-0">From</span>
            <div className="relative inline-block">
              <select
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="appearance-none bg-[#F4F5F7] hover:bg-gray-200/60 px-3 py-1.5 pr-8 rounded-xl text-xs font-semibold text-gray-800 border border-transparent focus:outline-none cursor-pointer"
              >
                <option value={user?.email || 'oliver.brown@domain.io'}>
                  {user?.email || 'oliver.brown@domain.io'}
                </option>
                <option value="sender@example.com">sender@example.com</option>
                <option value="campaigns@domain.io">campaigns@domain.io</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* To Input Row & Lead CSV Uploader */}
          <div className="flex items-center gap-4 py-2 border-b border-gray-100">
            <span className="w-16 text-xs font-medium text-gray-500 shrink-0">To</span>
            <div className="flex-1 flex items-center gap-3">
              <input
                type="text"
                placeholder={
                  parsedEmails.length > 0
                    ? `${parsedEmails.length} lead emails loaded`
                    : 'recipient@example.com or upload CSV lead file'
                }
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                className="w-full text-xs text-gray-800 placeholder-gray-400 outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium shrink-0 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Upload CSV</span>
              </button>
            </div>
          </div>

          {csvStatus && (
            <div className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center justify-between">
              <span>{csvStatus}</span>
              <button onClick={() => setCsvStatus(null)} className="text-emerald-500 hover:text-emerald-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Subject Input Row */}
          <div className="flex items-center gap-4 py-2 border-b border-gray-100">
            <span className="w-16 text-xs font-medium text-gray-500 shrink-0">Subject</span>
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs text-gray-800 placeholder-gray-400 outline-none bg-transparent"
            />
          </div>

          {/* Attached Files Chips Section */}
          {attachedFiles.length > 0 && (
            <div className="py-2 border-b border-gray-100">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Attached Files ({attachedFiles.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-xl border border-gray-200 text-xs text-gray-800 font-medium"
                  >
                    <FileText className="w-3.5 h-3.5 text-brand-600" />
                    <span className="truncate max-w-xs">{file.name}</span>
                    <span className="text-[10px] text-gray-400">({formatFileSize(file.size)})</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="p-0.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rate Limit Controls Row (Matching Figma Image 5) */}
          <div className="flex items-center gap-6 py-2 border-b border-gray-100 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-500">Delay between 2 emails</span>
              <input
                type="number"
                min="0"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 0)}
                className="w-16 px-3 py-1 bg-[#F4F5F7] border border-gray-200 rounded-xl text-center text-xs font-semibold text-gray-800 outline-none"
              />
              <span className="text-gray-400 text-[11px]">sec</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-500">Hourly Limit</span>
              <input
                type="number"
                min="1"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 50)}
                className="w-16 px-3 py-1 bg-[#F4F5F7] border border-gray-200 rounded-xl text-center text-xs font-semibold text-gray-800 outline-none"
              />
              <span className="text-gray-400 text-[11px]">emails/hr</span>
            </div>
          </div>

          {/* Formatting Toolbar (Matching Figma Image 5) */}
          <div className="bg-[#F8F9FA] p-2 rounded-xl border border-gray-200 flex flex-wrap items-center gap-1 text-gray-500">
            <button type="button" className="p-1.5 hover:bg-white rounded hover:text-gray-800"><Undo className="w-3.5 h-3.5" /></button>
            <button type="button" className="p-1.5 hover:bg-white rounded hover:text-gray-800"><Redo className="w-3.5 h-3.5" /></button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <span className="text-xs font-serif px-2 cursor-pointer hover:bg-white rounded">Tt</span>
            <button type="button" className="p-1.5 hover:bg-white rounded hover:text-gray-800"><Bold className="w-3.5 h-3.5" /></button>
            <button type="button" className="p-1.5 hover:bg-white rounded hover:text-gray-800"><Italic className="w-3.5 h-3.5" /></button>
            <button type="button" className="p-1.5 hover:bg-white rounded hover:text-gray-800"><Underline className="w-3.5 h-3.5" /></button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button type="button" className="p-1.5 hover:bg-white rounded hover:text-gray-800"><List className="w-3.5 h-3.5" /></button>
            <button type="button" className="p-1.5 hover:bg-white rounded hover:text-gray-800"><ListOrdered className="w-3.5 h-3.5" /></button>
            <button type="button" className="p-1.5 hover:bg-white rounded hover:text-gray-800"><Quote className="w-3.5 h-3.5" /></button>
            <button type="button" className="p-1.5 hover:bg-white rounded hover:text-gray-800"><Code className="w-3.5 h-3.5" /></button>
          </div>

          {/* Rich Body Text Area */}
          <textarea
            rows={10}
            placeholder="Type Your Reply..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full p-4 text-xs text-gray-800 placeholder-gray-400 outline-none resize-none bg-transparent"
          />
        </div>
      </div>
    </div>
  );
};
