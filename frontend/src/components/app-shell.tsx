import { NavLink, useNavigate } from 'react-router-dom';
import { ReactNode, useState } from 'react';
import {
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  Search,
  Bell,
  Lock,
  ShieldCheck,
  Palette,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useBranding } from '@/contexts/branding-context';
import { cn } from '@/lib/utils';
import { MODULES, GROUP_LABELS, type ModuleGroup } from '@/lib/modules';

const GROUP_ORDER: ModuleGroup[] = ['workspace', 'conhecimento', 'operacao', 'inteligencia'];

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const { branding } = useBranding();
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const appName = branding?.appName || 'Premiatto Connect';
  const initials = (user?.fullName || user?.email || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside
        className={cn(
          'relative flex flex-col border-r border-border bg-card transition-all duration-200',
          open ? 'w-72' : 'w-[4.5rem]',
        )}
      >
        <div className="h-16 px-3 flex items-center gap-3 border-b border-border">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="" className="h-9 w-9 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="h-9 w-9 rounded-xl gradient-brand flex items-center justify-center shrink-0 shadow-elegant">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          {open && (
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-display font-semibold text-sm truncate">{appName}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Plataforma Corporativa
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-2.5 space-y-4 overflow-y-auto">
          {GROUP_ORDER.map((group) => {
            const items = MODULES.filter((m) => m.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="space-y-0.5">
                {open && (
                  <div className="px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {GROUP_LABELS[group]}
                  </div>
                )}
                {items.map((m) => {
                  const locked = m.status === 'coming_soon';
                  return (
                    <NavLink
                      key={m.key}
                      to={m.to}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                          isActive
                            ? 'bg-primary/10 text-primary font-medium shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_20%,transparent)]'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          locked && 'opacity-70',
                        )
                      }
                      title={locked ? `${m.label} — Em breve` : m.label}
                    >
                      <m.icon className="h-4 w-4 shrink-0" />
                      {open && (
                        <>
                          <span className="truncate flex-1">{m.label}</span>
                          {locked && (
                            <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              <Lock className="h-2.5 w-2.5" />
                              Em breve
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}

          {(isAdmin || isSuperAdmin) && (
            <div className="space-y-0.5 pt-2 border-t border-border">
              {open && (
                <div className="px-2 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Administração
                </div>
              )}
              {isAdmin && (
                <>
                  <NavLink
                    to="/users"
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    {open && <span>Usuários</span>}
                  </NavLink>
                  <NavLink
                    to="/audit"
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    {open && <span>Auditoria</span>}
                  </NavLink>
                </>
              )}
              {isSuperAdmin && (
                <>
                  <NavLink
                    to="/admin"
                    end
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    {open && <span>Super Admin</span>}
                  </NavLink>
                  <NavLink
                    to="/admin/branding"
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    <Palette className="h-4 w-4 shrink-0" />
                    {open && <span>Identidade Visual</span>}
                  </NavLink>
                </>
              )}
            </div>
          )}
        </nav>

        <div className="p-2.5 border-t border-border space-y-1">
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {open ? <PanelLeftClose className="h-4 w-4 shrink-0" /> : <PanelLeftOpen className="h-4 w-4 shrink-0" />}
            {open && <span>Recolher</span>}
          </button>
          <button
            onClick={async () => {
              await logout();
              navigate('/auth');
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
          >
            <div className="h-7 w-7 rounded-lg gradient-brand text-primary-foreground text-[11px] font-semibold flex items-center justify-center shrink-0">
              {initials}
            </div>
            {open && (
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-medium truncate text-foreground">{user?.fullName || user?.email}</div>
                <div className="text-[10px] text-muted-foreground truncate">Sair</div>
              </div>
            )}
            {open && <LogOut className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-border bg-card/70 backdrop-blur px-6 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar em toda a plataforma…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button className="h-9 w-9 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground">
            <Bell className="h-4 w-4" />
          </button>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
