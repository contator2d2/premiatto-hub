import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, Pencil, X } from 'lucide-react';
import { api } from '@/lib/api';
import { ALL_ROLES, type AppRole } from '@/lib/utils';

type UserRow = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  jobTitle: string | null;
  status: string;
  roles: AppRole[];
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [nu, setNu] = useState({ email: '', password: '', fullName: '', roles: ['colaborador'] as AppRole[] });
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [resetting, setResetting] = useState<UserRow | null>(null);

  const { data: users, isLoading } = useQuery<UserRow[]>({
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
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Falha ao atualizar perfis'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => { toast.success('Removido'); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Falha ao remover'),
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight font-display">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão de colaboradores e perfis (RBAC).</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="h-10 px-4 rounded-lg gradient-brand text-primary-foreground text-sm font-medium shrink-0">
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
          <ul className="divide-y divide-border">
            {(users ?? []).map((u) => (
              <li key={u.id} className="p-4 sm:px-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center hover:bg-muted/30">
                <div className="min-w-0 space-y-2">
                  <div>
                    <div className="text-sm font-medium truncate">{u.fullName || '—'}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {u.email}
                      {u.jobTitle ? ` · ${u.jobTitle}` : ''}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ALL_ROLES.map((r) => {
                      const active = u.roles.includes(r);
                      return (
                        <button
                          key={r}
                          onClick={() => {
                            const next = active ? u.roles.filter((x) => x !== r) : [...u.roles, r];
                            setRoles.mutate({ id: u.id, roles: next });
                          }}
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-medium ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                        >
                          {r.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {u.status === 'active' ? 'Ativo' : u.status}
                  </span>
                  <button onClick={() => setEditing(u)} title="Editar" className="h-8 px-2.5 rounded-lg border border-border text-xs flex items-center gap-1.5 hover:bg-muted">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button onClick={() => setResetting(u)} title="Resetar senha" className="h-8 px-2.5 rounded-lg border border-border text-xs flex items-center gap-1.5 hover:bg-muted">
                    <KeyRound className="h-3.5 w-3.5" /> Senha
                  </button>
                  <button onClick={() => { if (confirm(`Remover ${u.fullName || u.email}?`)) remove.mutate(u.id); }} className="text-xs text-destructive hover:underline">
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} />}
      {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="w-full sm:max-w-md bg-background border border-border rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold font-display">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    fullName: user.fullName || '',
    phone: user.phone || '',
    jobTitle: user.jobTitle || '',
    status: user.status || 'active',
  });

  const save = useMutation({
    mutationFn: async () => (await api.patch(`/users/${user.id}`, form)).data,
    onSuccess: () => { toast.success('Usuário atualizado'); qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Falha ao salvar'),
  });

  return (
    <Modal title={`Editar ${user.email}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nome completo" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
        <Field label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Cargo" value={form.jobTitle} onChange={(v) => setForm({ ...form, jobTitle: v })} />
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Status</span>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="pending">Pendente</option>
          </select>
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="h-10 px-4 rounded-lg border border-border text-sm">Cancelar</button>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
          {save.isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [pwd, setPwd] = useState(genPassword());

  const save = useMutation({
    mutationFn: async () => (await api.put(`/users/${user.id}/password`, { password: pwd })).data,
    onSuccess: () => { toast.success('Senha redefinida — envie a nova senha ao usuário'); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Falha ao redefinir'),
  });

  return (
    <Modal title={`Resetar senha de ${user.email}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nova senha (mín. 6 caracteres)" value={pwd} onChange={setPwd} />
        <div className="flex gap-2">
          <button onClick={() => setPwd(genPassword())} className="text-xs text-primary hover:underline">Gerar nova</button>
          <button onClick={() => { navigator.clipboard?.writeText(pwd); toast.success('Senha copiada'); }} className="text-xs text-primary hover:underline">
            Copiar
          </button>
        </div>
        <p className="text-xs text-muted-foreground">As sessões ativas do usuário serão encerradas.</p>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="h-10 px-4 rounded-lg border border-border text-sm">Cancelar</button>
        <button onClick={() => save.mutate()} disabled={save.isPending || pwd.length < 6} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
          {save.isPending ? 'Salvando…' : 'Redefinir senha'}
        </button>
      </div>
    </Modal>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
    </label>
  );
}

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  const rnd = new Uint32Array(10);
  crypto.getRandomValues(rnd);
  for (let i = 0; i < 10; i++) out += chars[rnd[i] % chars.length];
  return out;
}
