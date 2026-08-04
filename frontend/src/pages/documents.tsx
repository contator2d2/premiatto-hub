import { useEffect, useMemo, useRef, useState } from 'react';
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
  Trash2,
  ShieldCheck,
  Bell,
  ChevronRight,
  ChevronLeft,
  Download,
  LayoutGrid,
  List,
  SlidersHorizontal,
  MoreHorizontal,
  Info,
  MoreVertical,
  Pencil,
  FolderInput,
  BadgeCheck,
  Link2,
  Users2,
  FileUp,
  History,
  Eye,
  HardDrive,
  Settings2,
  ArrowUp,
  Share2,
} from 'lucide-react';
import { api, downloadDocument } from '@/lib/api';
import { DocumentPanel, type PanelTab } from '@/components/document-panel';
import { ShareInternalModal } from '@/components/share-internal-modal';
import { ShareExternalModal } from '@/components/share-external-modal';
import { FileIcon } from '@/components/file-icon';
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

const extTint = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'bg-rose-100 text-rose-600';
  if (ext === 'doc' || ext === 'docx') return 'bg-blue-100 text-blue-600';
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return 'bg-emerald-100 text-emerald-600';
  if (ext === 'ppt' || ext === 'pptx') return 'bg-orange-100 text-orange-600';
  if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext || '')) return 'bg-violet-100 text-violet-600';
  return 'bg-slate-100 text-slate-600';
};
const extLabel = (name: string) => (name.split('.').pop() || 'doc').toUpperCase().slice(0, 4);

