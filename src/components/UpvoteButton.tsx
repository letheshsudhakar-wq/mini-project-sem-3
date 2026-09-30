import React, { useState, useEffect } from 'react';
import { ThumbsUp, Loader2, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { complaintsService } from '../services/complaints';

interface UpvoteButtonProps {
  complaintId: string;
  initialUpvoteCount: number;
  onUpvoteChange?: (newCount: number, hasUpvoted: boolean) => void;
  className?: string;
}

export const UpvoteButton: React.FC<UpvoteButtonProps> = ({
  complaintId,
  initialUpvoteCount,
  onUpvoteChange,
  className = '',
}) => {
  const { user } = useAuth();
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(initialUpvoteCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingInitial, setIsCheckingInitial] = useState(true);

  // Check initial upvote status for current user
  useEffect(() => {
    let isMounted = true;
    if (user) {
      complaintsService.checkUserUpvote(complaintId, user.id).then(({ hasUpvoted: voted }) => {
        if (isMounted) {
          setHasUpvoted(voted);
          setIsCheckingInitial(false);
        }
      });
    } else {
      setIsCheckingInitial(false);
    }
    return () => {
      isMounted = false;
    };
  }, [complaintId, user]);

  useEffect(() => {
    setUpvoteCount(initialUpvoteCount);
  }, [initialUpvoteCount]);

  const handleToggleUpvote = async () => {
    if (!user || isLoading) return;

    setIsLoading(true);

    if (hasUpvoted) {
      // Remove Upvote
      const { error } = await complaintsService.removeUpvote(complaintId, user.id);
      setIsLoading(false);

      if (!error) {
        const newCount = Math.max(0, upvoteCount - 1);
        setHasUpvoted(false);
        setUpvoteCount(newCount);
        if (onUpvoteChange) onUpvoteChange(newCount, false);
      }
    } else {
      // Add Upvote
      const { error } = await complaintsService.addUpvote(complaintId, user.id);
      setIsLoading(false);

      if (!error) {
        const newCount = upvoteCount + 1;
        setHasUpvoted(true);
        setUpvoteCount(newCount);
        if (onUpvoteChange) onUpvoteChange(newCount, true);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggleUpvote}
      disabled={!user || isLoading || isCheckingInitial}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition shadow-xs active:scale-95 disabled:cursor-not-allowed cursor-pointer ${
        hasUpvoted
          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
      } ${className}`}
      title={user ? (hasUpvoted ? 'Click to remove upvote' : 'Upvote to prioritize this issue') : 'Sign in to upvote'}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : hasUpvoted ? (
        <Check className="w-4 h-4 text-white" />
      ) : (
        <ThumbsUp className="w-4 h-4 text-amber-500" />
      )}

      <span>{hasUpvoted ? 'Upvoted' : 'Upvote Issue'}</span>
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
        hasUpvoted ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
      }`}>
        {upvoteCount}
      </span>
    </button>
  );
};
