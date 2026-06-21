'use client';
import { usePathname } from 'next/navigation';
import { TopNav } from './TopNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith('/counselor/') || pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <>
      <TopNav />
      <main className="flex-1 overflow-y-auto min-h-screen">
        {children}
      </main>
    </>
  );
}
