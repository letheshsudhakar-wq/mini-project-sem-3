import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  AlertCircle, 
  ThumbsUp, 
  X
} from 'lucide-react';
import { complaintsService } from '../services/complaints';
import { AdminStatusCards } from '../components/AdminStatusCards';
import { AdminComplaintDetailModal } from '../components/AdminComplaintDetailModal';
import { AdminUpdateStatusModal } from '../components/AdminUpdateStatusModal';
import { CivicPriorityScore } from '../components/CivicPriorityScore';
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
    critical: 0,
    overdue: 0,
    average_resolution_hours: null,
    department_counts: {},
  });
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);

  // Complaints Table State
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [attentionComplaints, setAttentionComplaints] = useState<Complaint[]>([]);
  const [similarReportCounts, setSimilarReportCounts] = useState<Record<string, number | null>>({});
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoadingComplaints, setIsLoadingComplaints] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter & Search Parameters
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategory | 'all'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
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
  const fetchComplaints = useCallback(async (isManual = false) => {
    setIsLoadingComplaints(true);
    setErrorMsg(null);

    const response = await complaintsService.getAdminComplaints({
      category: selectedCategory,
      department: selectedDepartment,
      status: selectedStatus,
      dateRange: selectedDateRange,
      searchQuery: searchQuery.trim(),
      sortBy,
      page: currentPage,
      pageSize,
    });

    if (response.error) {
      setErrorMsg('Failed to load administrative complaints list.');
      if (isManual) error('Failed to refresh data.');
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

  useEffect(() => {
    fetchAttentionComplaints();
  }, [fetchAttentionComplaints]);

  // Reset page to 1 when filters change
  const handleStatusFilterChange = (st: ComplaintStatus | 'all') => {
    nativeService.triggerHaptic('light');
    setSelectedStatus(st);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (cat: ComplaintCategory | 'all') => {
    nativeService.triggerHaptic('light');
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleDepartmentFilterChange = (department: string) => {
    setSelectedDepartment(department);
    setCurrentPage(1);
  };

  const handleDateFilterChange = (d: 'all' | 'today' | '7days' | '30days') => {
    nativeService.triggerHaptic('light');
    setSelectedDateRange(d);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    nativeService.triggerHaptic('light');
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSelectedDepartment('all');
    setSelectedDateRange('all');
    setSearchQuery('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const isFiltered =
    selectedStatus !== 'all' ||
    selectedCategory !== 'all' ||
    selectedDepartment !== 'all' ||
    selectedDateRange !== 'all' ||
    Boolean(searchQuery.trim());
  const departmentCounts = Object.entries(stats.department_counts).sort((a, b) => b[1] - a[1]);

  // Callback when a complaint status is successfully updated
  const handleComplaintUpdated = (updated: Complaint) => {
    setNotification(`Complaint ID ${updated.id.slice(0, 8)} status successfully updated to ${updated.status}.`);
    setTimeout(() => setNotification(null), 5000);
    fetchStats();
    fetchComplaints();
    fetchAttentionComplaints();
    if (refreshSelectedComplaint && inspectingComplaint && inspectingComplaint.id === updated.id) {
      setInspectingComplaint(updated);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Government Operations
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

      {/* 1. Summary Statistics Cards */}
      <AdminStatusCards
        stats={stats}
        selectedStatusFilter={selectedStatus}
        onSelectStatus={handleStatusFilterChange}
        isLoading={isLoadingStats}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-rose-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <div><p className="text-[10px] uppercase font-bold text-slate-500">Critical Complaints</p><p className="text-xl font-extrabold text-slate-900">{stats.critical}</p></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-200 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600" />
          <div><p className="text-[10px] uppercase font-bold text-slate-500">Overdue Complaints</p><p className="text-xl font-extrabold text-slate-900">{stats.overdue}</p></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600" />
          <div><p className="text-[10px] uppercase font-bold text-slate-500">Average Resolution Time</p><p className="text-xl font-extrabold text-slate-900">{stats.average_resolution_hours === null ? '—' : `${stats.average_resolution_hours.toFixed(1)} hrs`}</p></div>
        </div>
      </div>

      <section className="bg-white p-5 rounded-2xl border border-slate-200">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Department-wise Complaints</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {departmentCounts.length === 0 ? <p className="text-xs text-slate-500">No department assignments yet.</p> : departmentCounts.map(([department, count]) => (
            <button key={department} type="button" onClick={() => handleDepartmentFilterChange(department)} className="text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition">
              <span className="text-xs font-semibold text-slate-700">{department}</span>
              <span className="mt-1 block text-lg font-bold text-slate-900">{count}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-amber-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Repeat2 className="w-4 h-4 text-amber-600" />Recurring Civic Problems</h2>
          <span className="text-xs text-slate-500">{recurringIssues.length} grouping{recurringIssues.length === 1 ? '' : 's'}</span>
        </div>
        <div className="p-4">
          {recurringIssues.length === 0 ? (
            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
              <BellRing className="h-4 w-4 text-slate-400" />
              No possible recurring civic problems detected in the current complaint set.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recurringIssues.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => setSelectedRecurringIssue(issue)}
                  className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">{issue.label}</span>
                    {issue.repeatedResolution && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-rose-700">
                        Repeated Resolution
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-base font-extrabold text-slate-900">{issue.location}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                    <span className="rounded-full bg-white px-2 py-1 font-semibold">{issue.relatedComplaintCount} related complaints</span>
                    <span className="rounded-full bg-white px-2 py-1 font-semibold">{issue.previousResolutions} previous resolutions</span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <p>First reported: {new Date(issue.firstReportedDate).toLocaleDateString()}</p>
                    <p>Most recent: {new Date(issue.mostRecentReport).toLocaleDateString()}</p>
                    <p>Current status: {issue.currentStatus}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-rose-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-rose-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-600" />Immediate Attention</h2>
          <span className="text-xs text-slate-500">{attentionComplaints.length} open complaint{attentionComplaints.length === 1 ? '' : 's'}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1250px]">
            <thead className="bg-rose-50 text-[10px] uppercase font-bold text-slate-500"><tr>
              <th className="p-3">Complaint ID</th><th className="p-3">Category</th><th className="p-3">Location</th><th className="p-3">Reported</th><th className="p-3">Status</th><th className="p-3">Assigned Priority</th><th className="p-3">CivicFix Score</th><th className="p-3">Department</th><th className="p-3">Officer</th><th className="p-3">SLA / Deadline</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {attentionComplaints.length === 0 ? <tr><td colSpan={10} className="p-5 text-center text-slate-500">No complaints currently require immediate attention.</td></tr> : attentionComplaints.map((complaint) => (
                <tr key={complaint.id} className="hover:bg-rose-50/40 cursor-pointer" onClick={() => setInspectingComplaint(complaint)}>
                  <td className="p-3 font-mono font-bold break-all">{complaint.id}</td>
                  <td className="p-3">{COMPLAINT_CATEGORIES.find((category) => category.value === complaint.category)?.label || complaint.category}</td>
                  <td title={complaint.address || ''} className="p-3 max-w-48 truncate">{complaint.address || 'GPS Coordinates Logged'}</td>
                  <td className="p-3">{new Date(complaint.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <StatusBadge status={complaint.status} size="sm" labelOverride={complaint.resolution_confirmation_status === 'disputed' ? 'Resolution disputed' : complaint.demo_status_label} />
                    {complaint.resolution_confirmation_status === 'pending' && <span className="mt-1 block text-[10px] text-amber-700">Awaiting citizen confirmation</span>}
                    {complaint.resolution_confirmation_status === 'confirmed' && <span className="mt-1 block text-[10px] text-emerald-700">Citizen confirmed</span>}
                  </td>
                  <td className="p-3"><span className={`font-bold uppercase ${complaint.priority === 'critical' ? 'text-rose-700' : 'text-amber-700'}`}>{complaint.priority || 'normal'}</span></td>
                  <td className="p-3"><CivicPriorityScore complaint={complaint} similarReportCount={similarReportCounts[complaint.id]} compact /></td>
                  <td className="p-3">{complaint.department || 'Unassigned'}</td>
                  <td className="p-3">{complaint.assigned_officer?.name || 'Unassigned'}</td>
                  <td className="p-3">{complaint.sla_deadline ? new Date(complaint.sla_deadline).toLocaleString() : 'Not set'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Search & Filters Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-2.5">
          {/* Live Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by ID, keywords, or address..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Clear */}
          {isFiltered && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 shrink-0"
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer text-xs"
            >
              <option value="all">All Statuses ({stats.total})</option>
              <option value="reported">Reported ({stats.reported})</option>
              <option value="in_progress">In Progress ({stats.in_progress})</option>
              <option value="resolved">Resolved ({stats.resolved})</option>
              <option value="rejected">Rejected ({stats.rejected})</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block">Department</label>
            <select value={selectedDepartment} onChange={(e) => handleDepartmentFilterChange(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer">
              <option value="all">All Departments</option>
              <option value="Unassigned">Unassigned</option>
              {Array.from(new Set([...GOVERNMENT_DEPARTMENTS, ...Object.keys(stats.department_counts).filter((department) => department !== 'Unassigned')])).map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
          </div>

          {/* Category Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryFilterChange(e.target.value as ComplaintCategory | 'all')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer text-xs"
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer text-xs"
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
              onChange={(e) => {
                nativeService.triggerHaptic('light');
                setSortBy(e.target.value as any);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer text-xs"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="updated">Recently Updated</option>
              <option value="upvotes">Most Upvoted</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Complaints Records */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Header Controls */}
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
            <button onClick={() => fetchComplaints(true)} className="font-bold underline">
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
                <th className="py-3.5 px-4">Assigned Priority</th>
                <th className="py-3.5 px-4">CivicFix Score</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Assigned Officer</th>
                <th className="py-3.5 px-4">SLA / Deadline</th>
                <th className="py-3.5 px-4">Reported</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingComplaints ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-48" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-32" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-12" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-4 bg-slate-200 rounded w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500 space-y-2">
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
                  return (
                    <tr 
                      key={comp.id} 
                      className="hover:bg-slate-50/80 transition group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        <span className="break-all">{comp.id}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {catInfo?.label || comp.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        {recurringIssueLookup.get(comp.id) && (
                          <button
                            type="button"
                            onClick={() => setSelectedRecurringIssue(recurringIssueLookup.get(comp.id) || null)}
                            className="mb-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
                          >
                            {recurringIssueLookup.get(comp.id)?.label}
                          </button>
                        )}
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

                      <td className="py-3.5 px-4">
                        <StatusBadge status={comp.status} size="sm" labelOverride={comp.resolution_confirmation_status === 'disputed' ? 'Resolution disputed' : comp.demo_status_label} />
                        {comp.resolution_confirmation_status === 'pending' && <span className="mt-1 block text-[10px] text-amber-700">Awaiting confirmation</span>}
                        {comp.resolution_confirmation_status === 'confirmed' && <span className="mt-1 block text-[10px] text-emerald-700">Citizen confirmed</span>}
                      </td>

                      {/* Upvotes */}
                      <td className="py-3.5 px-4">
                        <span className={`font-bold uppercase flex items-center gap-1 ${comp.priority === 'critical' ? 'text-rose-700' : comp.priority === 'high' ? 'text-amber-700' : 'text-slate-600'}`}>
                          {(comp.priority === 'critical' || comp.priority === 'high') && <AlertTriangle className="w-3 h-3" />}
                          {comp.priority || 'normal'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4"><CivicPriorityScore complaint={comp} similarReportCount={similarReportCounts[comp.id]} compact /></td>

                      <td className="py-3.5 px-4">{comp.department || 'Unassigned'}</td>
                      <td className="py-3.5 px-4">{comp.assigned_officer?.name || 'Unassigned'}</td>
                      <td className="py-3.5 px-4 text-slate-500">{comp.sla_deadline ? new Date(comp.sla_deadline).toLocaleString() : 'Not set'}</td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(comp.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              nativeService.triggerHaptic('light');
                              setInspectingComplaint(comp);
                            }}
                            title="Inspect complete details and timeline"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition active:scale-90 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              nativeService.triggerHaptic('light');
                              setUpdatingComplaint(comp);
                            }}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg font-bold text-[11px] transition shadow-2xs active:scale-95 cursor-pointer"
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
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <button
            type="button"
            onClick={() => {
              nativeService.triggerHaptic('light');
              setCurrentPage((p) => Math.max(1, p - 1));
            }}
            disabled={currentPage <= 1 || isLoadingComplaints}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="font-bold text-slate-700">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => {
              nativeService.triggerHaptic('light');
              setCurrentPage((p) => Math.min(totalPages, p + 1));
            }}
            disabled={currentPage >= totalPages || isLoadingComplaints}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {inspectingComplaint && (
        <AdminComplaintDetailModal
          isOpen={Boolean(inspectingComplaint)}
          complaint={inspectingComplaint}
          onClose={() => setInspectingComplaint(null)}
          onOpenStatusUpdateModal={(c) => {
            setInspectingComplaint(null);
            setUpdatingComplaint(comp);
          }}
        />
      )}

      {updatingComplaint && (
        <AdminUpdateStatusModal
          isOpen={Boolean(updatingComplaint)}
          complaint={updatingComplaint}
          onClose={() => setUpdatingComplaint(null)}
          onUpdated={handleComplaintUpdated}
        />
      )}

      <RecurringIssueModal
        isOpen={Boolean(selectedRecurringIssue)}
        issue={selectedRecurringIssue}
        onClose={() => setSelectedRecurringIssue(null)}
        onOpenComplaint={(complaint) => {
          setSelectedRecurringIssue(null);
          setInspectingComplaint(complaint);
        }}
      />
    </div>
  );
};
