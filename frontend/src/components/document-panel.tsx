import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  X,
  Download,
  Share2,
  Link2,
  History,
  MessageSquare,
  ShieldCheck,
  BadgeCheck,
  Upload,
  Info,
  ExternalLink,
  Star,
  Users2,
  Trash2,
} from 'lucide-react';
import { api, downloadDocument } from '@/lib/api';
import { FileViewer } from './file-viewer';
import { ShareInternalModal } from './share-internal-modal';
import { ShareExternalModal } from './share-external-modal';
import { ShareStatus } from './share-status';
import { useAuth } from '@/contexts/auth-context';

type Props = { documentId: string; onClose: () => void };

type Tab = 'overview' | 'details' | 'versions' | 'shares' | 'acks' | 'timeline' | 'permissions';

export function DocumentPanel({ documentId, onClose }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [showShare, setShowShare] = useState(false);
  const [showExternal, setShowExternal] = useState(false);
  const [shareChooser, setShareChooser] = useState(false);
  const versionInputRef = useRef<HTMLInputElement>(null);

  const { data: doc, isLoading } = useQuery({
    queryKey: ['doc', documentId],
    queryFn: async () => {
      await api.post(`/documents/${documentId}/view`).catch(() => {});
      return (await api.get(`/documents/${documentId}`)).data;
    },
  });

  const { data: timeline } = useQuery({
    queryKey: ['doc-timeline', documentId],
    queryFn: async () => (await api.get(`/documents/${documentId}/timeline`)).data as any[],
    enabled: tab === 'timeline',
  });
  const { data: shares } = useQuery({
    queryKey: ['doc-shares', documentId],
    queryFn: async () => (await api.get(`/documents/${documentId}/shares`)).data as any[],
    enabled: tab === 'shares',
  });
  const { data: links } = useQuery({
    queryKey: ['doc-public-links', documentId],
    queryFn: async () => (await api.get(`/public-links?documentId=${documentId}`)).data as any[],
    enabled: tab === 'links',
  });

  const ack = useMutation({
    mutationFn: async () => (await api.post(`/documents/${documentId}/acknowledge`)).data,
    onSuccess: (r: any) => {
      toast.success(`Leitura confirmada — protocolo ${r.protocolo}`);
      qc.invalidateQueries({ queryKey: ['doc', documentId] });
      qc.invalidateQueries({ queryKey: ['docs'] });
    },
  });

  const fav = useMutation({
    mutationFn: async () => (await api.post(`/documents/${documentId}/favorite`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doc', documentId] });
      qc.invalidateQueries({ queryKey: ['docs'] });
    },
  });

  const addVersion = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('changeReason', prompt('Motivo da atualização?') || '');
      return (await api.post(`/documents/${documentId}/version`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
    },
    onSuccess: () => {
      toast.success('Nova versão publicada');
      qc.invalidateQueries({ queryKey: ['doc', documentId] });
      qc.invalidateQueries({ queryKey: ['docs'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Falha'),
  });

  const restoreVersion = useMutation({
    mutationFn: async (v: number) => {
      const reason = prompt('Motivo da restauração?') || '';
      return (await api.post(`/documents/${documentId}/versions/${v}/restore`, { reason })).data;
    },
    onSuccess: () => {
      toast.success('Versão restaurada');
      qc.invalidateQueries({ queryKey: ['doc', documentId] });
    },
  });

  const revokeShare = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/shares/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doc-shares', documentId] }),
  });
  const revokeLink = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/public-links/${id}`)).data,
    onSuccess: () => {
      toast.success('Link revogado');
      qc.invalidateQueries({ queryKey: ['doc-public-links', documentId] });
    },
  });

  async function handleDownload() {
    if (!doc) return;
    if (!doc.allowDownload) {
      toast.error('Download não permitido para este documento');
      return;
    }
    try {
      await downloadDocument(documentId, doc.name);
    } catch (err: any) {
      toast.error(err?.message || 'Falha no download');
    }
  }

  if (isLoading || !doc)
    return (
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center">
        <div className="text-sm text-white">Carregando…</div>
      </div>
    );

  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-5xl bg-background flex flex-col h-full border-l border-border">
        <header className="h-16 px-5 border-b border-border flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate font-display flex items-center gap-2">
              {doc.name}
              {doc.isOfficial && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                  <BadgeCheck className="h-3 w-3" /> Oficial
                </span>
              )}
              <span className="text-[10px] uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded">
                v{doc.version} · atual
              </span>
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {doc.description || 'Sem descrição'} · {doc.creator?.fullName || doc.creator?.email}
            </div>
          </div>
          <button onClick={() => fav.mutate()} className="p-2 rounded hover:bg-muted" title="Favoritar">
            <Star className={`h-4 w-4 ${doc.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
          </button>
          {doc.allowDownload && (
            <button onClick={handleDownload} className="p-2 rounded hover:bg-muted" title="Baixar">
              <Download className="h-4 w-4" />
            </button>
          )}
          {doc.allowShare && (
            <>
              <button onClick={() => setShowShare(true)} className="h-9 px-3 rounded-lg border border-border text-sm inline-flex items-center gap-2">
                <Share2 className="h-4 w-4" /> Interno
              </button>
              <button onClick={() => setShowExternal(true)} className="h-9 px-3 rounded-lg gradient-brand text-primary-foreground text-sm inline-flex items-center gap-2">
                <Link2 className="h-4 w-4" /> Externo
              </button>
            </>
          )}
          <button onClick={onClose} className="p-2 rounded hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="border-b border-border px-5 flex gap-4 text-sm">
          {(
            [
              ['overview', 'Visão', Info],
              ['versions', 'Versões', History],
              ['shares', 'Compartilhamentos', Users2],
              ['links', 'Links externos', Link2],
              ['timeline', 'Histórico', MessageSquare],
            ] as [Tab, string, any][]
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`py-3 border-b-2 -mb-px inline-flex items-center gap-1.5 ${
                tab === k ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === 'overview' && (
            <>
              <FileViewer
                fileUrl={doc.filePath}
                fileType={doc.fileType}
                mimeType={doc.mimeType}
                allowDownload={doc.allowDownload}
                watermark={user?.email}
                onDownload={handleDownload}
              />
              {doc.requiresAcknowledgement && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-amber-600" />
                  <div className="flex-1 text-sm">
                    <div className="font-medium text-amber-900">Este documento exige confirmação de leitura.</div>
                    <div className="text-amber-800/80 text-xs mt-0.5">
                      Ao confirmar, você declara que leu e está ciente do conteúdo desta versão (v{doc.version}).
                    </div>
                  </div>
                  <button
                    onClick={() => ack.mutate()}
                    disabled={ack.isPending}
                    className="h-9 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    Li e estou ciente
                  </button>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border border-border bg-card p-4 space-y-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Publicação</div>
                  <div>{doc.publishedAt ? new Date(doc.publishedAt).toLocaleString('pt-BR') : '—'}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 space-y-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Validade</div>
                  <div>{doc.validUntil ? new Date(doc.validUntil).toLocaleDateString('pt-BR') : '—'}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 space-y-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Confidencialidade</div>
                  <div className="capitalize">{doc.confidentiality}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4 space-y-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Estatísticas</div>
                  <div>{doc.viewCount} visualizações · {doc.downloadCount} downloads</div>
                </div>
              </div>
            </>
          )}

          {tab === 'versions' && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Histórico de versões</h3>
                <label className="h-9 px-3 rounded-lg gradient-brand text-primary-foreground text-sm inline-flex items-center gap-2 cursor-pointer">
                  <Upload className="h-4 w-4" /> Publicar nova versão
                  <input
                    ref={versionInputRef}
                    type="file"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) addVersion.mutate(f);
                      if (versionInputRef.current) versionInputRef.current.value = '';
                    }}
                  />
                </label>
              </div>
              <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                {(doc.versions ?? []).map((v: any) => (
                  <li key={v.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        Versão {v.version}{' '}
                        {v.isCurrent && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                            Vigente
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(v.createdAt).toLocaleString('pt-BR')} · {v.changeReason || v.notes || 'sem observações'}
                      </div>
                    </div>
                    <a href={v.filePath} target="_blank" rel="noreferrer" className="p-2 rounded hover:bg-muted">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    {!v.isCurrent && (
                      <button
                        onClick={() => restoreVersion.mutate(v.version)}
                        className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted"
                      >
                        Restaurar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {tab === 'shares' && (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {(shares ?? []).length === 0 && (
                <li className="p-8 text-center text-sm text-muted-foreground">Nenhum compartilhamento interno ainda.</li>
              )}
              {(shares ?? []).map((s: any) => (
                <li key={s.id} className="px-4 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {s.scope === 'user'
                        ? s.target?.fullName || s.target?.email || 'Usuário'
                        : s.scope === 'department'
                          ? 'Departamento'
                          : s.scope === 'role'
                            ? `Perfil: ${s.targetRole}`
                            : 'Todos da plataforma'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {new Date(s.createdAt).toLocaleString('pt-BR')} · v{s.versionAtShare} ·{' '}
                      {s.priority !== 'normal' && (
                        <span className="uppercase tracking-wider">{s.priority}</span>
                      )}{' '}
                      {s.message}
                    </div>
                  </div>
                  <ShareStatus
                    status={s.status}
                    deliveredAt={s.deliveredAt}
                    viewedAt={s.viewedAt}
                    openedAt={s.openedAt}
                    acknowledgedAt={s.acknowledgedAt}
                  />
                  <button
                    onClick={() => revokeShare.mutate(s.id)}
                    className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive"
                    title="Revogar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {tab === 'links' && (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {(links ?? []).length === 0 && (
                <li className="p-8 text-center text-sm text-muted-foreground">Nenhum link externo criado ainda.</li>
              )}
              {(links ?? []).map((l: any) => {
                const url = `${window.location.origin}/p/${l.token}`;
                return (
                  <li key={l.id} className="px-4 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {l.recipientName || 'Sem destinatário'}{' '}
                        <span className={`ml-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                          l.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          l.status === 'revoked' ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'
                        }`}>{l.status}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate font-mono">{url}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {l._count?.accesses ?? 0} acessos · {l.expiresAt ? `expira ${new Date(l.expiresAt).toLocaleDateString('pt-BR')}` : 'sem expiração'}
                      </div>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(url); toast.success('Link copiado'); }}
                      className="p-1.5 rounded hover:bg-muted"
                      title="Copiar"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </button>
                    {l.status === 'active' && (
                      <button
                        onClick={() => revokeLink.mutate(l.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive"
                        title="Revogar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {tab === 'timeline' && (
            <ol className="relative border-l border-border ml-2 space-y-4">
              {(timeline ?? []).map((e: any) => (
                <li key={e.id} className="ml-4">
                  <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary" />
                  <div className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString('pt-BR')}</div>
                  <div className="text-sm font-medium">{humanEvent(e.action)}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.user?.fullName || e.actorLabel || e.actorType}
                    {e.metadata && Object.keys(e.metadata).length > 0 && (
                      <> · <span className="font-mono">{JSON.stringify(e.metadata)}</span></>
                    )}
                  </div>
                </li>
              ))}
              {(timeline ?? []).length === 0 && <li className="text-sm text-muted-foreground">Sem eventos.</li>}
            </ol>
          )}
        </div>
      </div>

      {showShare && (
        <ShareInternalModal documentId={documentId} documentName={doc.name} onClose={() => setShowShare(false)} />
      )}
      {showExternal && (
        <ShareExternalModal documentId={documentId} documentName={doc.name} onClose={() => setShowExternal(false)} />
      )}
    </div>
  );
}

function humanEvent(action: string) {
  const map: Record<string, string> = {
    'document.created': 'Documento criado',
    'document.updated': 'Metadados atualizados',
    'document.opened': 'Documento aberto',
    'document.downloaded': 'Download realizado',
    'document.acknowledged': 'Leitura confirmada',
    'document.shared': 'Compartilhamento interno',
    'document.trashed': 'Enviado para lixeira',
    'document.restored': 'Restaurado da lixeira',
    'document.version_published': 'Nova versão publicada',
    'public_link.created': 'Link externo criado',
    'public_link.opened': 'Link externo aberto',
    'public_link.downloaded': 'Download via link externo',
    'public_link.acknowledged': 'Leitura confirmada (externo)',
    'public_link.password_fail': 'Tentativa de senha incorreta',
    'public_link.revoked': 'Link externo revogado',
    'public_link.updated': 'Link externo atualizado',
  };
  return map[action] || action;
}
