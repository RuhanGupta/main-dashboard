'use client';
import { useState, useEffect, useRef } from 'react';
import { LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function TopNavUser() {
  const [signedIn, setSignedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Detect the session via the non-httpOnly indicator cookie set at login.
  useEffect(() => {
    setSignedIn(document.cookie.includes('dashboard_auth=1'));
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

  const handleSignOut = async () => {
    await fetch('/api/dashboard-auth', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  };

  if (!signedIn) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(o => !o)}
        className="w-10 h-10 rounded-full border border-border-strong/70 bg-card/70 backdrop-blur flex items-center justify-center overflow-hidden hover:shadow-card transition-all"
        title="Account"
      >
        <User className="w-4 h-4 text-primary-deep" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-12 w-56 bg-card border border-border rounded-2xl shadow-modal p-2 animate-scale-in z-30">
          <div className="px-3 py-2.5 border-b border-border/60">
            <p className="text-sm font-semibold text-foreground truncate">Signed in</p>
            <p className="text-xs text-muted-foreground truncate">Password sign-in</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2.5 mt-1 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
