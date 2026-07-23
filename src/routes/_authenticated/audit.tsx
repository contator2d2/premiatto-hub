import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Auditoria — Premiatto Connect" },
      { name: "description", content: "Registro completo de atividades da plataforma." },
      { property: "og:title", content: "Auditoria — Premiatto Connect" },
      { property: "og:description", content: "Rastreio de ações e conformidade." },
    ],
  }),
  component: AuditPage,
});

type LogRow = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user_id: string | null;
};

function AuditPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_log" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return (data as LogRow[] | null) ?? [];
    },
  });

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
        <p className="text-sm text-muted-foreground mt-1">Todas as ações registradas na plataforma.</p>
      </header>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : (logs ?? []).length === 0 ? (
          <div className="p-16 text-center">
            <ShieldCheck className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm mt-3 text-muted-foreground">Nenhum registro ainda</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {logs!.map((l) => (
              <li key={l.id} className="p-4 flex items-center gap-4 hover:bg-muted/30">
                <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4 text-accent-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{l.action}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {l.entity_type ?? "—"} · {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
                  </div>
                </div>
                {l.ip_address && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">{l.ip_address}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
