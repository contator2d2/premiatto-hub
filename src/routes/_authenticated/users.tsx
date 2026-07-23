import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "Usuários — Premiatto Connect" },
      { name: "description", content: "Gestão de usuários e perfis de acesso." },
      { property: "og:title", content: "Usuários — Premiatto Connect" },
      { property: "og:description", content: "Administre colaboradores e permissões." },
    ],
  }),
  component: UsersPage,
});

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  job_title: string | null;
  status: string;
  created_at: string;
  last_login_at: string | null;
};

function UsersPage() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles" as never)
        .select("id,full_name,email,job_title,status,created_at,last_login_at")
        .order("created_at", { ascending: false });
      const profiles = (data as Profile[] | null) ?? [];
      const { data: roleData } = await supabase.from("user_roles" as never).select("user_id,role");
      const roles = new Map<string, string[]>();
      for (const r of (roleData as { user_id: string; role: string }[]) ?? []) {
        const arr = roles.get(r.user_id) ?? [];
        arr.push(r.role);
        roles.set(r.user_id, arr);
      }
      return profiles.map((p) => ({ ...p, roles: roles.get(p.id) ?? [] }));
    },
  });

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestão de colaboradores e perfis de acesso.</p>
      </header>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : (users ?? []).length === 0 ? (
          <div className="p-16 text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm mt-3 text-muted-foreground">Nenhum usuário ainda</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Nome</th>
                <th className="text-left px-5 py-3 font-medium">Cargo</th>
                <th className="text-left px-5 py-3 font-medium">Perfil</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users!.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full gradient-brand flex items-center justify-center text-primary-foreground text-xs font-semibold">
                        {(u.full_name || u.email).slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{u.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{u.job_title || "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r} className="text-[10px] uppercase tracking-wider bg-accent text-accent-foreground px-2 py-0.5 rounded font-medium">
                          {r.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {u.status === "active" ? "Ativo" : u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(u.created_at), { addSuffix: true, locale: ptBR })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
