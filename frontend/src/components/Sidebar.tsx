import React, { useState } from 'react';
import { Clock, Send, Plus, ChevronDown, LogOut, Slack, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: 'scheduled' | 'sent';
  setActiveTab: (tab: 'scheduled' | 'sent') => void;
  scheduledCount: number;
  sentCount: number;
  onOpenCompose: () => void;
  onOpenSlack: () => void;
  slackConnected?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  scheduledCount,
  sentCount,
  onOpenCompose,
  onOpenSlack,
  slackConnected = false,
}) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between shrink-0 h-screen select-none">
      <div className="p-4 space-y-6">
        {/* App Logo - ONE ReachInbox */}
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="bg-[#00B050] text-white font-extrabold text-sm px-2 py-0.5 rounded tracking-tighter">
            ONE
          </div>
          <span className="font-bold text-gray-900 text-lg tracking-tight">ReachInbox</span>
        </div>

        {/* User Card Header */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center justify-between p-2 rounded-xl border border-gray-200 hover:border-gray-300 bg-gray-50/50 hover:bg-gray-100/50 transition-all text-left"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256'}
                alt={user?.name}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200"
              />
              <div className="truncate">
                <div className="text-xs font-semibold text-gray-900 truncate">{user?.name || 'Oliver Brown'}</div>
                <div className="text-[11px] text-gray-500 truncate">{user?.email || 'oliver.brown@domain.io'}</div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
                Logged in as <span className="font-semibold text-gray-700">{user?.email}</span>
              </div>
              <a
                href="/admin/queues"
                target="_blank"
                rel="noreferrer"
                className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Activity className="w-3.5 h-3.5 text-brand-600" />
                Live Queue Dashboard
              </a>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Primary Compose Button */}
        <button
          onClick={onOpenCompose}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full border border-[#00B050] text-[#00B050] hover:bg-[#E8F8EE] font-medium transition-all text-sm shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Compose</span>
        </button>

        {/* CORE Navigation */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            CORE
          </div>

          {/* Scheduled Tab */}
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
              activeTab === 'scheduled'
                ? 'bg-[#E8F8EE] text-[#008A3E]'
                : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4" />
              <span>Scheduled</span>
            </div>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                activeTab === 'scheduled' ? 'bg-[#D2F2DC] text-[#007A37]' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {scheduledCount}
            </span>
          </button>

          {/* Sent Tab */}
          <button
            onClick={() => setActiveTab('sent')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
              activeTab === 'sent'
                ? 'bg-[#E8F8EE] text-[#008A3E]'
                : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Send className="w-4 h-4" />
              <span>Sent</span>
            </div>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                activeTab === 'sent' ? 'bg-[#D2F2DC] text-[#007A37]' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {sentCount}
            </span>
          </button>
        </div>
      </div>

      {/* Footer Slack & Queue Links */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <button
          onClick={onOpenSlack}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all ${
            slackConnected
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Slack className="w-4 h-4 text-[#E01E5A]" />
            <span>{slackConnected ? 'Slack Connected' : 'Connect Slack'}</span>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${slackConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}
          />
        </button>

        <a
          href="/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-gray-500 hover:text-brand-600 transition-colors"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>BullMQ Live Board</span>
        </a>
      </div>
    </aside>
  );
};
