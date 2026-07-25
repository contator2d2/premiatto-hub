import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import {
  Upload,
  FileText,
  FolderPlus,
  Folder,
  Home,
  Star,
  Clock,
  Trash2,
  BadgeCheck,
  Share2,
  Users2,
  Link2,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DocumentPanel } from '@/components/document-panel';
import { cn } from '@/lib/utils';

type Scope = 'all' | 'shared-with-me' | 'shared-by-me' | 'official' | 'pending-ack' | 'favorites' | 'recent' | 'trash';

const FILTER_TO_SCOPE: Record<string, Scope> = {
  all: 'all',
  officials: 'official',
  official: 'official',
  'shared-with-me': 'shared-with-me',
  'shared-by-me': 'shared-by-me',
  pending: 'pending-ack',
  'pending-ack': 'pending-ack',
  favorites: 'favorites',
  recent: 'recent',
  trash: 'trash',
};

const SCOPE_LABELS: Record<Scope, string> = {
  all: 'Todos os arquivos',
  'shared-with-me': 'Compartilhados comigo',
  'shared-by-me': 'Compartilhados por mim',
  official: 'Documentos oficiais',
  'pending-ack': 'Pendentes de leitura',
  favorites: 'Favoritos',
  recent: 'Recentes',
  trash: 'Lixeira',
};

