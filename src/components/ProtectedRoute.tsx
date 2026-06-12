import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getSupabaseSessionSafely, supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasShownExpiryToast, setHasShownExpiryToast] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    localStorage.removeItem('mock-session');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setLoading(false);
        if (!hasShownExpiryToast) {
          toast.info('로그인이 필요합니다. 다시 로그인해 주세요.');
          setHasShownExpiryToast(true);
        }
        navigate('/auth', { replace: true });
        return;
      }
      
      setSession(session);
      setLoading(false);
    });

    const checkSession = async () => {
      const nextSession = await getSupabaseSessionSafely({
        context: 'protected route bootstrap',
      });

      if (cancelled) return;

      if (!nextSession && !hasShownExpiryToast) {
        toast.info('세션이 만료되었습니다. 다시 로그인해 주세요.');
        setHasShownExpiryToast(true);
      }
      
      setSession(nextSession);
      setLoading(false);
    };

    checkSession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate, hasShownExpiryToast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
