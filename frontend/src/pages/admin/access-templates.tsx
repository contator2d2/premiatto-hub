import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Save, ShieldCheck, Users2 } from 'lucide-react';
import { api } from '@/lib/api';
import { MODULES } from '@/lib/modules';
import { ALL_ROLES, type AppRole, cn } from '@/lib/utils';

type Template = {
  id: string;
  name: string;
  description: string | null;
  moduleKeys: string[];
};

type RoleDefault = { role: AppRole; templateId: string };
type UserOverride = { userId: string; templateId: string | null; moduleKeys: string[] };

type ListResponse = {
  templates: Template[];
  roleDefaults: RoleDefault[];
  overrides: UserOverride[];
};

export default function AccessTemplatesPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; description: string; moduleKeys: string[] } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['access-templates'],
    queryFn: async () => (await api.get<ListResponse>('/access-templates')).data,
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data as any[],
  });

  const templates = data?.templates ?? [];
  const selected = useMemo(() => templates.find((t) => t.id === selectedId) ?? null, [templates, selectedId]);

  function startEdit(t: Template | null) {
    if (t) {
      setSelectedId(t.id);
      setDraft({ name: t.name, description: t.description ?? '', moduleKeys: [...t.moduleKeys] });
    } else {
      setSelectedId(null);
      setDraft({ name: '', description: '', moduleKeys: ['dashboard'] });
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      if (selectedId) {
        return (await api.put(`/access-templates/${selectedId}`, draft)).data;
      }
      return (await api.post('/access-templates', draft)).data;
    },
    onSuccess: (t: any) => {
      toast.success('Template salvo');
      qc.invalidateQueries({ queryKey: ['access-templates'] });
      if (t?.id) setSelectedId(t.id);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Falha ao salvar'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/access-templates/${id}`)).data,
    onSuccess: () => {
      toast.success('Template removido');
      setSelectedId(null);
      setDraft(null);
      qc.invalidateQueries({ queryKey: ['access-templates'] });
    },
  });

  const setRoleDefault = useMutation({
    mutationFn: async ({ role, templateId }: { role: AppRole; templateId: string | null }) =>
      (await api.put(`/access-templates/role/${role}`, { templateId })).data,
    onSuccess: () => {
      toast.success('Padrão do perfil atualizado');
      qc.invalidateQueries({ queryKey: ['access-templates'] });
    },
  });

  const setUserOverride = useMutation({
    mutationFn: async ({ userId, templateId }: { userId: string; templateId: string | null }) =>
      (await api.put(`/access-templates/user/${userId}`, { templateId })).data,
    onSuccess: () => {
      toast.success('Acesso do usuário atualizado');
      qc.invalidateQueries({ queryKey: ['access-templates'] });
    },
  });

  function toggleModule(key: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      moduleKeys: draft.moduleKeys.includes(key)
        ? draft.moduleKeys.filter((k) => k !== key)
        : [...draft.moduleKeys, key],
    });
  }

  const overrideByUser = new Map((data?.overrides ?? []).map((o) => [o.userId, o]));
  const roleDefaultByRole = new Map((data?.roleDefaults ?? []).map((r) => [r.role, r]));

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-display">Templates de Acesso</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina quais módulos cada perfil (RBAC) enxerga e sobreponha por usuário quando necessário.
          </p>
        </div>
        <button
          onClick={() => startEdit(null)}
          className="h-10 px-4 rounded-lg gradient-brand text-primary-foreground text-sm font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Novo template
        </button>
      </header>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Lista de templates */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Templates
          </div>
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
          ) : templates.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Nenhum template ainda.</div>
          ) : (
            <ul className="divide-y divide-border">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => startEdit(t)}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors',
                      selectedId === t.id && 'bg-primary/5',
                    )}
                  >
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t.moduleKeys.length} módulo(s)
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Editor */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {!draft ? (
            <div className="text-sm text-muted-foreground py-10 text-center">
              Selecione um template à esquerda ou crie um novo.
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  placeholder="Nome do template (ex.: Colaborador Padrão)"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
                />
                <input
                  placeholder="Descrição (opcional)"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
                />
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Módulos visíveis
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MODULES.map((m) => {
                    const active = draft.moduleKeys.includes(m.key);
                    const locked = m.key === 'dashboard';
                    return (
                      <label
                        key={m.key}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                          active ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/40',
                          locked && 'opacity-70 cursor-not-allowed',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          disabled={locked}
                          onChange={() => !locked && toggleModule(m.key)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium flex items-center gap-2">
                            <m.icon className="h-3.5 w-3.5" />
                            {m.label}
                            {m.status === 'coming_soon' && (
                              <span className="text-[9px] uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">
                                Em breve
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => save.mutate()}
                  disabled={!draft.name.trim() || save.isPending}
                  className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> Salvar template
                </button>
                {selectedId && (
                  <button
                    onClick={() => {
                      if (confirm('Remover este template?')) remove.mutate(selectedId);
                    }}
                    className="text-xs text-destructive hover:underline inline-flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Padrões por perfil */}
      <section className="rounded-xl border border-border bg-card">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Padrão por perfil (RBAC)</h2>
        </div>
        <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_ROLES.filter((r) => r !== 'super_admin').map((role) => {
            const current = roleDefaultByRole.get(role);
            return (
              <div key={role} className="rounded-lg border border-border bg-background p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  {role.replace('_', ' ')}
                </div>
                <select
                  value={current?.templateId ?? ''}
                  onChange={(e) =>
                    setRoleDefault.mutate({ role, templateId: e.target.value || null })
                  }
                  className="w-full h-9 px-2 rounded border border-input bg-background text-sm"
                >
                  <option value="">— Sem template (acesso total) —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </section>

      {/* Overrides por usuário */}
      <section className="rounded-xl border border-border bg-card">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Users2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Sobreposição por usuário</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Usuário</th>
                <th className="text-left px-5 py-3 font-medium">Perfis</th>
                <th className="text-left px-5 py-3 font-medium">Template atribuído</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(users ?? []).map((u: any) => {
                const ov = overrideByUser.get(u.id);
                return (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <div className="font-medium">{u.fullName || '—'}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r: AppRole) => (
                          <span
                            key={r}
                            className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {r.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={ov?.templateId ?? ''}
                        onChange={(e) =>
                          setUserOverride.mutate({ userId: u.id, templateId: e.target.value || null })
                        }
                        className="w-full max-w-xs h-9 px-2 rounded border border-input bg-background text-sm"
                      >
                        <option value="">— Usar padrão do perfil —</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
