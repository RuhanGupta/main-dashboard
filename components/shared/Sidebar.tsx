'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, BookOpen, Star, Dumbbell, Feather, GraduationCap,
} from 'lucide-react';

// Never SSR the footer — it contains session state and Date.now() which cause hydration mismatches
const SidebarFooter = dynamic(
  () => import('./SidebarFooter').then(m => ({ default: m.SidebarFooter })),
  { ssr: false }
);

// Each destination carries its own accent so the active state feels alive
const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, accent: 'text-sidebar-primary', glow: 'bg-sidebar-primary' },
  { href: '/academics', label: 'Academics', icon: BookOpen, accent: 'text-academic', glow: 'bg-academic' },
  { href: '/extracurriculars', label: 'Extracurriculars', icon: Star, accent: 'text-extracurricular', glow: 'bg-extracurricular' },
  { href: '/body', label: 'Body', icon: Dumbbell, accent: 'text-body', glow: 'bg-body' },
  { href: '/reflection', label: 'Reflection', icon: Feather, accent: 'text-reflection', glow: 'bg-reflection' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col relative overflow-hidden">
      {/* Ambient glow at the top of the panel */}
      <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-sidebar-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 w-72 h-72 rounded-full bg-extracurricular/10 blur-3xl" />

      {/* Logo */}
      <div className="relative px-6 py-7">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sidebar-primary to-extracurricular flex items-center justify-center shadow-glow">
            <GraduationCap className="w-5 h-5 text-sidebar" />
          </div>
          <div>
            <p className="font-serif text-lg font-semibold leading-tight tracking-tight">Student</p>
            <p className="text-[11px] uppercase tracking-[0.22em] text-sidebar-muted -mt-0.5">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 px-3 py-2 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-muted/80">Menu</p>
        {navItems.map(({ href, label, icon: Icon, accent, glow }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-accent text-white shadow-[inset_0_1px_0_oklch(1_0_0_/_0.06)]'
                  : 'text-sidebar-muted hover:bg-sidebar-raised hover:text-sidebar-foreground hover:translate-x-0.5'
              )}
            >
              {/* Active indicator bar */}
              <span
                className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full transition-all duration-300',
                  glow,
                  isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'
                )}
              />
              <Icon className={cn(
                'w-[18px] h-[18px] transition-all duration-200',
                isActive ? accent : 'text-sidebar-muted group-hover:text-sidebar-foreground group-hover:scale-110'
              )} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer — loaded client-only to avoid hydration mismatches */}
      <SidebarFooter />
    </aside>
  );
}