const relativeDate = (value: string) => {
  const d = new Date(value);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const yesterday = new Date(today.getTime() - 86400000).toDateString() === d.toDateString();
  const hhmm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Hoje às ${hhmm}`;
  if (yesterday) return `Ontem às ${hhmm}`;
  return d.toLocaleDateString('pt-BR');
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
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'official' | 'ack'>('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [moreMenu, setMoreMenu] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>('overview');
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [shareInternal, setShareInternal] = useState<any | null>(null);
  const [shareExternal, setShareExternal] = useState<any | null>(null);
  const [renameDoc, setRenameDoc] = useState<any | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [moveDoc, setMoveDoc] = useState<any | null>(null);
  const [versionDoc, setVersionDoc] = useState<any | null>(null);
  const versionRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    setFolderId(null);
  }, [filterParam]);

  useEffect(() => {
    setPage(1);
  }, [filterParam, folderId, search, typeFilter, perPage]);

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => (await api.get('/dashboard/stats')).data as any,
  });

  const { data: folders } = useQuery({
    queryKey: ['folders', folderId],
    queryFn: async () => (await api.get(`/folders?parentId=${folderId ?? ''}`)).data as any[],
  });
  const { data: rootFolders } = useQuery({
    queryKey: ['folders', 'root'],
    queryFn: async () => (await api.get('/folders?parentId=')).data as any[],
  });
  const { data: currentFolder } = useQuery({
    queryKey: ['folder', folderId],
    queryFn: async () => (folderId ? (await api.get(`/folders/${folderId}`)).data : null),
    enabled: !!folderId,
  });

  const { data: docs, isLoading } = useQuery({
    queryKey: ['docs', scope, folderId, search],
    queryFn: async () => {
      const qp = new URLSearchParams();
      qp.set('scope', scope);
      if (folderId) qp.set('folderId', folderId);
      if (search) qp.set('search', search);
      return (await api.get(`/documents?${qp.toString()}`)).data as any[];
    },
  });

  const filteredDocs = useMemo(() => {
    let list = docs ?? [];
    if (typeFilter === 'official') list = list.filter((d: any) => d.isOfficial);
    if (typeFilter === 'ack') list = list.filter((d: any) => d.requiresAcknowledgement);
    return list;
  }, [docs, typeFilter]);

  const totalItems = filteredDocs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const pageDocs = filteredDocs.slice((page - 1) * perPage, page * perPage);
  const subFolders = folderId ? folders ?? [] : rootFolders ?? [];

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

  const updateDoc = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) =>
      (await api.put(`/documents/${id}`, patch)).data,
    onSuccess: () => {
      toast.success('Documento atualizado');
      qc.invalidateQueries({ queryKey: ['docs'] });
      qc.invalidateQueries({ queryKey: ['doc'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Falha ao atualizar'),
  });

  const addVersion = useMutation({
    mutationFn: async ({ id, file, reason }: { id: string; file: File; reason: string }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('changeReason', reason);
      return (await api.post(`/documents/${id}/version`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
    },
    onSuccess: () => {
      toast.success('Nova versão publicada');
      setVersionDoc(null);
      qc.invalidateQueries({ queryKey: ['docs'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Falha ao publicar versão'),
  });

  const openPanel = (id: string, tab: PanelTab = 'overview') => {
    setPanelTab(tab);
    setSelectedId(id);
  };

  const t = stats?.totals;
  const storagePct = Math.min(100, Math.round(((t?.documents ?? 0) / 2000) * 100));

  const kpis = [
    {
      label: 'Total de documentos',
      value: t?.documents ?? 0,
      icon: FileText,
      tint: 'bg-blue-50 text-blue-600',
      hint: 'no ambiente',
    },
    {
      label: 'Documentos oficiais',
      value: t?.officials ?? 0,
      icon: ShieldCheck,
      tint: 'bg-amber-50 text-amber-600',
      hint: 'com validação',
    },
    {
      label: 'Pendentes de leitura',
      value: t?.pendingAcksMine ?? 0,
      icon: Bell,
      tint: 'bg-rose-50 text-rose-600',
      hint: 'aguardando ciência',
      alert: true,
    },
  ];

  const handleDownload = async (d: any) => {
    if (!d.allowDownload) {
      toast.error('Download não permitido para este documento');
      return;
    }
    try {
      await downloadDocument(d.id, d.name);
    } catch (err: any) {
      toast.error(err?.message || 'Falha no download');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-5">
        {/* Page header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl lg:text-[28px] font-semibold tracking-tight font-display">
              {folderId && currentFolder ? currentFolder.name : 'Central de Documentos'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organize, compartilhe e gerencie todos os documentos da empresa.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewFolder(true)}
              className="h-10 px-4 rounded-lg border border-border bg-card text-sm font-medium inline-flex items-center gap-2 hover:bg-muted transition-colors"
            >
              <FolderPlus className="h-4 w-4" /> Criar pasta
            </button>
            <button
              onClick={() => setShowUploadMeta(true)}
              className="h-10 px-4 rounded-lg gradient-brand text-primary-foreground text-sm font-medium inline-flex items-center gap-2 shadow-sm"
            >
              <Upload className="h-4 w-4" /> Enviar arquivo
            </button>
            <div className="relative">
              <button
                onClick={() => setMoreMenu((v) => !v)}
                className="h-10 w-10 rounded-lg border border-border bg-card inline-flex items-center justify-center hover:bg-muted transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {moreMenu && (
                <div
                  className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-popover shadow-elegant p-1 z-20 text-sm"
                  onMouseLeave={() => setMoreMenu(false)}
                >
                  <button
                    onClick={() => { setView(view === 'list' ? 'grid' : 'list'); setMoreMenu(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted"
                  >
                    Alternar visualização
                  </button>
                  <button
                    onClick={() => { setShowFilters(true); setMoreMenu(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted"
                  >
                    Filtros avançados
                  </button>
                  <button
                    onClick={() => { setParams(new URLSearchParams({ filter: 'trash' })); setMoreMenu(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted"
                  >
                    Abrir lixeira
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* KPIs (Apenas na raiz da central) */}
        {!folderId && (
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${k.tint} flex items-center justify-center shrink-0`}>
                  <k.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-muted-foreground truncate">{k.label}</div>
                  <div className="text-2xl font-display font-semibold tracking-tight leading-tight">
                    {(k.value as number).toLocaleString('pt-BR')}
                  </div>
                  <div className={cn('text-[11px] flex items-center gap-1', k.alert ? 'text-rose-600' : 'text-emerald-600')}>
                    {!k.alert && <ArrowUp className="h-3 w-3" />}
                    {k.hint}
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-medium text-muted-foreground">Espaço utilizado</div>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-1 text-xl font-display font-semibold tracking-tight">
                {t?.documents ?? 0} / 2.000 arquivos
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${storagePct}%` }} />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{storagePct}%</span>
              </div>
            </div>
          </section>
        )}

        {/* Explorer */}
        <section className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 sm:px-5 py-3 border-b border-border flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm min-w-0">
              <button
                onClick={() => setFolderId(null)}
                className={cn('hover:underline truncate', folderId ? 'text-muted-foreground' : 'font-semibold')}
              >
                {SCOPE_LABELS[scope]}
              </button>
              {folderId &&
                (currentFolder?.breadcrumb ?? []).map((b: any, i: number) => (
                  <span key={b.id} className="flex items-center gap-1.5 min-w-0">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <button
                      onClick={() => setFolderId(b.id)}
                      className={cn(
                        'truncate',
                        i === currentFolder.breadcrumb.length - 1 ? 'font-semibold' : 'text-muted-foreground hover:underline',
                      )}
                    >
                      {b.name}
                    </button>
                  </span>
                ))}
            </div>
            <div className="flex-1" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nesta pasta…"
              className="h-9 px-3 rounded-lg border border-input bg-background text-sm w-full sm:w-56"
            />
            <div className="inline-flex rounded-lg border border-border p-0.5">
              <button
                onClick={() => setView('list')}
                className={cn('h-8 w-8 rounded-md inline-flex items-center justify-center', view === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
                title="Lista"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('grid')}
                className={cn('h-8 w-8 rounded-md inline-flex items-center justify-center', view === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
                title="Grade"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                'h-9 px-3 rounded-lg border border-border inline-flex items-center gap-2 text-sm',
                showFilters ? 'bg-primary/10 text-primary border-primary/30' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <SlidersHorizontal className="h-4 w-4" /> Filtros
            </button>
          </div>

          {showFilters && (
            <div className="px-4 sm:px-5 py-3 border-b border-border bg-muted/30 flex flex-wrap items-center gap-2 text-sm">
              {(
                [
                  ['all', 'Todos'],
                  ['official', 'Somente oficiais'],
                  ['ack', 'Exigem ciência'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTypeFilter(key)}
                  className={cn(
                    'h-8 px-3 rounded-full border text-xs font-medium',
                    typeFilter === key ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex">
            {/* Folder tree */}
            <aside className="w-56 border-r border-border p-3 shrink-0 hidden lg:flex flex-col">
              <div className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                Pastas
                <button
                  onClick={() => setShowNewFolder(true)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                  title="Nova pasta"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-0.5 flex-1 overflow-y-auto">
                <button
                  onClick={() => setFolderId(null)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left',
                    !folderId ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Home className="h-4 w-4" />
                  {SCOPE_LABELS[scope]}
                </button>
                {(rootFolders ?? []).map((f: any) => (
                  <button
                    key={f.id}
                    onClick={() => setFolderId(f.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left',
                      folderId === f.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Folder className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">{f.name}</span>
                    <span className="text-[10px] text-muted-foreground">{f._count?.documents ?? 0}</span>
                  </button>
                ))}
                {(rootFolders ?? []).length === 0 && (
                  <div className="px-2.5 py-3 text-[11px] text-muted-foreground">Nenhuma pasta ainda.</div>
                )}
              </div>
              <div className="pt-3 mt-3 border-t border-border space-y-2">
                <button
                  onClick={() => setShowNewFolder(true)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted"
                >
                  <Settings2 className="h-3.5 w-3.5" /> Gerenciar pastas
                </button>
                <div className="px-1 space-y-1.5">
                  <div className="text-[10px] text-muted-foreground">
                    {t?.documents ?? 0} de 2.000 arquivos utilizados
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${storagePct}%` }} />
                  </div>
                </div>
              </div>
            </aside>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>
              ) : subFolders.length === 0 && totalItems === 0 ? (
                <div className="p-16 text-center">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm mt-3 text-muted-foreground">Nenhum documento nesta visualização.</p>
                </div>
              ) : view === 'grid' ? (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {page === 1 &&
                    subFolders.map((f: any) => (
                      <button
                        key={f.id}
                        onClick={() => setFolderId(f.id)}
                        className="rounded-xl border border-border p-4 text-left hover:border-primary/40 hover:bg-primary/[0.02] transition-all"
                      >
                        <Folder className="h-8 w-8 text-amber-500" />
                        <div className="mt-3 text-sm font-medium truncate">{f.name}</div>
                        <div className="text-xs text-muted-foreground">{f._count?.documents ?? 0} arquivos</div>
                      </button>
                    ))}
                  {pageDocs.map((d: any) => (
                    <button
                      key={d.id}
                      onClick={() => openPanel(d.id)}
                      className="rounded-xl border border-border p-4 text-left hover:border-primary/40 hover:bg-primary/[0.02] transition-all group"
                    >
                      <FileIcon name={d.name} className="h-12 w-12 mb-3 shadow-sm group-hover:scale-110 transition-transform" />
                      <div className="text-sm font-medium truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">v{d.version} · {relativeDate(d.updatedAt)}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/40">
                        <th className="px-5 py-3 font-medium">Nome</th>
                        <th className="px-4 py-3 font-medium">Versão</th>
                        <th className="px-4 py-3 font-medium hidden md:table-cell">Atualizado em</th>
                        <th className="px-4 py-3 font-medium hidden lg:table-cell">Atualizado por</th>
                        <th className="px-4 py-3 font-medium text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {page === 1 &&
                        subFolders.map((f: any) => (
                          <tr key={f.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setFolderId(f.id)}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <Folder className="h-5 w-5 text-amber-500 shrink-0" />
                                <span className="font-medium truncate">{f.name}</span>
                                <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">
                                  Pasta
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">—</td>
                            <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                              {f.updatedAt ? relativeDate(f.updatedAt) : '—'}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                              {f.createdBy?.fullName || '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              <ChevronRight className="h-4 w-4 inline" />
                            </td>
                          </tr>
                        ))}
                      {pageDocs.map((d: any) => (
                        <tr key={d.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => openPanel(d.id)}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <FileIcon name={d.name} className="h-8 w-8" />
                              <span className="font-medium truncate">{d.name}</span>
                              {d.isOfficial && (
                                <span className="text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold shrink-0">
                                  Oficial
                                </span>
                              )}
                              {d.requiresAcknowledgement && (
                                <span className="text-[10px] uppercase tracking-wider bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-semibold shrink-0">
                                  Ciência
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">v{d.version}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{relativeDate(d.updatedAt)}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell truncate">
                            {d.owner?.fullName || d.createdBy?.fullName || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                title="Baixar"
                                onClick={(e) => { e.stopPropagation(); handleDownload(d); }}
                                className="p-1.5 hover:bg-muted rounded"
                              >
                                <Download className="h-4 w-4 text-muted-foreground" />
                              </button>
                              <div className="relative">
                                <button
                                  title="Ações"
                                  onClick={(e) => { e.stopPropagation(); setRowMenu(rowMenu === d.id ? null : d.id); }}
                                  className="p-1.5 hover:bg-muted rounded"
                                >
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </button>
                                {rowMenu === d.id && (
                                  <div
                                    className="absolute right-0 z-30 mt-1 w-60 rounded-xl border border-border bg-popover shadow-elegant p-1 text-sm"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseLeave={() => setRowMenu(null)}
                                  >
                                    {(
                                      [
                                        ['Abrir', Eye, () => openPanel(d.id, 'overview')],
                                        ['Visualizar detalhes', Info, () => openPanel(d.id, 'details')],
                                        ['Baixar', Download, () => handleDownload(d)],
                                        ['Compartilhar internamente', Users2, () => setShareInternal(d)],
                                        ['Criar link externo', Link2, () => setShareExternal(d)],
                                        ['Enviar nova versão', FileUp, () => { setVersionDoc(d); setTimeout(() => versionRef.current?.click(), 0); }],
                                        ['Mover', FolderInput, () => setMoveDoc(d)],
                                        ['Renomear', Pencil, () => { setRenameDoc(d); setRenameValue(d.name); }],
                                        [d.isOfficial ? 'Remover marca de oficial' : 'Marcar como oficial', BadgeCheck, () => updateDoc.mutate({ id: d.id, patch: { isOfficial: !d.isOfficial } })],
                                        [d.requiresAcknowledgement ? 'Não exigir ciência' : 'Exigir ciência', ShieldCheck, () => updateDoc.mutate({ id: d.id, patch: { requiresAcknowledgement: !d.requiresAcknowledgement } })],
                                        ['Ver auditoria', History, () => openPanel(d.id, 'timeline')],
                                        [d.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos', Star, () => fav.mutate(d.id)],
                                      ] as [string, any, () => void][]
                                    ).map(([label, Icon, action]) => (
                                      <button
                                        key={label}
                                        onClick={() => { setRowMenu(null); action(); }}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted flex items-center gap-2"
                                      >
                                        <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}
                                      </button>
                                    ))}
                                    <div className="my-1 h-px bg-border" />
                                    {scope === 'trash' ? (
                                      <button
                                        onClick={() => { setRowMenu(null); restore.mutate(d.id); }}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted flex items-center gap-2"
                                      >
                                        <History className="h-3.5 w-3.5" /> Restaurar
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => { setRowMenu(null); del.mutate(d.id); }}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive flex items-center gap-2"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" /> Enviar para lixeira
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalItems > 0 && (
                <div className="px-5 py-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div>
                    Mostrando {(page - 1) * perPage + 1} a {Math.min(page * perPage, totalItems)} de {totalItems} itens
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="h-8 w-8 rounded-lg border border-border inline-flex items-center justify-center disabled:opacity-40 hover:bg-muted"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from({ length: totalPages })
                      .slice(0, 5)
                      .map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setPage(i + 1)}
                          className={cn(
                            'h-8 min-w-8 px-2 rounded-lg border text-xs font-medium',
                            page === i + 1 ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted',
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                    {totalPages > 5 && <span>…</span>}
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="h-8 w-8 rounded-lg border border-border inline-flex items-center justify-center disabled:opacity-40 hover:bg-muted"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <select
                      value={perPage}
                      onChange={(e) => setPerPage(Number(e.target.value))}
                      className="h-8 px-2 rounded-lg border border-input bg-background text-xs"
                    >
                      {[10, 20, 50].map((n) => (
                        <option key={n} value={n}>
                          {n} por página
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

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
            <div className="flex flex-col gap-4">
              <label className="flex items-center justify-center gap-3 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer text-sm text-muted-foreground transition-colors bg-muted/20">
                <Upload className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <span className="block font-medium text-foreground">
                    {uploadRef.current?.files?.[0]?.name || 'Clique para selecionar o arquivo'}
                  </span>
                  <span className="text-xs">Tamanho máximo: 50MB</span>
                </div>
                <input
                  ref={uploadRef}
                  type="file"
                  className="hidden"
                  onChange={() => {
                    // Força re-render para mostrar nome do arquivo
                    setUploadMeta({ ...uploadMeta });
                  }}
                />
              </label>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowUploadMeta(false)}
                  className="h-10 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const f = uploadRef.current?.files?.[0];
                    if (!f) {
                      toast.error('Selecione um arquivo primeiro');
                      return;
                    }
                    upload.mutate(f);
                  }}
                  disabled={upload.isPending}
                  className="h-10 px-6 rounded-lg gradient-brand text-primary-foreground text-sm font-medium shadow-sm disabled:opacity-50"
                >
                  {upload.isPending ? 'Enviando...' : 'Confirmar e Enviar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <input
        ref={versionRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && versionDoc) {
            addVersion.mutate({ id: versionDoc.id, file: f, reason: 'Nova versão enviada pela Central' });
          }
          if (versionRef.current) versionRef.current.value = '';
        }}
      />

      {renameDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-3">
            <div className="text-sm font-semibold">Renomear documento</div>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRenameDoc(null)} className="h-9 px-3 rounded-lg border border-border text-sm">
                Cancelar
              </button>
              <button
                disabled={!renameValue.trim()}
                onClick={() => {
                  updateDoc.mutate({ id: renameDoc.id, patch: { name: renameValue.trim() } });
                  setRenameDoc(null);
                }}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {moveDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-3">
            <div className="text-sm font-semibold">Mover documento</div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              <button
                onClick={() => { updateDoc.mutate({ id: moveDoc.id, patch: { folderId: null } }); setMoveDoc(null); }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
              >
                <Home className="h-4 w-4 text-muted-foreground" /> Raiz
              </button>
              {(rootFolders ?? []).map((f: any) => (
                <button
                  key={f.id}
                  onClick={() => { updateDoc.mutate({ id: moveDoc.id, patch: { folderId: f.id } }); setMoveDoc(null); }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
                >
                  <Folder className="h-4 w-4 text-amber-500" /> {f.name}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setMoveDoc(null)} className="h-9 px-3 rounded-lg border border-border text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {shareInternal && (
        <ShareInternalModal
          documentId={shareInternal.id}
          documentName={shareInternal.name}
          onClose={() => setShareInternal(null)}
        />
      )}
      {shareExternal && (
        <ShareExternalModal
          documentId={shareExternal.id}
          documentName={shareExternal.name}
          onClose={() => setShareExternal(null)}
        />
      )}

      {selectedId && (
        <DocumentPanel documentId={selectedId} initialTab={panelTab} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
