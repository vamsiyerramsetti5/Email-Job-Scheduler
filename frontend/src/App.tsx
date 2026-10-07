import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { ScheduledList } from './components/ScheduledList';
import { SentList } from './components/SentList';
import { EmailDetail } from './components/EmailDetail';
import { ComposeModal } from './components/ComposeModal';
import { LoginModal } from './components/LoginModal';
import { SlackConnectModal } from './components/SlackConnectModal';
import { emailApi, statsApi, slackApi } from './services/api';
import { EmailItem } from './types/email';

export const AppContent: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [scheduledEmails, setScheduledEmails] = useState<EmailItem[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailItem[]>([]);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [slackConnected, setSlackConnected] = useState(false);

  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [showSlackModal, setShowSlackModal] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setIsLoadingEmails(true);
    try {
      // Fetch stats
      const statsRes = await statsApi.getStats();
      setScheduledCount(statsRes.scheduledCount);
      setSentCount(statsRes.sentCount);

      // Fetch Slack status
      const slackRes = await slackApi.getStatus();
      setSlackConnected(slackRes.isConnected);

      // Fetch list based on active tab
      if (activeTab === 'scheduled') {
        const res = await emailApi.getScheduled();
        setScheduledEmails(res.emails);
      } else {
        const res = await emailApi.getSent();
        setSentEmails(res.emails);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  // Perform Elasticsearch query when searchQuery changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      loadData();
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await emailApi.search(searchQuery, activeTab === 'scheduled' ? 'SCHEDULED' : 'SENT');
        if (activeTab === 'scheduled') {
          setScheduledEmails(res.emails);
        } else {
          setSentEmails(res.emails);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  useEffect(() => {
    if (user && !searchQuery) {
      loadData();
    }
  }, [user, activeTab]);

  // Polling to keep queue stats & email list live
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (!searchQuery) {
        loadData();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [user, activeTab, searchQuery]);

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <div className="w-10 h-10 border-4 border-[#00B050] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-medium">Initializing ReachInbox Email Scheduler...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginModal />;
  }

  return (
    <div className="flex h-screen w-screen bg-[#F9FAFB] overflow-hidden select-none">
      {/* Sidebar Navigation (Matching Figma Images) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedEmail(null);
        }}
        scheduledCount={scheduledCount}
        sentCount={sentCount}
        onOpenCompose={() => setShowCompose(true)}
        onOpenSlack={() => setShowSlackModal(true)}
        slackConnected={slackConnected}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {selectedEmail ? (
          /* Detailed Email View (Matching Figma Image 4) */
          <EmailDetail
            email={selectedEmail}
            onBack={() => setSelectedEmail(null)}
          />
        ) : (
          /* Main Dashboard List View (Matching Figma Images 2 & 3) */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <Navbar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onRefresh={loadData}
              isSearching={isSearching}
            />

            {activeTab === 'scheduled' ? (
              <ScheduledList
                emails={scheduledEmails}
                isLoading={isLoadingEmails}
                onSelectEmail={(email) => setSelectedEmail(email)}
              />
            ) : (
              <SentList
                emails={sentEmails}
                isLoading={isLoadingEmails}
                onSelectEmail={(email) => setSelectedEmail(email)}
              />
            )}
          </div>
        )}
      </main>

      {/* Compose Email Modal (Matching Figma Image 5) */}
      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onSuccess={loadData}
        />
      )}

      {/* Slack Integration Modal */}
      {showSlackModal && (
        <SlackConnectModal
          onClose={() => setShowSlackModal(false)}
          onStatusChange={loadData}
        />
      )}
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
