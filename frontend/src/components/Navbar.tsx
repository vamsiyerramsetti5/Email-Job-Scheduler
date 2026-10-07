import React from 'react';
import { Search, SlidersHorizontal, RotateCw } from 'lucide-react';

interface NavbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onRefresh: () => void;
  isSearching?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  setSearchQuery,
  onRefresh,
  isSearching = false,
}) => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between gap-4 shrink-0">
      {/* Search Input Bar (Elasticsearch Integrated) */}
      <div className="relative flex-1 max-w-xl">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search emails via Elasticsearch..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[#F4F5F7] border border-transparent focus:border-brand-500 focus:bg-white rounded-full text-xs text-gray-800 placeholder-gray-400 outline-none transition-all"
        />
        {isSearching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-brand-600 font-medium animate-pulse">
            Elasticsearch...
          </span>
        )}
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-2">
        <button
          title="Filter Options"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        <button
          onClick={onRefresh}
          title="Refresh Emails"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
