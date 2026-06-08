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

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/academics', label: 'Academics', icon: BookOpen },
  { href: '/extracurriculars', label: 'Extracurriculars', icon: Star },
  { href: '/body', label: 'Body', icon: Dumbbell },
  { href: '/reflection', label: 'Reflection', icon: Feather },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Student</p>
            <p className="text-xs text-gray-500">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive ? 'text-indigo-600' : 'text-gray-400')} />
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
