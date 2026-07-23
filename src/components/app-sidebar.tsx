import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  LayoutDashboard,
  FileText,
  Users,
  ShieldCheck,
  Star,
  Share2,
  Trash2,
  Settings,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";

const NAV_MAIN = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Documentos", to: "/documents", icon: FileText },
  { label: "Favoritos", to: "/favorites", icon: Star },
  { label: "Compartilhados", to: "/shared", icon: Share2 },
  { label: "Lixeira", to: "/trash", icon: Trash2 },
] as const;

const NAV_ADMIN = [
  { label: "Usuários", to: "/users", icon: Users },
  { label: "Auditoria", to: "/audit", icon: ShieldCheck },
  { label: "Configurações", to: "/settings", icon: Settings },
] as const;

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();

  async function handleLogout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <aside
      className={`${collapsed ? "w-16" : "w-64"} h-screen sticky top-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-[width] duration-200`}
    >
      <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border">
        <button
          onClick={onToggle}
          className="h-9 w-9 rounded-lg gradient-brand flex items-center justify-center shrink-0"
          aria-label="Alternar menu"
        >
          <Building2 className="h-4 w-4 text-primary-foreground" />
        </button>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate text-sidebar-foreground">Premiatto</div>
            <div className="text-[11px] text-muted-foreground truncate">Connect</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        <div>
          {!collapsed && (
            <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Menu
            </div>
          )}
          <ul className="space-y-0.5">
            {NAV_MAIN.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`flex items-center gap-3 px-3 h-9 rounded-md text-sm transition-colors ${
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {me?.isAdmin && (
          <div>
            {!collapsed && (
              <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Administração
              </div>
            )}
            <ul className="space-y-0.5">
              {NAV_ADMIN.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`flex items-center gap-3 px-3 h-9 rounded-md text-sm transition-colors ${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && me?.profile && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-md">
            <div className="h-8 w-8 rounded-full gradient-brand flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
              {(me.profile.full_name || me.profile.email).slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{me.profile.full_name || me.profile.email}</div>
              <div className="text-[11px] text-muted-foreground truncate capitalize">
                {me.roles[0]?.replace("_", " ") ?? "colaborador"}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 h-9 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(false);
  return { collapsed, toggle: () => setCollapsed((c) => !c) };
}
