import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Users, Share2, ShieldCheck, Search, Sparkles, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Premiatto Connect" },
      { name: "description", content: "Visão geral da plataforma Premiatto Connect." },
      { property: "og:title", content: "Dashboard — Premiatto Connect" },
      { property: "og:description", content: "Painel de documentos, usuários e atividades." },
    ],
  }),
  component: DashboardPage,
});

type DocRow = {
  id: string;
  name: string;
  file_type: string | null;
  is_official: boolean;
  created_at: string;
  view_count: number;
};

function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [docs, users, shares, official] = await Promise.all([
        supabase.from("documents" as never).select("id", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("profiles" as never).select("id", { count: "exact", head: true }),
        supabase.from("document_public_links" as never).select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("documents" as never).select("id", { count: "exact", head: true }).eq("is_official", true).eq("is_deleted", false),
      ]);
      return {
        documents: docs.count ?? 0,
        users: users.count ?? 0,
        activeShares: shares.count ?? 0,
        official: official.count ?? 0,
      };
    },
  });
}

function useRecentDocs() {
  return useQuery({
    queryKey: ["recent-docs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents" as never)
        .select("id,name,file_type,is_official,created_at,view_count")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(6);
      return (data as DocRow[] | null) ?? [];
    },
  });
}

function DashboardPage() {
  const { data: me } = useCurrentUser();
  const { data: stats } = useDashboardStats();
  const { data: recent } = useRecentDocs();

  const firstName = me?.profile?.full_name?.split(" ")[0] || "colaborador";

  const cards = [
    { label: "Documentos", value: stats?.documents ?? 0, icon: FileText, color: "text-primary" },
    { label: "Usuários", value: stats?.users ?? 0, icon: Users, color: "text-primary-glow" },
    { label: "Oficiais", value: stats?.official ?? 0, icon: ShieldCheck, color: "text-success" },
    { label: "Links ativos", value: stats?.activeShares ?? 0, icon: Share2, color: "text-warning" },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-10">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Premiatto Connect
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mt-2">Olá, {firstName}.</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aqui está o resumo da sua central de conhecimento.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Pesquisar documentos, usuários..."
            className="w-full h-11 pl-10 pr-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-xl border border-border bg-card p-5 hover:shadow-elegant transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  {c.label}
                </span>
                <Icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{c.value}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Total registrado
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h2 className="font-semibold">Documentos recentes</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Últimos uploads da sua central</p>
            </div>
            <Link to="/documents" className="text-xs font-medium text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {(recent ?? []).length === 0 && (
              <li className="p-10 text-center text-sm text-muted-foreground">
                Nenhum documento ainda. Envie o primeiro para começar.
              </li>
            )}
            {(recent ?? []).map((doc) => (
              <li key={doc.id} className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{doc.name}</span>
                    {doc.is_official && (
                      <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                        Oficial
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: ptBR })}
                    {doc.file_type ? ` • ${doc.file_type.toUpperCase()}` : ""}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {doc.view_count} views
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Ações rápidas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Comece por aqui</p>
          <div className="mt-4 space-y-2">
            <Link to="/documents" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors">
              <FileText className="h-4 w-4 text-primary" />
              <div>
                <div className="text-sm font-medium">Enviar documento</div>
                <div className="text-xs text-muted-foreground">Upload em segundos</div>
              </div>
            </Link>
            {me?.isAdmin && (
              <Link to="/users" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                <Users className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-sm font-medium">Gerenciar usuários</div>
                  <div className="text-xs text-muted-foreground">Convide e defina perfis</div>
                </div>
              </Link>
            )}
            {me?.isAdmin && (
              <Link to="/audit" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-sm font-medium">Auditoria</div>
                  <div className="text-xs text-muted-foreground">Rastreie todas as ações</div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
