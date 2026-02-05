'use client';

import { useState } from 'react';
import { Search, Filter, X, Sparkles } from 'lucide-react';

interface DeviceFiltersProps {
  onSearch: (query: string) => void;
  onStatusFilter: (status: 'all' | 'online' | 'offline') => void;
  onIdentifyAll: () => void;
  identifyingAll: boolean;
}

export default function DeviceFilters({ 
  onSearch, 
  onStatusFilter, 
  onIdentifyAll,
  identifyingAll 
}: DeviceFiltersProps) {
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<'all' | 'online' | 'offline'>('all');

  const handleSearch = (value: string) => {
    setSearch(value);
    onSearch(value);
  };

  const handleStatusChange = (status: 'all' | 'online' | 'offline') => {
    setActiveStatus(status);
    onStatusFilter(status);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-gray-700 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cerca per IP, hostname o MAC..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
          {search && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Status:
          </span>
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            {(['all', 'online', 'offline'] as const).map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeStatus === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {status === 'all' ? 'Tutti' : status === 'online' ? 'Online' : 'Offline'}
              </button>
            ))}
          </div>
        </div>

        {/* AI Identify All */}
        <button
          onClick={onIdentifyAll}
          disabled={identifyingAll}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {identifyingAll ? 'Identificazione...' : 'Identifica Tutti'}
        </button>
      </div>
    </div>
  );
}
