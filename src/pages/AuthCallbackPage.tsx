import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../i18n';

export const AuthCallbackPage: React.FC = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;

    if (isAuthenticated) {
      navigate(isAdmin ? '/government' : '/complaints', { replace: true });
      return;
    }

    navigate('/login', { replace: true, state: { oauthError: true } });
  }, [isAuthenticated, isAdmin, loading, navigate]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3" aria-live="polite">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      <span className="text-xs font-medium text-slate-500">{t('auth.signingIn')}</span>
    </div>
  );
};
