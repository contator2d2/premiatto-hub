import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Copy,
  Trash2,
  Save,
  Play,
  ShieldAlert,
  ShieldCheck,
  Power,
  PowerOff,
  Sparkles,
  FileWarning,
  History,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type PolicyStatus = 'draft' | 'active' | 'inactive' | 'archived';

type Policy = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: PolicyStatus;
  priority: number;
  isSystem: boolean;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  conditions: any;
  permissions: any;
  sharingRules: any;
  securityRules: any;
  readingRules: any;
  versioningRules: any;
  retentionRules: any;
  _count?: { folders: number; documents: number; exceptions: number };
};

type Exception = {
  id: string;
  policyId: string;
  documentId: string | null;
  requestedBy: string;
  reason: string;
  requestedAction: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reviewNotes: string | null;
  createdAt: string;
  policy?: { id: string; name: string };
};

type Preset = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  config: any;
  isSystem: boolean;
};

const STATUS_LABEL: Record<PolicyStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativa',
  inactive: 'Inativa',
  archived: 'Arquivada',
};

const STATUS_COLORS: Record<PolicyStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30',
  inactive: 'bg-amber-500/15 text-amber-500 border border-amber-500/30',
  archived: 'bg-muted text-muted-foreground',
};

type Draft = Omit<Policy, 'id' | 'isSystem' | '_count'>;

const EMPTY_DRAFT: Draft = {
  name: '',
  description: '',
  category: '',
  status: 'draft',
  priority: 100,
  effectiveFrom: null,
  effectiveUntil: null,
  conditions: {},
  permissions: {},
  sharingRules: {},
  securityRules: {},
  readingRules: {},
  versioningRules: {},
  retentionRules: {},
};

type Tab = 'policies' | 'presets' | 'exceptions' | 'reports' | 'audit';

