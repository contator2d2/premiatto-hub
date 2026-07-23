import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ALL_ROLES, type AppRole } from '@/lib/utils';

export default function UsersPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [nu, setNu] = useState({ email: '', password: '', fullName: '', roles: ['colaborador'] as AppRole[] });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  const create = useMutation({
    mutationFn: async () => (await api.post('/users', nu)).data,
    onSuccess: () => { toast.success('Usuário criado'); setShowNew(false); setNu({ email: '', password: '', fullName: '', roles: ['colaborador'] }); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Falha ao criar'),
  });

  const setRoles = useMutation({
    mutationFn: async ({ id, roles }: { id: string; roles: AppRole[] }) => (await api.put(`/users/${id}/roles`, { roles })).data,
    onSuccess: () => { toast.success('Perfil atualizado'); qc.invalidateQueries({ queryKey: ['users'] }); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => { toast.success('Removido'); qc.invalidateQueries({ queryKey: ['users'] }); },
  });

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-display">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão de colaboradores e perfis (RBAC).</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="h-10 px-4 rounded-lg gradient-brand text-primary-foreground text-sm font-medium">
          {showNew ? 'Cancelar' : 'Novo usuário'}
        </button>
      </header>

      {showNew && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <input placeholder="Nome" value={nu.fullName} onChange={(e) => setNu({ ...nu, fullName: e.target.value })} className="h-10 px-3 rounded-lg border border-input bg-background text-sm" />
            <input placeholder="E-mail" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} className="h-10 px-3 rounded-lg border border-input bg-background text-sm" />
            <input placeholder="Senha inicial" type="password" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} className="h-10 px-3 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2 text-xs px-2 py-1 rounded border border-border bg-background">
                <input
                  type="checkbox"
                  checked={nu.roles.includes(r)}
                  onChange={(e) => setNu({ ...nu, roles: e.target.checked ? [...nu.roles, r] : nu.roles.filter((x) => x !== r) })}
                />
                {r.replace('_', ' ')}
              </label>
            ))}
          </div>
          <button onClick={() => create.mutate()} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Criar</button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Nome</th>
                <th className="text-left px-5 py-3 font-medium">Perfis</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-right px-5 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(users ?? []).map((u: any) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <div className="font-medium">{u.fullName || '—'}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {ALL_ROLES.map((r) => {
                        const active = u.roles.includes(r);
                        return (
                          <button
                            key={r}
                            onClick={() => {
                              const next = active ? u.roles.filter((x: AppRole) => x !== r) : [...u.roles, r];
                              setRoles.mutate({ id: u.id, roles: next });
                            }}
                            className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-medium ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                          >
                            {r.replace('_', ' ')}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => remove.mutate(u.id)} className="text-xs text-destructive hover:underline">Remover</button>
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
