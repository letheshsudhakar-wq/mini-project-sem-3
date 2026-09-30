import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusCircle, 
  Search, 
  AlertCircle, 
  RefreshCw, 
  FileQuestion, 
  Inbox
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { complaintsService } from '../services/complaints';
import { ComplaintCard } from '../components/ComplaintCard';
import type { Complaint, ComplaintStatus } from '../types';

type FilterStatus = 'all' | ComplaintStatus;
type SortOrder = 'newest' | 'oldest' | 'most_upvoted';

export const ComplaintsPage: React.FC = () => {
  const { user } = useAuth();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter & Search States
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchMyComplaints = async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await complaintsService.getUserComplaints(user.id);
      if (error) {
        setErrorMsg('Unable to retrieve your complaints. Please check your connection and try again.');
      } else {
        setComplaints(data || []);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error fetching your complaints.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyComplaints();
  }, [user]);

  // Compute status counts for filter tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: complaints.length,
      reported: 0,
      in_progress: 0,
      resolved: 0,
      rejected: 0,
    };
    complaints.forEach((c) => {
      if (counts[c.status] !== undefined) {
        counts[c.status]++;
      }
    });
    return counts;
  }, [complaints]);

  // Filter and sort complaints
  const filteredComplaints = useMemo(() => {
    let list = [...complaints];

    // Filter by status
    if (statusFilter !== 'all') {
      list = list.filter((c) => c.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.description.toLowerCase().includes(query) ||
          c.category.toLowerCase().includes(query) ||
          (c.address && c.address.toLowerCase().includes(query))
      );
    }

    // Sort order
    if (sortOrder === 'newest') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOrder === 'oldest') {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortOrder === 'most_upvoted') {
      list.sort((a, b) => b.upvote_count - a.upvote_count);
    }

    return list;
  }, [complaints, statusFilter, searchQuery, sortOrder]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            <Inbox className="w-3.5 h-3.5" />
            Citizen Grievance Records
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            My Complaints
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track resolution status, edit unresolved reports, and monitor updates for your submitted grievances.
          </p>
        </div>

        <Link
          to="/report"
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Report New Issue
        </Link>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        {/* Status Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs font-semibold">
          {[
            { key: 'all', label: 'All Complaints' },
            { key: 'reported', label: 'Reported' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'resolved', label: 'Resolved' },
            { key: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as FilterStatus)}
              className={`px-3.5 py-2 rounded-xl transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === tab.key ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {statusCounts[tab.key] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keywords, category, or address..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="w-full sm:w-auto px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="most_upvoted">Most Upvoted</option>
              </select>
            </div>

            <button
              onClick={fetchMyComplaints}
              title="Refresh complaints list"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-rose-800">{errorMsg}</p>
          <button
            onClick={fetchMyComplaints}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Skeleton Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="w-24 h-5 bg-slate-200 rounded-lg" />
                <div className="w-20 h-5 bg-slate-200 rounded-full" />
              </div>
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-slate-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-full h-4 bg-slate-200 rounded" />
                  <div className="w-2/3 h-4 bg-slate-200 rounded" />
                  <div className="w-1/2 h-3 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between">
                <div className="w-24 h-4 bg-slate-200 rounded" />
                <div className="w-16 h-4 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !errorMsg && filteredComplaints.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <FileQuestion className="w-8 h-8" />
          </div>

          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-slate-900">
              {complaints.length === 0 ? 'No complaints yet' : 'No matching complaints found'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {complaints.length === 0
                ? 'Have you noticed a civic issue in your area? Submit a grievance report to alert your local authorities.'
                : 'Try adjusting your filters or search keywords to find what you are looking for.'}
            </p>
          </div>

          {complaints.length === 0 ? (
            <div className="pt-2">
              <Link
                to="/report"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                Report an Issue
              </Link>
            </div>
          ) : (
            <button
              onClick={() => {
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Complaints Grid */}
      {!isLoading && !errorMsg && filteredComplaints.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredComplaints.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))}
        </div>
      )}
    </div>
  );
};
