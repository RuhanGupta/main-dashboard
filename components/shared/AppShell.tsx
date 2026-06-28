'use client';
import { usePathname } from 'next/navigation';
import { TopNav } from './TopNav';
import { darkThemeVars } from '@/lib/dark-theme';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith('/counselor/') || pathname === '/login') {
    return <>{children}</>;
  }

  // The dashboard runs a self-contained dark theme. Applying the dark token
  // overrides here (above TopNav) re-maps the design tokens for the nav + page
  // together, so the whole viewport reads as one cohesive dark surface.
  const isDashboard = pathname === '/';

  return (
    <div style={isDashboard ? darkThemeVars : undefined}>
      <TopNav />
      <main className="flex-1 overflow-y-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}
