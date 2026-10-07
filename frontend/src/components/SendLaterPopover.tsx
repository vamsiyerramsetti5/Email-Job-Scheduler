import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { addDays, setHours, setMinutes, format } from 'date-fns';

interface SendLaterPopoverProps {
  onSelectTime: (date: Date) => void;
  onClose: () => void;
}

export const SendLaterPopover: React.FC<SendLaterPopoverProps> = ({
  onSelectTime,
  onClose,
}) => {
  const [customDateTime, setCustomDateTime] = useState('');

  const getPreset = (type: 'tomorrow' | '10am' | '11am' | '3pm') => {
    const tomorrow = addDays(new Date(), 1);
    switch (type) {
      case 'tomorrow':
        return setMinutes(setHours(tomorrow, 9), 0);
      case '10am':
        return setMinutes(setHours(tomorrow, 10), 0);
      case '11am':
        return setMinutes(setHours(tomorrow, 11), 0);
      case '3pm':
        return setMinutes(setHours(tomorrow, 15), 0);
    }
  };

  const handleSelectPreset = (date: Date) => {
    onSelectTime(date);
    onClose();
  };

  const handleDoneCustom = () => {
    if (customDateTime) {
      onSelectTime(new Date(customDateTime));
    } else {
      onSelectTime(getPreset('tomorrow'));
    }
    onClose();
  };

  return (
    <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 z-50 animate-in fade-in zoom-in-95 duration-150">
      <h4 className="text-xs font-bold text-gray-900 mb-3">Send Later</h4>

      {/* Date & Time Input */}
      <div className="relative mb-4">
        <input
          type="datetime-local"
          value={customDateTime}
          onChange={(e) => setCustomDateTime(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-800 focus:border-brand-500 focus:outline-none bg-gray-50/50"
        />
      </div>

      {/* Presets List */}
      <div className="space-y-1 mb-6 border-t border-b border-gray-100 py-2">
        <button
          onClick={() => handleSelectPreset(getPreset('tomorrow'))}
          type="button"
          className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-700 hover:bg-emerald-50 hover:text-brand-700 font-medium transition-colors"
        >
          Tomorrow
        </button>
        <button
          onClick={() => handleSelectPreset(getPreset('10am'))}
          type="button"
          className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-700 hover:bg-emerald-50 hover:text-brand-700 transition-colors"
        >
          Tomorrow, 10:00 AM
        </button>
        <button
          onClick={() => handleSelectPreset(getPreset('11am'))}
          type="button"
          className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-700 hover:bg-emerald-50 hover:text-brand-700 transition-colors"
        >
          Tomorrow, 11:00 AM
        </button>
        <button
          onClick={() => handleSelectPreset(getPreset('3pm'))}
          type="button"
          className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-700 hover:bg-emerald-50 hover:text-brand-700 transition-colors"
        >
          Tomorrow, 3:00 PM
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onClose}
          type="button"
          className="text-xs text-gray-500 hover:text-gray-800 font-medium px-2 py-1"
        >
          Cancel
        </button>
        <button
          onClick={handleDoneCustom}
          type="button"
          className="px-4 py-1.5 rounded-full border border-[#00B050] text-[#00B050] hover:bg-[#E8F8EE] text-xs font-semibold transition-all shadow-xs"
        >
          Done
        </button>
      </div>
    </div>
  );
};