export default function DocumentsPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const filterParam = params.get('filter') || 'all';
  const scope: Scope = FILTER_TO_SCOPE[filterParam] || 'all';
  const [folderId, setFolderId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(params.get('doc'));
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [search, setSearch] = useState('');
  const [showUploadMeta, setShowUploadMeta] = useState(false);
  const [uploadMeta, setUploadMeta] = useState({
    isOfficial: false,
    requiresAcknowledgement: false,
    confidentiality: 'internal',
    description: '',
    tags: '',
  });
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (selectedId) next.set('doc', selectedId);
    else next.delete('doc');
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Reset folder navigation when filter changes
  useEffect(() => {
    setFolderId(null);
  }, [filterParam]);

  const { data: folders } = useQuery({
    queryKey: ['folders', folderId],
    queryFn: async () => (await api.get(`/folders?parentId=${folderId ?? ''}`)).data as any[],
  });
  const { data: currentFolder } = useQuery({
    queryKey: ['folder', folderId],
    queryFn: async () => (folderId ? (await api.get(`/folders/${folderId}`)).data : null),
    enabled: !!folderId,
  });

  const { data: docs, isLoading } = useQuery({
    queryKey: ['docs', scope, folderId, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('scope', scope);
      if (folderId) params.set('folderId', folderId);
      if (search) params.set('search', search);
      return (await api.get(`/documents?${params.toString()}`)).data as any[];
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', file.name);
      fd.append('description', uploadMeta.description);
      fd.append('isOfficial', String(uploadMeta.isOfficial));
      fd.append('requiresAcknowledgement', String(uploadMeta.requiresAcknowledgement));
      fd.append('confidentiality', uploadMeta.confidentiality);
      if (uploadMeta.tags) fd.append('tags', uploadMeta.tags);
      if (folderId) fd.append('folderId', folderId);
      return (await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
    },
    onSuccess: () => {
      toast.success('Documento enviado');
      setShowUploadMeta(false);
      setUploadMeta({ isOfficial: false, requiresAcknowledgement: false, confidentiality: 'internal', description: '', tags: '' });
      qc.invalidateQueries({ queryKey: ['docs'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Falha no upload'),
  });

  const createFolder = useMutation({
    mutationFn: async () => (await api.post('/folders', { name: newFolderName, parentId: folderId || undefined })).data,
    onSuccess: () => {
      toast.success('Pasta criada');
      setShowNewFolder(false);
      setNewFolderName('');
      qc.invalidateQueries({ queryKey: ['folders'] });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/documents/${id}`)).data,
    onSuccess: () => {
      toast.success('Movido para lixeira');
      qc.invalidateQueries({ queryKey: ['docs'] });
    },
  });

  const restore = useMutation({
    mutationFn: async (id: string) => (await api.post(`/documents/${id}/restore`)).data,
    onSuccess: () => {
      toast.success('Restaurado');
      qc.invalidateQueries({ queryKey: ['docs'] });
    },
  });

  const fav = useMutation({
    mutationFn: async (id: string) => (await api.post(`/documents/${id}/favorite`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs'] }),
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Compact folders sub-sidebar */}
      <aside className="w-56 border-r border-border bg-card p-3 space-y-1 shrink-0 hidden lg:block">
        <div className="px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          Pastas
          <button
            onClick={() => setShowNewFolder(true)}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
            title="Nova pasta"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          onClick={() => setFolderId(null)}
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left',
            !folderId ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Home className="h-4 w-4" />
          Raiz
        </button>
        {(folders ?? []).map((f: any) => (
          <button
            key={f.id}
            onClick={() => setFolderId(f.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left',
              folderId === f.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Folder className="h-4 w-4" />
            <span className="truncate flex-1">{f.name}</span>
            <span className="text-[10px] text-muted-foreground">{f._count?.documents ?? 0}</span>
          </button>
        ))}
        {(folders ?? []).length === 0 && (
          <div className="px-2.5 py-3 text-[11px] text-muted-foreground">Nenhuma pasta ainda.</div>
        )}
      </aside>

      <div className="flex-1 min-w-0 p-6 lg:p-8 space-y-5">
        <header className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight font-display">
              {folderId && currentFolder ? currentFolder.name : SCOPE_LABELS[scope]}
            </h1>
            {folderId && currentFolder?.breadcrumb && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <button onClick={() => setFolderId(null)} className="hover:underline">Todos</button>
                {currentFolder.breadcrumb.map((b: any, i: number) => (
                  <span key={b.id} className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    <button
                      onClick={() => setFolderId(b.id)}
                      className={i === currentFolder.breadcrumb.length - 1 ? 'text-foreground font-medium' : 'hover:underline'}
                    >
                      {b.name}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar arquivos…"
            className="h-10 px-3 rounded-lg border border-input bg-background text-sm w-72"
          />
          <button
            onClick={() => setShowUploadMeta(true)}
            className="h-10 px-4 rounded-lg gradient-brand text-primary-foreground text-sm font-medium inline-flex items-center gap-2"
          >
            <Upload className="h-4 w-4" /> Enviar arquivo
          </button>
        </header>

        {showNewFolder && (
          <div className="rounded-xl border border-border bg-card p-4 flex gap-2">
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome da nova pasta"
              className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm"
            />
            <button
              onClick={() => createFolder.mutate()}
              disabled={!newFolderName.trim()}
              className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"
            >
              Criar
            </button>
            <button onClick={() => setShowNewFolder(false)} className="h-10 px-4 rounded-lg border border-border text-sm">
              Cancelar
            </button>
          </div>
        )}

        {showUploadMeta && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="text-sm font-semibold">Metadados do upload</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                placeholder="Descrição"
                value={uploadMeta.description}
                onChange={(e) => setUploadMeta({ ...uploadMeta, description: e.target.value })}
                className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
              />
              <input
                placeholder="Tags (separadas por vírgula)"
                value={uploadMeta.tags}
                onChange={(e) => setUploadMeta({ ...uploadMeta, tags: e.target.value })}
                className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
              />
              <select
                value={uploadMeta.confidentiality}
                onChange={(e) => setUploadMeta({ ...uploadMeta, confidentiality: e.target.value })}
                className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
              >
                <option value="public">Público</option>
                <option value="internal">Interno</option>
                <option value="confidential">Confidencial</option>
                <option value="restricted">Restrito</option>
              </select>
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={uploadMeta.isOfficial} onChange={(e) => setUploadMeta({ ...uploadMeta, isOfficial: e.target.checked })} />
                  Oficial
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={uploadMeta.requiresAcknowledgement} onChange={(e) => setUploadMeta({ ...uploadMeta, requiresAcknowledgement: e.target.checked })} />
                  Exigir ciência
                </label>
              </div>
            </div>
            <label className="flex items-center justify-center gap-3 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer text-sm text-muted-foreground">
              <Upload className="h-5 w-5" />
              <span>Selecionar arquivo para upload</span>
              <input
                ref={uploadRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload.mutate(f);
                  if (uploadRef.current) uploadRef.current.value = '';
                }}
              />
            </label>
            <div className="flex justify-end">
              <button onClick={() => setShowUploadMeta(false)} className="text-xs text-muted-foreground hover:underline">
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : (docs ?? []).length === 0 ? (
            <div className="p-16 text-center">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm mt-3 text-muted-foreground">Nenhum documento nesta visualização.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {docs!.map((d: any) => (
                <li
                  key={d.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 cursor-pointer"
                  onClick={() => setSelectedId(d.id)}
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-2">
                      {d.name}
                      {d.isOfficial && (
                        <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                          Oficial
                        </span>
                      )}
                      {d.requiresAcknowledgement && (
                        <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                          Ciência
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">v{d.version}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {d.description || '—'} · {new Date(d.updatedAt).toLocaleDateString('pt-BR')} · {d._count?.versions ?? 1} versões · {d._count?.shares ?? 0} compartilhamentos
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); fav.mutate(d.id); }}
                    className="p-1.5 hover:bg-muted rounded"
                  >
                    <Star className={`h-4 w-4 ${d.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                  </button>
                  {scope === 'trash' ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); restore.mutate(d.id); }}
                      className="text-xs px-2 py-1 rounded border border-border hover:bg-muted"
                    >
                      Restaurar
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); del.mutate(d.id); }}
                      className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {selectedId && <DocumentPanel documentId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
