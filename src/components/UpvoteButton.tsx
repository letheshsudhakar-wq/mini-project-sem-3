import React, { useState, useEffect } from 'react';
import { ThumbsUp, Loader2, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { complaintsService } from '../services/complaints';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../i18n';

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
  const { error: toastError } = useToast();
  const { t, formatNumber, plural } = useLanguage();
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(initialUpvoteCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingInitial, setIsCheckingInitial] = useState(true);

  // Check initial upvote status for current user
  useEffect(() => {
    let isMounted = true;
    if (user) {
      setIsCheckingInitial(true);
      complaintsService.checkUserUpvote(complaintId, user.id).then(({ hasUpvoted: voted, error }) => {
        if (isMounted) {
          if (error) {
            console.error('[CivicFix Upvote] Failed to check the current vote:', error);
            toastError(t('upvote.saveFailed'));
          } else {
            setHasUpvoted(voted);
          }
          setIsCheckingInitial(false);
        }
      }).catch((error: unknown) => {
        if (!isMounted) return;
        console.error('[CivicFix Upvote] Failed to check the current vote:', error);
        toastError(t('upvote.saveFailed'));
        setIsCheckingInitial(false);
      });
    } else {
      setIsCheckingInitial(false);
    }
    return () => {
      isMounted = false;
    };
  }, [complaintId, t, toastError, user]);

  useEffect(() => {
    setUpvoteCount(initialUpvoteCount);
  }, [initialUpvoteCount]);

  const handleToggleUpvote = async () => {
    if (!user || isLoading) return;

    setIsLoading(true);
    try {
      if (hasUpvoted) {
        const { error } = await complaintsService.removeUpvote(complaintId, user.id);
        if (error) {
          toastError(t('upvote.saveFailed'));
          return;
        }
        const newCount = Math.max(0, upvoteCount - 1);
        setHasUpvoted(false);
        setUpvoteCount(newCount);
        if (onUpvoteChange) onUpvoteChange(newCount, false);
      } else {
        const { error } = await complaintsService.addUpvote(complaintId, user.id);
        if (error) {
          toastError(t('upvote.saveFailed'));
          return;
        }
        const newCount = upvoteCount + 1;
        setHasUpvoted(true);
        setUpvoteCount(newCount);
        if (onUpvoteChange) onUpvoteChange(newCount, true);
      }
    } catch (error) {
      console.error('[CivicFix Upvote] Failed to update the vote:', error);
      toastError(t('upvote.saveFailed'));
    } finally {
      setIsLoading(false);
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
      title={user ? (hasUpvoted ? t('upvote.removeTitle') : t('upvote.addTitle')) : t('upvote.signInTitle')}
      aria-label={`${hasUpvoted ? t('upvote.remove') : t('upvote.add')}, ${plural('plural.issue', upvoteCount)}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : hasUpvoted ? (
        <Check className="w-4 h-4 text-white" />
      ) : (
        <ThumbsUp className="w-4 h-4 text-amber-500" />
      )}

      <span>{hasUpvoted ? t('upvote.remove') : t('upvote.add')}</span>
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
        hasUpvoted ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
      }`}>
        {formatNumber(upvoteCount)}
      </span>
    </button>
  );
};
