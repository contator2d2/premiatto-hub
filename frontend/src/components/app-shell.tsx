import { NavLink, useNavigate } from 'react-router-dom';
import { ReactNode, useState } from 'react';
import {
  ChevronDown,
  ChevronsUpDown,
  Command,
  FileText,
  FolderOpen,
  Heart,
  History,
  Home,
  Inbox,
  LogOut,
  Plus,
  Search,
  Send,
  Share2,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  Users,
  Palette,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useBranding } from '@/contexts/branding-context';
import { cn } from '@/lib/utils';
import { MODULES } from '@/lib/modules';
import { NotificationsBell } from './notifications-bell';

const documentNav = [
  { label: 'Central de Documentos', to: '/documents', icon: FolderOpen, exact: true },
  { label: 'Documentos Oficiais', to: '/documents?filter=officials', icon: ShieldCheck, dot: 'success' as const },
  { label: 'Compartilhados comigo', to: '/documents?filter=shared-with-me', icon: Share2 },
  { label: 'Compartilhados por mim', to: '/documents?filter=shared-by-me', icon: Send },
  { label: 'Pendentes de leitura', to: '/documents?filter=pending', icon: Inbox, badge: true },
  { label: 'Favoritos', to: '/documents?filter=favorites', icon: Heart },
  { label: 'Recentes', to: '/documents?filter=recent', icon: History },
  { label: 'Lixeira', to: '/documents?filter=trash', icon: Trash2 },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
      {children}
    </div>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  end,
  badge,
  dot,
  soon,
}: {
  to: string;
  icon: any;
  label: string;
  end?: boolean;
  badge?: ReactNode;
  dot?: 'success';
  soon?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-[13px] transition-colors',
          isActive
            ? 'bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
            : 'text-sidebar-muted hover:bg-white/[0.04] hover:text-white',
          soon && 'opacity-80',
        )
      }
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary-glow" />
          )}
          <Icon className={cn('h-[16px] w-[16px] shrink-0', isActive ? 'text-primary-glow' : '')} />
          <span className="truncate flex-1">{label}</span>
          {dot === 'success' && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
          {badge}
          {soon && (
            <span className="text-[9px] font-medium uppercase tracking-wider text-sidebar-muted bg-white/[0.06] px-1.5 py-0.5 rounded">
              Em breve
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const { branding } = useBranding();
  const [userMenu, setUserMenu] = useState(false);
  const navigate = useNavigate();

  const appName = branding?.appName || 'Premiatto';
  const initials = (user?.fullName || user?.email || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const allowed = user?.allowedModules;
  const canSee = (key: string) => isSuperAdmin || !allowed || allowed.includes(key);

  const otherModules = MODULES.filter(
    (m) => !['dashboard', 'documents', 'policies'].includes(m.key),
  ).filter((m) => canSee(m.key));

  return (
    <div className="min-h-screen flex bg-muted/40">
      {/* Sidebar */}
      <aside className="w-[260px] shrink-0 gradient-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        {/* Brand */}
        <div className="h-[72px] px-5 flex items-center gap-3 border-b border-sidebar-border/60">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-xl gradient-brand flex items-center justify-center text-primary-foreground font-display font-bold text-lg shadow-elegant">
              P
            </div>
          )}
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-display font-bold text-[15px] tracking-tight truncate">{appName}</span>
            <span className="text-[9px] uppercase tracking-[0.22em] text-sidebar-muted">Connect</span>
          </div>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          <NavItem to="/dashboard" icon={Home} label="Início" end />

          <SectionLabel>Gestão de Documentos</SectionLabel>
          {documentNav.map((n) => (
            <NavItem
              key={n.label}
              to={n.to}
              icon={n.icon}
              label={n.label}
              dot={n.dot}
              badge={
                n.badge ? (
                  <span className="text-[10px] font-semibold bg-primary text-primary-foreground rounded-md min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                    12
                  </span>
                ) : undefined
              }
            />
          ))}

          {canSee('policies') && (
            <>
              <SectionLabel>Políticas</SectionLabel>
              <NavItem to="/admin/policies" icon={ShieldCheck} label="Políticas de Documentos" />
            </>
          )}

          <SectionLabel>Operação</SectionLabel>
          <NavItem to="/requests" icon={Inbox} label="Central de Solicitações" soon />
          <NavItem to="/communication" icon={Send} label="Comunicações" soon />

          {otherModules.length > 0 && (
            <>
              <SectionLabel>Outros módulos</SectionLabel>
              {otherModules.slice(0, 8).map((m) => (
                <NavItem
                  key={m.key}
                  to={m.to}
                  icon={m.icon}
                  label={m.label}
                  soon={m.status === 'coming_soon'}
                />
              ))}
              <button
                onClick={() => navigate('/dashboard')}
                className="mx-2 mt-1 w-[calc(100%-1rem)] flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-sidebar-muted hover:bg-white/[0.04] hover:text-white transition-colors"
              >
                <Plus className="h-4 w-4" />
                Ver todos os módulos
              </button>
            </>
          )}

          {(isAdmin || isSuperAdmin) && (
            <>
              <SectionLabel>Administração</SectionLabel>
              {isAdmin && <NavItem to="/users" icon={Users} label="Usuários" />}
              {isAdmin && <NavItem to="/audit" icon={ShieldCheck} label="Auditoria" />}
              {isSuperAdmin && <NavItem to="/admin" icon={Settings} label="Super Admin" end />}
              {isSuperAdmin && (
                <NavItem to="/admin/access-templates" icon={ShieldCheck} label="Templates de Acesso" />
              )}
              {isSuperAdmin && <NavItem to="/admin/branding" icon={Palette} label="Identidade Visual" />}
            </>
          )}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-sidebar-border/60 relative">
          <button
            onClick={() => setUserMenu((v) => !v)}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.05] transition-colors"
          >
            <div className="h-9 w-9 rounded-full gradient-brand text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[13px] font-semibold text-white truncate">
                {user?.fullName || user?.email}
              </div>
              <div className="text-[11px] text-sidebar-muted truncate">
                {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : user?.jobTitle || 'Colaborador'}
              </div>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-muted" />
          </button>
          {userMenu && (
            <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-sidebar-border bg-sidebar-2 shadow-2xl overflow-hidden">
              <button
                onClick={async () => {
                  await logout();
                  navigate('/auth');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-sidebar-foreground hover:bg-white/[0.06]"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-border bg-card px-6 flex items-center gap-4">
          <div className="flex-1 max-w-2xl mx-auto relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar arquivos, pastas, usuários, documentos oficiais…"
              className="w-full h-10 pl-10 pr-16 rounded-xl border border-border bg-muted/50 text-sm focus:outline-none focus:bg-card focus:ring-2 focus:ring-ring/40 transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[11px] text-muted-foreground bg-card border border-border rounded px-1.5 py-0.5">
              <Command className="h-3 w-3" /> K
            </span>
          </div>
          <NotificationsBell />
          <button
            className="h-9 w-9 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center text-muted-foreground"
            aria-label="Tema"
          >
            <Sun className="h-4 w-4" />
          </button>
          <button className="h-9 pl-1 pr-3 rounded-full border border-border bg-card hover:bg-muted flex items-center gap-2">
            <div className="h-7 w-7 rounded-full gradient-brand text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
              {initials}
            </div>
            <span className="text-sm font-medium truncate max-w-[100px]">
              {(user?.fullName || 'Premiatto').split(' ')[0]}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </header>
        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