export default function PoliciesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('policies');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const policies = useQuery({
    queryKey: ['policies'],
    queryFn: async () => (await api.get<Policy[]>('/policies')).data,
  });

  const selected = useMemo(
    () => policies.data?.find((p: Policy) => p.id === selectedId) ?? null,
    [policies.data, selectedId],
  );

  function startEdit(p: Policy | null) {
    if (p) {
      setSelectedId(p.id);
      setDraft({
        name: p.name,
        description: p.description ?? '',
        category: p.category ?? '',
        status: p.status,
        priority: p.priority,
        effectiveFrom: p.effectiveFrom,
        effectiveUntil: p.effectiveUntil,
        conditions: p.conditions || {},
        permissions: p.permissions || {},
        sharingRules: p.sharingRules || {},
        securityRules: p.securityRules || {},
        readingRules: p.readingRules || {},
        versioningRules: p.versioningRules || {},
        retentionRules: p.retentionRules || {},
      });
    } else {
      setSelectedId(null);
      setDraft({ ...EMPTY_DRAFT });
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      const payload = { ...draft };
      if (selectedId) return (await api.put(`/policies/${selectedId}`, payload)).data;
      return (await api.post('/policies', payload)).data;
    },
    onSuccess: () => {
      toast.success('Política salva');
      qc.invalidateQueries({ queryKey: ['policies'] });
      setDraft(null);
      setSelectedId(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao salvar'),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PolicyStatus }) =>
      (await api.put(`/policies/${id}/status`, { status })).data,
    onSuccess: () => {
      toast.success('Status atualizado');
      qc.invalidateQueries({ queryKey: ['policies'] });
    },
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) => (await api.post(`/policies/${id}/duplicate`, {})).data,
    onSuccess: () => {
      toast.success('Política duplicada');
      qc.invalidateQueries({ queryKey: ['policies'] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/policies/${id}`)).data,
    onSuccess: () => {
      toast.success('Política removida');
      qc.invalidateQueries({ queryKey: ['policies'] });
      setSelectedId(null);
      setDraft(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao remover'),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-semibold">Políticas de Documentos</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Regras padronizadas de segurança, compartilhamento, versionamento e retenção aplicadas
            automaticamente a pastas, categorias e documentos.
          </p>
        </div>
        {tab === 'policies' && (
          <button
            onClick={() => startEdit(null)}
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Nova política
          </button>
        )}
      </header>

      <nav className="flex gap-1 border-b border-border">
        {[
          { k: 'policies', label: 'Políticas', icon: ShieldCheck },
          { k: 'presets', label: 'Presets de compartilhamento', icon: Sparkles },
          { k: 'exceptions', label: 'Exceções', icon: ShieldAlert },
          { k: 'reports', label: 'Relatórios', icon: FileWarning },
          { k: 'audit', label: 'Auditoria', icon: History },
        ].map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k as Tab)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px',
              tab === k
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </nav>

      {tab === 'policies' && (
        <div className="grid lg:grid-cols-[380px,1fr] gap-6">
          <aside className="space-y-2">
            {policies.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
            {policies.data?.map((p: Policy) => (
              <button
                key={p.id}
                onClick={() => startEdit(p)}
                className={cn(
                  'w-full text-left rounded-lg border border-border p-3 hover:border-primary transition',
                  selectedId === p.id && 'border-primary bg-primary/5',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-sm">{p.name}</div>
                  <span className={cn('text-[10px] uppercase px-2 py-0.5 rounded', STATUS_COLORS[p.status])}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
                {p.description && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</div>
                )}
                <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                  {p.category && <span>#{p.category}</span>}
                  <span>Prio {p.priority}</span>
                  <span>{p._count?.documents ?? 0} docs</span>
                  <span>{p._count?.folders ?? 0} pastas</span>
                  {p.isSystem && <span className="text-primary">sistema</span>}
                </div>
              </button>
            ))}
          </aside>

          <section>
            {!draft && (
              <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Selecione uma política para editar ou crie uma nova.
              </div>
            )}
            {draft && (
              <PolicyEditor
                draft={draft}
                setDraft={setDraft}
                selected={selected}
                onSave={() => save.mutate()}
                onDuplicate={() => selected && duplicate.mutate(selected.id)}
                onRemove={() => selected && confirm('Remover esta política?') && remove.mutate(selected.id)}
                onToggle={(s) => selected && setStatus.mutate({ id: selected.id, status: s })}
                saving={save.isPending}
              />
            )}
          </section>
        </div>
      )}

      {tab === 'presets' && <PresetsTab />}
      {tab === 'exceptions' && <ExceptionsTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}

// ---------- Policy editor ----------
function PolicyEditor({
  draft,
  setDraft,
  selected,
  onSave,
  onDuplicate,
  onRemove,
  onToggle,
  saving,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  selected: Policy | null;
  onSave: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onToggle: (s: PolicyStatus) => void;
  saving: boolean;
}) {
  const patch = (k: keyof Draft, v: any) => setDraft({ ...draft, [k]: v });
  const patchJson = (k: keyof Draft, kk: string, v: any) =>
    setDraft({ ...draft, [k]: { ...(draft as any)[k], [kk]: v } });

  return (
    <div className="rounded-lg border border-border p-6 space-y-6 bg-card">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Nome">
          <input
            value={draft.name}
            onChange={(e) => patch('name', e.target.value)}
            className="input"
            placeholder="Ex: Documentos Jurídicos"
          />
        </Field>
        <Field label="Categoria">
          <input
            value={draft.category ?? ''}
            onChange={(e) => patch('category', e.target.value)}
            className="input"
            placeholder="juridico, marketing, oficial…"
          />
        </Field>
        <Field label="Descrição" className="md:col-span-2">
          <textarea
            value={draft.description ?? ''}
            onChange={(e) => patch('description', e.target.value)}
            className="input min-h-[70px]"
          />
        </Field>
        <Field label="Prioridade (menor = maior peso)">
          <input
            type="number"
            value={draft.priority}
            onChange={(e) => patch('priority', Number(e.target.value))}
            className="input"
          />
        </Field>
        <Field label="Status">
          <select
            value={draft.status}
            onChange={(e) => patch('status', e.target.value as PolicyStatus)}
            className="input"
          >
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vigência de">
          <input
            type="date"
            value={draft.effectiveFrom?.slice(0, 10) ?? ''}
            onChange={(e) => patch('effectiveFrom', e.target.value || null)}
            className="input"
          />
        </Field>
        <Field label="Vigência até">
          <input
            type="date"
            value={draft.effectiveUntil?.slice(0, 10) ?? ''}
            onChange={(e) => patch('effectiveUntil', e.target.value || null)}
            className="input"
          />
        </Field>
      </div>

      <RulesSection title="Condições de aplicação" hint="Quando esta política deve ser aplicada automaticamente.">
        <BoolRow label="Aplicar a documentos oficiais" v={!!draft.conditions?.isOfficial} onChange={(v) => patchJson('conditions', 'isOfficial', v)} />
        <ListRow label="Categorias" v={draft.conditions?.categories ?? []} onChange={(v) => patchJson('conditions', 'categories', v)} placeholder="Jurídico, Contratos" />
        <ListRow label="Confidencialidade" v={draft.conditions?.confidentiality ?? []} onChange={(v) => patchJson('conditions', 'confidentiality', v)} placeholder="internal, confidential, restricted" />
      </RulesSection>

      <RulesSection title="Permissões" hint="Quem pode ver, compartilhar e publicar.">
        <ListRow label="Podem visualizar (perfis)" v={draft.permissions?.view ?? []} onChange={(v) => patchJson('permissions', 'view', v)} placeholder="all, juridico, gestor" />
        <ListRow label="Podem compartilhar (perfis)" v={draft.permissions?.share ?? []} onChange={(v) => patchJson('permissions', 'share', v)} placeholder="juridico, gestor, super_admin" />
        <BoolRow label="Bloquear compartilhamento por leitores" v={!!draft.permissions?.blockReadersShare} onChange={(v) => patchJson('permissions', 'blockReadersShare', v)} />
      </RulesSection>

      <RulesSection title="Compartilhamento" hint="Regras para links externos e internos.">
        <BoolRow label="Link externo exige senha" v={!!draft.sharingRules?.externalRequirePassword} onChange={(v) => patchJson('sharingRules', 'externalRequirePassword', v)} />
        <BoolRow label="Link externo expira automaticamente" v={!!draft.sharingRules?.externalExpires} onChange={(v) => patchJson('sharingRules', 'externalExpires', v)} />
        <BoolRow label="Bloquear download externo" v={!!draft.sharingRules?.blockExternalDownload} onChange={(v) => patchJson('sharingRules', 'blockExternalDownload', v)} />
        <BoolRow label="Bloquear links públicos" v={!!draft.sharingRules?.blockPublicLinks} onChange={(v) => patchJson('sharingRules', 'blockPublicLinks', v)} />
        <BoolRow label="Link pode ser revogado" v={!!draft.sharingRules?.revocable} onChange={(v) => patchJson('sharingRules', 'revocable', v)} />
        <NumRow label="Limite de acessos externos" v={draft.sharingRules?.limitAccesses ?? ''} onChange={(v) => patchJson('sharingRules', 'limitAccesses', v)} />
      </RulesSection>

      <RulesSection title="Segurança" hint="Rastreamento e alertas.">
        <BoolRow label="Auditar toda abertura" v={!!draft.securityRules?.auditAllAccess} onChange={(v) => patchJson('securityRules', 'auditAllAccess', v)} />
        <BoolRow label="Registrar dispositivo/IP" v={!!draft.securityRules?.trackDevice} onChange={(v) => patchJson('securityRules', 'trackDevice', v)} />
        <BoolRow label="Alertar em acesso suspeito" v={!!draft.securityRules?.alertOnSuspicious} onChange={(v) => patchJson('securityRules', 'alertOnSuspicious', v)} />
        <BoolRow label="Bloquear download" v={!!draft.securityRules?.blockDownload} onChange={(v) => patchJson('securityRules', 'blockDownload', v)} />
        <BoolRow label="Bloquear impressão" v={!!draft.securityRules?.blockPrint} onChange={(v) => patchJson('securityRules', 'blockPrint', v)} />
      </RulesSection>

      <RulesSection title="Leitura" hint="Exigência de ciência e prazos.">
        <BoolRow label="Exigir confirmação de leitura" v={!!draft.readingRules?.requireAcknowledgement} onChange={(v) => patchJson('readingRules', 'requireAcknowledgement', v)} />
        <BoolRow label="Nova versão gera nova ciência" v={!!draft.readingRules?.newVersionRequiresAck} onChange={(v) => patchJson('readingRules', 'newVersionRequiresAck', v)} />
        <NumRow label="Prazo de leitura (dias)" v={draft.readingRules?.deadlineDays ?? ''} onChange={(v) => patchJson('readingRules', 'deadlineDays', v)} />
        <BoolRow label="Notificar gestor sobre pendências" v={!!draft.readingRules?.notifyManager} onChange={(v) => patchJson('readingRules', 'notifyManager', v)} />
      </RulesSection>

      <RulesSection title="Versionamento" hint="Como o sistema trata múltiplas versões.">
        <BoolRow label="Exigir controle de versões" v={!!draft.versioningRules?.enforceVersioning} onChange={(v) => patchJson('versioningRules', 'enforceVersioning', v)} />
        <BoolRow label="Manter apenas uma versão vigente" v={!!draft.versioningRules?.singleActive} onChange={(v) => patchJson('versioningRules', 'singleActive', v)} />
        <BoolRow label="Arquivar versão anterior automaticamente" v={!!draft.versioningRules?.archivePrevious} onChange={(v) => patchJson('versioningRules', 'archivePrevious', v)} />
      </RulesSection>

      <RulesSection title="Retenção" hint="Ciclo de vida e exclusão.">
        <BoolRow label="Impedir exclusão definitiva" v={!!draft.retentionRules?.blockHardDelete} onChange={(v) => patchJson('retentionRules', 'blockHardDelete', v)} />
        <BoolRow label="Arquivar automaticamente após expiração" v={!!draft.retentionRules?.archiveExpired} onChange={(v) => patchJson('retentionRules', 'archiveExpired', v)} />
      </RulesSection>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
        <div className="flex gap-2">
          {selected && (
            <>
              <button onClick={onDuplicate} className="btn-ghost"><Copy className="w-4 h-4 mr-1" /> Duplicar</button>
              {selected.status === 'active' ? (
                <button onClick={() => onToggle('inactive')} className="btn-ghost"><PowerOff className="w-4 h-4 mr-1" /> Desativar</button>
              ) : (
                <button onClick={() => onToggle('active')} className="btn-ghost"><Power className="w-4 h-4 mr-1" /> Ativar</button>
              )}
              {!selected.isSystem && (
                <button onClick={onRemove} className="btn-ghost text-destructive"><Trash2 className="w-4 h-4 mr-1" /> Remover</button>
              )}
              <TestPolicyButton policyId={selected.id} />
            </>
          )}
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Salvando…' : 'Salvar política'}
        </button>
      </div>
    </div>
  );
}

// ---------- Sub-panels ----------
function PresetsTab() {
  const { data } = useQuery({
    queryKey: ['policy-presets'],
    queryFn: async () => (await api.get<Preset[]>('/policies/presets')).data,
  });
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {data?.map((p: Preset) => (
        <div key={p.id} className="rounded-lg border border-border p-4 bg-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground font-mono">{p.key}</div>
            </div>
            {p.isSystem && <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">sistema</span>}
          </div>
          {p.description && <p className="text-sm text-muted-foreground mt-2">{p.description}</p>}
          <pre className="text-[11px] mt-3 bg-muted p-2 rounded overflow-auto max-h-48">
{JSON.stringify(p.config, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function ExceptionsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['policy-exceptions'],
    queryFn: async () => (await api.get<Exception[]>('/policies/exceptions')).data,
  });
  const review = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: 'approve' | 'reject' }) =>
      (await api.put(`/policies/exceptions/${id}/review`, { decision })).data,
    onSuccess: () => {
      toast.success('Decisão registrada');
      qc.invalidateQueries({ queryKey: ['policy-exceptions'] });
    },
  });

  if (!data?.length)
    return <div className="text-sm text-muted-foreground">Nenhuma solicitação de exceção.</div>;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Política</th>
            <th className="px-3 py-2 text-left">Ação solicitada</th>
            <th className="px-3 py-2 text-left">Justificativa</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((e: Exception) => (
            <tr key={e.id} className="border-t border-border">
              <td className="px-3 py-2">{e.policy?.name}</td>
              <td className="px-3 py-2">{e.requestedAction}</td>
              <td className="px-3 py-2 text-muted-foreground">{e.reason}</td>
              <td className="px-3 py-2 capitalize">{e.status}</td>
              <td className="px-3 py-2 text-right">
                {e.status === 'pending' && (
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => review.mutate({ id: e.id, decision: 'approve' })} className="btn-ghost text-emerald-500">Aprovar</button>
                    <button onClick={() => review.mutate({ id: e.id, decision: 'reject' })} className="btn-ghost text-destructive">Recusar</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportsTab() {
  const { data } = useQuery({
    queryKey: ['policy-reports'],
    queryFn: async () => (await api.get('/policies/reports')).data,
  });
  if (!data) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Kpi label="Políticas ativas" value={data.active} icon={ShieldCheck} />
      <Kpi label="Documentos sem política" value={data.documentsWithoutPolicy} icon={AlertTriangle} />
      <Kpi label="Exceções pendentes" value={data.exceptions?.find((e: any) => e.status === 'pending')?._count?._all ?? 0} icon={ShieldAlert} />
      <div className="md:col-span-3 rounded-lg border border-border p-4 bg-card">
        <div className="text-sm font-medium mb-2">Por categoria</div>
        <ul className="text-sm space-y-1">
          {data.byCategory?.map((c: any) => (
            <li key={c.category ?? 'sem-categoria'} className="flex justify-between border-b border-border/60 py-1">
              <span>{c.category ?? 'Sem categoria'}</span>
              <span className="text-muted-foreground">{c._count._all}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AuditTab() {
  const { data } = useQuery({
    queryKey: ['policy-audit'],
    queryFn: async () => (await api.get('/policies/audit')).data as any[],
  });
  if (!data?.length) return <div className="text-sm text-muted-foreground">Sem eventos registrados.</div>;
  return (
    <div className="rounded-lg border border-border divide-y divide-border">
      {data.map((e) => (
        <div key={e.id} className="p-3 text-sm flex items-start justify-between gap-4">
          <div>
            <div className="font-medium">{e.action}</div>
            <div className="text-xs text-muted-foreground">Política: {e.policyId ?? '—'}</div>
          </div>
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(e.createdAt).toLocaleString('pt-BR')}
          </div>
        </div>
      ))}
    </div>
  );
}

function TestPolicyButton({ policyId }: { policyId: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [sample, setSample] = useState({
    category: '',
    confidentiality: 'internal',
    isOfficial: false,
    folderId: '',
  });
  async function run() {
    const r = (await api.post(`/policies/${policyId}/test`, sample)).data;
    setResult(r);
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost">
        <Play className="w-4 h-4 mr-1" /> Testar
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-background rounded-lg border border-border p-6 max-w-lg w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="font-medium">Simular documento</div>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Categoria" value={sample.category} onChange={(e) => setSample({ ...sample, category: e.target.value })} className="input" />
              <select value={sample.confidentiality} onChange={(e) => setSample({ ...sample, confidentiality: e.target.value })} className="input">
                <option value="public">public</option>
                <option value="internal">internal</option>
                <option value="confidential">confidential</option>
                <option value="restricted">restricted</option>
              </select>
              <label className="col-span-2 text-sm flex items-center gap-2">
                <input type="checkbox" checked={sample.isOfficial} onChange={(e) => setSample({ ...sample, isOfficial: e.target.checked })} />
                Documento oficial
              </label>
            </div>
            <button onClick={run} className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm">Executar</button>
            {result && (
              <div className={cn('rounded-md p-3 text-sm', result.matches ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500')}>
                <div className="font-medium">{result.matches ? 'Política aplicaria' : 'Política NÃO aplicaria'}</div>
                {result.reasons?.length > 0 && (
                  <ul className="list-disc list-inside text-xs mt-1">
                    {result.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ---------- Small building blocks ----------
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1', className)}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}
function RulesSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="mb-3">
        <div className="text-sm font-medium">{title}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function BoolRow({ label, v, onChange }: { label: string; v: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={v} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
function NumRow({ label, v, onChange }: { label: string; v: number | string; onChange: (v: number | null) => void }) {
  return (
    <label className="flex items-center justify-between text-sm gap-3">
      <span>{label}</span>
      <input
        type="number"
        value={v ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="input w-28"
      />
    </label>
  );
}
function ListRow({ label, v, onChange, placeholder }: { label: string; v: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState(v.join(', '));
  return (
    <label className="block text-sm space-y-1">
      <span>{label}</span>
      <input
        className="input w-full"
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={() =>
          onChange(
            text
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />
    </label>
  );
}
function Kpi({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="rounded-lg border border-border p-4 bg-card">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase">
        <Icon className="w-4 h-4" /> {label}
      </div>
      <div className="text-3xl font-semibold mt-2">{value ?? 0}</div>
    </div>
  );
}
