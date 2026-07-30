import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronsUpDown,
  Command,
  FolderOpen,
  Heart,
  History,
  Home,
  Inbox,
  LayoutGrid,
  LogOut,
  Menu,
  Pin,
  PinOff,
  Search,
  Send,
  Share2,
  Settings,
  ShieldCheck,
  KeyRound,
  Sun,
  Trash2,
  Users,
  Palette,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useBranding } from '@/contexts/branding-context';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/brand-logo';
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

const PIN_KEY = 'connect.sidebar.pinned';

function NavItem({
  to,
  icon: Icon,
  label,
  end,
  badge,
  dot,
  soon,
  compact,
  expanded,
  onNavigate,
}: {
  to: string;
  icon: any;
  label: string;
  end?: boolean;
  badge?: ReactNode;
  dot?: 'success';
  soon?: boolean;
  compact?: boolean;
  expanded: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={!expanded ? label : undefined}
      className={({ isActive }: { isActive: boolean }) =>
        cn(
          'group relative flex items-center gap-3 mx-2 rounded-lg text-[13px] transition-colors',
          expanded ? 'px-3 py-2' : 'justify-center px-0 py-2',
          compact && expanded && 'pl-6',
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
          {expanded && (
            <>
              <span className="truncate flex-1">{label}</span>
              {dot === 'success' && <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />}
              {badge}
              {soon && (
                <span className="text-[9px] font-medium uppercase tracking-wider text-sidebar-muted bg-white/[0.06] px-1.5 py-0.5 rounded shrink-0">
                  Em breve
                </span>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  );
}

function AccordionGroup({
  label,
  icon: Icon,
  open,
  onToggle,
  expanded,
  active,
  children,
}: {
  label: string;
  icon: any;
  open: boolean;
  onToggle: () => void;
  expanded: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mt-1">
      <button
        onClick={onToggle}
        title={!expanded ? label : undefined}
        className={cn(
          'w-[calc(100%-1rem)] mx-2 flex items-center gap-3 rounded-lg text-[13px] transition-colors',
          expanded ? 'px-3 py-2' : 'justify-center px-0 py-2',
          active || open ? 'text-white bg-white/[0.04]' : 'text-sidebar-muted hover:bg-white/[0.04] hover:text-white',
        )}
      >
        <Icon className="h-[16px] w-[16px] shrink-0" />
        {expanded && (
          <>
            <span className="truncate flex-1 text-left font-medium">{label}</span>
            <ChevronDown
              className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open ? 'rotate-0' : '-rotate-90')}
            />
          </>
        )}
      </button>
      {expanded && (
        <div
          className={cn(
            'grid transition-all duration-200 ease-out',
            open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div className="pt-1 pb-1 space-y-0.5">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const { branding } = useBranding();
  const [userMenu, setUserMenu] = useState(false);
  const [pwdModal, setPwdModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  useEffect(() => {
    const saved = localStorage.getItem(PIN_KEY);
    if (saved !== null) setPinned(saved === '1');
  }, []);

  useEffect(() => {
    localStorage.setItem(PIN_KEY, pinned ? '1' : '0');
  }, [pinned]);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenu(false);
  }, [location.key]);

  const inDocs = path.startsWith('/documents');
  const inAdmin = path.startsWith('/admin') || path === '/users' || path === '/audit';

  const [groups, setGroups] = useState<Record<string, boolean>>({
    docs: true,
    modules: false,
    admin: false,
  });

  useEffect(() => {
    setGroups((g) => ({ ...g, docs: g.docs || inDocs, admin: g.admin || inAdmin }));
  }, [inDocs, inAdmin]);

  const appName = branding?.appName || 'Premiatto';
  const initials = (user?.fullName || user?.email || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const allowed = user?.allowedModules;
  const canSee = (key: string) => isSuperAdmin || !allowed || allowed.includes(key);

  const otherModules = useMemo(
    () =>
      MODULES.filter((m) => !['dashboard', 'documents', 'policies'].includes(m.key)).filter((m) =>
        canSee(m.key),
      ),
    [allowed, isSuperAdmin],
  );

  // Sidebar is expanded when: mobile drawer open, pinned, or hovered (desktop peek)
  const expanded = mobileOpen || pinned || hovered;
  const toggleGroup = (key: string) => {
    if (!expanded) {
      setPinned(true);
      setGroups((g) => ({ ...g, [key]: true }));
      return;
    }
    setGroups((g) => ({ ...g, [key]: !g[key] }));
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen flex bg-muted/40">
      {/* Overlay (mobile) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'gradient-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border',
          'fixed inset-y-0 left-0 z-50 transition-all duration-200 ease-out',
          'lg:sticky lg:top-0 lg:h-screen lg:z-30 lg:translate-x-0',
          mobileOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full w-[280px]',
          pinned || hovered ? 'lg:w-[260px]' : 'lg:w-[68px]',
          !pinned && hovered && 'lg:shadow-2xl',
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            'h-[72px] flex items-center gap-3 border-b border-sidebar-border/60 shrink-0',
            expanded ? 'px-5' : 'px-0 justify-center',
          )}
        >
          <BrandLogo
            src={branding?.logoUrl}
            className="h-10 w-10 rounded-xl object-cover shrink-0"
            fallback={
              <div className="h-10 w-10 rounded-xl gradient-brand flex items-center justify-center text-primary-foreground font-display font-bold text-lg shadow-elegant shrink-0">
                P
              </div>
            }
          />
          {expanded && (
            <>
              <div className="flex flex-col leading-tight min-w-0 flex-1">
                <span className="font-display font-bold text-[15px] tracking-tight truncate">{appName}</span>
                <span className="text-[9px] uppercase tracking-[0.22em] text-sidebar-muted">Connect</span>
              </div>
              <button
                onClick={() => setPinned((v) => !v)}
                title={pinned ? 'Desafixar menu' : 'Fixar menu aberto'}
                aria-label={pinned ? 'Desafixar menu' : 'Fixar menu aberto'}
                className={cn(
                  'hidden lg:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                  pinned
                    ? 'bg-white/[0.10] text-primary-glow'
                    : 'text-sidebar-muted hover:bg-white/[0.06] hover:text-white',
                )}
              >
                {pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
              </button>
              <button
                onClick={closeMobile}
                aria-label="Fechar menu"
                className="lg:hidden h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-sidebar-muted hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          <NavItem to="/dashboard" icon={Home} label="Início" end expanded={expanded} onNavigate={closeMobile} />

          <AccordionGroup
            label="Gestão de Documentos"
            icon={FolderOpen}
            open={!!groups.docs}
            onToggle={() => toggleGroup('docs')}
            expanded={expanded}
            active={inDocs}
          >
            {documentNav.map((n) => (
              <NavItem
                key={n.label}
                to={n.to}
                icon={n.icon}
                label={n.label}
                dot={n.dot}
                compact
                expanded={expanded}
                onNavigate={closeMobile}
                badge={
                  n.badge ? (
                    <span className="text-[10px] font-semibold bg-primary text-primary-foreground rounded-md min-w-[20px] h-5 px-1.5 flex items-center justify-center shrink-0">
                      12
                    </span>
                  ) : undefined
                }
              />
            ))}
          </AccordionGroup>

          {canSee('policies') && (
            <NavItem
              to="/admin/policies"
              icon={ShieldCheck}
              label="Políticas de Documentos"
              expanded={expanded}
              onNavigate={closeMobile}
            />
          )}

          {otherModules.length > 0 && (
            <AccordionGroup
              label="Módulos"
              icon={LayoutGrid}
              open={!!groups.modules}
              onToggle={() => toggleGroup('modules')}
              expanded={expanded}
            >
              {otherModules.map((m) => (
                <NavItem
                  key={m.key}
                  to={m.to}
                  icon={m.icon}
                  label={m.label}
                  compact
                  soon={m.status === 'coming_soon'}
                  expanded={expanded}
                  onNavigate={closeMobile}
                />
              ))}
            </AccordionGroup>
          )}

          {(isAdmin || isSuperAdmin) && (
            <AccordionGroup
              label="Administração"
              icon={Settings}
              open={!!groups.admin}
              onToggle={() => toggleGroup('admin')}
              expanded={expanded}
              active={inAdmin}
            >
              {isAdmin && (
                <NavItem to="/users" icon={Users} label="Usuários" compact expanded={expanded} onNavigate={closeMobile} />
              )}
              {isAdmin && (
                <NavItem
                  to="/audit"
                  icon={ShieldCheck}
                  label="Auditoria"
                  compact
                  expanded={expanded}
                  onNavigate={closeMobile}
                />
              )}
              {isSuperAdmin && (
                <NavItem
                  to="/admin"
                  icon={Settings}
                  label="Super Admin"
                  end
                  compact
                  expanded={expanded}
                  onNavigate={closeMobile}
                />
              )}
              {isSuperAdmin && (
                <NavItem
                  to="/admin/access-templates"
                  icon={ShieldCheck}
                  label="Templates de Acesso"
                  compact
                  expanded={expanded}
                  onNavigate={closeMobile}
                />
              )}
              {isSuperAdmin && (
                <NavItem
                  to="/admin/branding"
                  icon={Palette}
                  label="Identidade Visual"
                  compact
                  expanded={expanded}
                  onNavigate={closeMobile}
                />
              )}
            </AccordionGroup>
          )}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-sidebar-border/60 relative shrink-0">
          <button
            onClick={() => (expanded ? setUserMenu((v) => !v) : setPinned(true))}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl hover:bg-white/[0.05] transition-colors',
              expanded ? 'p-2' : 'p-1 justify-center',
            )}
          >
            <div className="h-9 w-9 rounded-full gradient-brand text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0">
              {initials}
            </div>
            {expanded && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[13px] font-semibold text-white truncate">
                    {user?.fullName || user?.email}
                  </div>
                  <div className="text-[11px] text-sidebar-muted truncate">
                    {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : user?.jobTitle || 'Colaborador'}
                  </div>
                </div>
                <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-muted shrink-0" />
              </>
            )}
          </button>
          {userMenu && expanded && (
            <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-sidebar-border bg-sidebar-2 shadow-2xl overflow-hidden">
              <button
                onClick={() => { setUserMenu(false); setPwdModal(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-sidebar-foreground hover:bg-white/[0.06]"
              >
                <KeyRound className="h-4 w-4" />
                Trocar senha
              </button>
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
        <header className="h-16 border-b border-border bg-card px-3 sm:px-6 flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="lg:hidden h-9 w-9 shrink-0 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center text-muted-foreground"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="flex-1 min-w-0 max-w-2xl mx-auto relative hidden sm:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar arquivos, pastas, usuários…"
              className="w-full h-10 pl-10 pr-16 rounded-xl border border-border bg-muted/50 text-sm focus:outline-none focus:bg-card focus:ring-2 focus:ring-ring/40 transition-colors"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-0.5 text-[11px] text-muted-foreground bg-card border border-border rounded px-1.5 py-0.5">
              <Command className="h-3 w-3" /> K
            </span>
          </div>
          <div className="flex-1 sm:hidden" />

          <button
            aria-label="Buscar"
            className="sm:hidden h-9 w-9 shrink-0 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center text-muted-foreground"
          >
            <Search className="h-4 w-4" />
          </button>
          <NotificationsBell />
          <button
            className="hidden sm:flex h-9 w-9 shrink-0 rounded-lg border border-border bg-card hover:bg-muted items-center justify-center text-muted-foreground"
            aria-label="Tema"
          >
            <Sun className="h-4 w-4" />
          </button>
          <button className="h-9 shrink-0 pl-1 pr-1 sm:pr-3 rounded-full border border-border bg-card hover:bg-muted flex items-center gap-2">
            <div className="h-7 w-7 rounded-full gradient-brand text-primary-foreground text-[10px] font-semibold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <span className="hidden sm:inline text-sm font-medium truncate max-w-[100px]">
              {(user?.fullName || 'Premiatto').split(' ')[0]}
            </span>
            <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </header>
        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>
      {pwdModal && <ChangePasswordModal onClose={() => setPwdModal(false)} />}
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (newPassword.length < 6) return toast.error('A nova senha precisa de ao menos 6 caracteres');
    if (newPassword !== confirm) return toast.error('As senhas não conferem');
    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Senha alterada com sucesso');
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Falha ao alterar senha');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="w-full sm:max-w-md bg-background border border-border rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold font-display">Trocar senha</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <input type="password" placeholder="Senha atual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
          <input type="password" placeholder="Nova senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
          <input type="password" placeholder="Confirmar nova senha" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-border text-sm">Cancelar</button>
          <button onClick={submit} disabled={saving} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
