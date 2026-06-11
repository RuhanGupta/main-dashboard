'use client';
import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { CheckSquare, LogIn, LogOut, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export function SidebarFooter() {
  const { data: session, status } = useSession();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [hasDashboardCookie, setHasDashboardCookie] = useState(false);
  const router = useRouter();
  const dateString = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Detect password-auth sessions via the non-httpOnly indicator cookie
  useEffect(() => {
    setHasDashboardCookie(document.cookie.includes('dashboard_auth=1'));
  }, []);

  const handlePasswordSignOut = async () => {
    await fetch('/api/dashboard-auth', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  };

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        const { created, updated, deleted } = data.stats;
        setSyncResult(`+${created} ~${updated} -${deleted}`);
      } else {
        setSyncResult('Error');
      }
    } catch {
      setSyncResult('Error');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 4000);
    }
  }

  return (
    <div className="relative px-4 py-4 border-t border-sidebar-border">
      {/* Google Tasks badge + sync button */}
      {session && (
        <div className="px-3 mb-3 py-2.5 bg-sidebar-raised rounded-xl border border-sidebar-border">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-body flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground">Google Tasks</p>
              <p className="text-xs text-sidebar-muted truncate">
                {syncResult ?? 'Syncs on save'}
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              title="Reconcile all Google Tasks now"
              className="text-body hover:text-sidebar-foreground disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Auth state */}
      {session ? (
        // Google OAuth session
        <div className="flex items-center gap-2.5">
          {session.user?.image ? (
            <Image src={session.user.image} alt="avatar" width={32} height={32} className="rounded-full flex-shrink-0 ring-2 ring-sidebar-primary/40" />
          ) : (
            <div className="w-8 h-8 bg-sidebar-accent rounded-full flex items-center justify-center text-sidebar-primary font-semibold text-sm flex-shrink-0 ring-2 ring-sidebar-primary/40">
              {session.user?.name?.[0] ?? 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{session.user?.name}</p>
            <p className="text-xs text-sidebar-muted truncate">{session.user?.email}</p>
          </div>
          <button onClick={() => signOut()} className="text-sidebar-muted hover:text-destructive transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : hasDashboardCookie ? (
        // Password cookie session
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-sidebar-accent rounded-full flex items-center justify-center text-sidebar-primary font-semibold text-sm flex-shrink-0 ring-2 ring-sidebar-primary/40">
            R
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">Ruhan Gupta</p>
            <p className="text-xs text-sidebar-muted truncate">Password sign-in</p>
          </div>
          <button onClick={handlePasswordSignOut} className="text-sidebar-muted hover:text-destructive transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : status === 'loading' ? (
        <div className="h-10 bg-sidebar-raised rounded-xl animate-pulse" />
      ) : (
        <button
          onClick={() => signIn('google')}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-sidebar-primary to-extracurricular text-sidebar text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-glow"
        >
          <LogIn className="w-4 h-4" />
          Sign in with Google
        </button>
      )}

      <p className="text-xs text-sidebar-muted/80 mt-3">{dateString}</p>
    </div>
  );
}
