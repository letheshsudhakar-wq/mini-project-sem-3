import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  ThumbsUp, 
  X
} from 'lucide-react';
import { complaintsService } from '../services/complaints';
import { AdminStatusCards } from '../components/AdminStatusCards';
import { AdminComplaintDetailModal } from '../components/AdminComplaintDetailModal';
import { AdminUpdateStatusModal } from '../components/AdminUpdateStatusModal';
import { StatusBadge } from '../components/StatusBadge';
import { COMPLAINT_CATEGORIES } from '../utils/constants';
import type { 
  Complaint, 
  ComplaintCategory, 
  ComplaintStatus, 
  AdminDashboardStats 
} from '../types';

export const AdminPage: React.FC = () => {
  // Statistics State
  const [stats, setStats] = useState<AdminDashboardStats>({
    total: 0,
    reported: 0,
    in_progress: 0,
    resolved: 0,
    rejected: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);

  // Complaints Table State
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoadingComplaints, setIsLoadingComplaints] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter & Search Parameters
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategory | 'all'>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'updated' | 'upvotes'>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Selected Complaint for Modals
  const [inspectingComplaint, setInspectingComplaint] = useState<Complaint | null>(null);
  const [updatingComplaint, setUpdatingComplaint] = useState<Complaint | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // 1. Fetch Summary Statistics
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    const { data } = await complaintsService.getAdminDashboardStats();
    if (data) {
      setStats(data);
    }
    setIsLoadingStats(false);
  }, []);

  // 2. Fetch Paginated & Filtered Complaints
  const fetchComplaints = useCallback(async () => {
    setIsLoadingComplaints(true);
    setErrorMsg(null);

    const response = await complaintsService.getAdminComplaints({
      category: selectedCategory,
      status: selectedStatus,
      dateRange: selectedDateRange,
      searchQuery: searchQuery.trim(),
      sortBy,
      page: currentPage,
      pageSize,
    });

    if (response.error) {
      setErrorMsg('Failed to load administrative complaints list.');
    } else {
      setComplaints(response.data);
      setTotalCount(response.totalCount);
      setTotalPages(response.totalPages);
    }
    setIsLoadingComplaints(false);
  }, [selectedCategory, selectedStatus, selectedDateRange, searchQuery, sortBy, currentPage]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Reset page to 1 when filters change
  const handleStatusFilterChange = (st: ComplaintStatus | 'all') => {
    setSelectedStatus(st);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (cat: ComplaintCategory | 'all') => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleDateFilterChange = (d: 'all' | 'today' | '7days' | '30days') => {
    setSelectedDateRange(d);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSelectedDateRange('all');
    setSearchQuery('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const isFiltered =
    selectedStatus !== 'all' ||
    selectedCategory !== 'all' ||
    selectedDateRange !== 'all' ||
    Boolean(searchQuery.trim());

  // Callback when a complaint status is successfully updated
  const handleComplaintUpdated = (updated: Complaint) => {
    setNotification(`Complaint ID ${updated.id.slice(0, 8)} status successfully updated to ${updated.status}.`);
    setTimeout(() => setNotification(null), 5000);
    fetchStats();
    fetchComplaints();
    if (inspectingComplaint && inspectingComplaint.id === updated.id) {
      setInspectingComplaint(updated);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Administrative Authority
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Municipal Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage citizen grievances, assign work orders, update resolution statuses, and audit resolution history.
          </p>
        </div>

        <button
          onClick={() => {
            fetchStats();
            fetchComplaints();
          }}
          disabled={isLoadingComplaints || isLoadingStats}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingComplaints ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm text-emerald-800 flex items-center justify-between gap-3 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Summary Statistics Cards */}
      <AdminStatusCards
        stats={stats}
        selectedStatusFilter={selectedStatus}
        onSelectStatus={handleStatusFilterChange}
        isLoading={isLoadingStats}
      />

      {/* 2. Search & Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Live Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by Complaint ID, description keywords, or address..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
            />
          </div>

          {/* Quick Clear */}
          {isFiltered && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 shrink-0"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Status Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusFilterChange(e.target.value as ComplaintStatus | 'all')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
            >
              <option value="all">All Statuses ({stats.total})</option>
              <option value="reported">Reported ({stats.reported})</option>
              <option value="in_progress">In Progress ({stats.in_progress})</option>
              <option value="resolved">Resolved ({stats.resolved})</option>
              <option value="rejected">Rejected ({stats.rejected})</option>
            </select>
          </div>

          {/* Category Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryFilterChange(e.target.value as ComplaintCategory | 'all')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {COMPLAINT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block">Date Range</label>
            <select
              value={selectedDateRange}
              onChange={(e) => handleDateFilterChange(e.target.value as 'all' | 'today' | '7days' | '30days')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="updated">Recently Updated</option>
              <option value="upvotes">Most Upvoted</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Complaints Table / Card List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">Grievance Work Orders</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
              {totalCount} Record{totalCount === 1 ? '' : 's'}
            </span>
          </div>

          <span className="text-xs text-slate-400">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={fetchComplaints} className="font-bold underline">
              Retry
            </button>
          </div>
        )}

        {/* Table View (Desktop & Tablet) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Tracking ID</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Reported</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingComplaints ? (
                // Skeleton Rows
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-48" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-32" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-12" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-4 bg-slate-200 rounded w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-700">
                      {isFiltered ? 'No complaints match your active filters.' : 'No complaints found.'}
                    </p>
                    {isFiltered && (
                      <button
                        onClick={handleClearFilters}
                        className="text-xs text-indigo-600 font-bold hover:underline"
                      >
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                complaints.map((comp) => {
                  const catInfo = COMPLAINT_CATEGORIES.find((c) => c.value === comp.category);
                  const dateFormatted = new Date(comp.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr 
                      key={comp.id} 
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {comp.id.slice(0, 8)}...
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {catInfo?.label || comp.category}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="line-clamp-2 font-medium text-slate-900 leading-snug">
                          {comp.description}
                        </p>
                      </td>

                      {/* Address */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <p className="truncate text-slate-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span className="truncate">{comp.address || 'GPS Coordinates Logged'}</span>
                        </p>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={comp.status} size="sm" />
                      </td>

                      {/* Upvotes */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3 text-amber-500" />
                          {comp.upvote_count}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500">
                        {dateFormatted}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectingComplaint(comp)}
                            title="Inspect complete details and timeline"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setUpdatingComplaint(comp)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg font-bold text-[11px] transition shadow-2xs"
                          >
                            Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <span>
            Showing <strong>{complaints.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
            <strong>{Math.min(currentPage * pageSize, totalCount)}</strong> of{' '}
            <strong>{totalCount}</strong> grievances
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoadingComplaints}
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-bold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isLoadingComplaints}
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Inspection Modal */}
      {inspectingComplaint && (
        <AdminComplaintDetailModal
          isOpen={Boolean(inspectingComplaint)}
          complaint={inspectingComplaint}
          onClose={() => setInspectingComplaint(null)}
          onOpenStatusUpdateModal={(c) => {
            setInspectingComplaint(null);
            setUpdatingComplaint(c);
          }}
        />
      )}

      {/* Status Update Modal */}
      {updatingComplaint && (
        <AdminUpdateStatusModal
          isOpen={Boolean(updatingComplaint)}
          complaint={updatingComplaint}
          onClose={() => setUpdatingComplaint(null)}
          onUpdated={handleComplaintUpdated}
        />
      )}
    </div>
  );
};
