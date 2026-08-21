'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Tag,
  Repeat,
  ScrollText,
  Timer,
  LogOut,
  ShieldCheck,
  ChevronLeft,
} from 'lucide-react';
import clsx from 'clsx';
import { useEffect } from 'react';

const adminNavItems = [
  { href: '/admin', label: 'Vue d\'ensemble', icon: LayoutDashboard, exact: true },
  { href: '/admin/tenants', label: 'Coopératives', icon: Building2 },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/plans', label: 'Plans tarifaires', icon: Tag },
  { href: '/admin/subscriptions', label: 'Abonnements', icon: Repeat },
  { href: '/admin/payments', label: 'Paiements', icon: CreditCard },
  { href: '/admin/audit', label: "Journal d'audit", icon: ScrollText },
  { href: '/admin/tasks', label: 'Tâches planifiées', icon: Timer },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
      </div>
    );
  }

  if (!user || user.role !== 'SUPER_ADMIN') return null;

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col border-r border-gray-800">
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck className="text-red-400" size={26} />
            <div>
              <h1 className="font-bold text-lg text-white">Admin Panel</h1>
              <p className="text-gray-400 text-xs">AgroTech SN — Plateforme</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {adminNavItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition',
                  isActive
                    ? 'bg-red-600/20 text-red-300 border border-red-600/30'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            <ChevronLeft size={16} />
            Retour tableau de bord
          </Link>
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-red-700 flex items-center justify-center text-sm font-bold text-white">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-red-400">Super Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
