'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { LogIn, LogOut, RefreshCw, User } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function TopNavUser() {
  const { data: session, status } = useSession();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [hasDashboardCookie, setHasDashboardCookie] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Detect password-auth sessions via the non-httpOnly indicator cookie
  useEffect(() => {
    setHasDashboardCookie(document.cookie.includes('dashboard_auth=1'));
  }, []);

  // Close the menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

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

  const isAuthed = Boolean(session) || hasDashboardCookie;
  const displayName = session?.user?.name ?? 'Ruhan Gupta';
  const displayEmail = session?.user?.email ?? 'Password sign-in';

  if (status === 'loading' && !hasDashboardCookie) {
    return <div className="w-24 h-10 rounded-full bg-card/70 animate-pulse" />;
  }

  if (!isAuthed) {
    return (
      <button
        onClick={() => signIn('google')}
        className="flex items-center gap-2 rounded-full bg-gold text-foreground text-sm font-semibold px-4 py-2 shadow-card hover:shadow-lift hover:-translate-y-0.5 active:scale-[0.98] transition-all"
      >
        <LogIn className="w-4 h-4" />
        Sign in
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Google Tasks sync — round button like the reference's icon cluster */}
      {session && (
        <div className="relative">
          <button
            onClick={handleSync}
            disabled={syncing}
            title="Reconcile all Google Tasks now"
            className="w-10 h-10 rounded-full border border-border-strong/70 bg-card/70 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-card disabled:opacity-50 transition-all"
          >
            <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
          </button>
          {syncResult && (
            <span className="absolute top-11 right-0 text-[10px] font-mono whitespace-nowrap bg-foreground text-card rounded-full px-2.5 py-1 shadow-lift animate-pop z-30">
              {syncResult}
            </span>
          )}
        </div>
      )}

      {/* Avatar + menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="w-10 h-10 rounded-full border border-border-strong/70 bg-card/70 backdrop-blur flex items-center justify-center overflow-hidden hover:shadow-card transition-all"
          title={displayName}
        >
          {session?.user?.image ? (
            <Image src={session.user.image} alt="avatar" width={40} height={40} className="rounded-full" />
          ) : session ? (
            <span className="font-serif font-semibold text-sm text-primary-deep">{session.user?.name?.[0] ?? 'U'}</span>
          ) : (
            <User className="w-4 h-4 text-primary-deep" />
          )}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-12 w-56 bg-card border border-border rounded-2xl shadow-modal p-2 animate-scale-in z-30">
            <div className="px-3 py-2.5 border-b border-border/60">
              <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
            </div>
            <button
              onClick={() => (session ? signOut() : handlePasswordSignOut())}
              className="w-full flex items-center gap-2 px-3 py-2.5 mt-1 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
