'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { GraduationCap } from 'lucide-react';

// Never SSR the user cluster — it contains session state which causes hydration mismatches
const TopNavUser = dynamic(
  () => import('./TopNavUser').then(m => ({ default: m.TopNavUser })),
  { ssr: false }
);

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/academics', label: 'Academics' },
  { href: '/extracurriculars', label: 'Extracurriculars' },
  { href: '/body', label: 'Body' },
  { href: '/reflection', label: 'Reflection' },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="relative z-20 flex items-center justify-between gap-3 px-5 sm:px-7 py-5">
      {/* Brand pill */}
      <Link
        href="/"
        className="flex items-center gap-2 rounded-full border border-border-strong/70 bg-card/70 backdrop-blur px-4 py-2 shadow-card transition-transform duration-200 hover:-translate-y-0.5"
      >
        <GraduationCap className="w-4 h-4 text-primary-deep" />
        <span className="font-serif text-sm font-semibold tracking-tight whitespace-nowrap">Student</span>
      </Link>

      {/* Page pills */}
      <nav className="flex items-center gap-1 overflow-x-auto rounded-full p-1">
        {navItems.map(({ href, label }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3.5 sm:px-4 py-2 rounded-full text-[13px] whitespace-nowrap transition-all duration-200',
                isActive
                  ? 'bg-foreground text-card font-semibold shadow-card'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/80'
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sync + account */}
      <TopNavUser />
    </header>
  );
}
