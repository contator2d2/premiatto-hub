import { NavLink, useNavigate } from 'react-router-dom';
import { ReactNode, useState } from 'react';
import { LayoutDashboard, FileText, Users, ShieldCheck, Palette, LogOut, Menu, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useBranding } from '@/contexts/branding-context';
import { cn } from '@/lib/utils';

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const { branding } = useBranding();
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const nav = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/documents', label: 'Documentos', icon: FileText },
    ...(isAdmin ? [
      { to: '/users', label: 'Usuários', icon: Users },
      { to: '/audit', label: 'Auditoria', icon: ShieldCheck },
      { to: '/admin/branding', label: 'Marca', icon: Palette },
    ] : []),
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <aside className={cn('border-r border-border bg-card transition-all', open ? 'w-64' : 'w-16')}>
        <div className="h-16 px-4 flex items-center gap-3 border-b border-border">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-lg gradient-brand flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          {open && <span className="font-display font-semibold text-sm truncate">{branding?.appName || 'Premiatto Connect'}</span>}
          <button onClick={() => setOpen(!open)} className="ml-auto p-1.5 hover:bg-muted rounded">
            <Menu className="h-4 w-4" />
          </button>
        </div>
        <nav className="p-2 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted',
                )
              }
            >
              <n.icon className="h-4 w-4 shrink-0" />
              {open && <span>{n.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-inherit p-3 border-t border-border" style={{ width: open ? '16rem' : '4rem' }}>
          <button
            onClick={async () => { await logout(); navigate('/auth'); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {open && <span className="truncate">{user?.fullName || user?.email}</span>}
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
