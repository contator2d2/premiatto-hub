import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, FileText, Trash2, Download } from 'lucide-react';
import { api } from '@/lib/api';

export default function DocumentsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isOfficial, setIsOfficial] = useState(false);
  const [requiresAck, setRequiresAck] = useState(false);
  const [description, setDescription] = useState('');

  const { data: docs, isLoading } = useQuery({
    queryKey: ['docs'],
    queryFn: async () => (await api.get('/documents')).data,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', file.name);
      fd.append('description', description);
      fd.append('isOfficial', String(isOfficial));
      fd.append('requiresAcknowledgement', String(requiresAck));
      return (await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
    },
    onSuccess: () => {
      toast.success('Documento enviado');
      setDescription(''); setIsOfficial(false); setRequiresAck(false);
      qc.invalidateQueries({ queryKey: ['docs'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Falha no upload'),
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/documents/${id}`)).data,
    onSuccess: () => { toast.success('Removido'); qc.invalidateQueries({ queryKey: ['docs'] }); },
  });

  async function handleDownload(d: any) {
    await api.post(`/documents/${d.id}/download`);
    window.open(d.filePath, '_blank');
  }

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight font-display">Documentos</h1>
        <p className="text-sm text-muted-foreground mt-1">Central inteligente de documentos.</p>
      </header>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
          />
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isOfficial} onChange={(e) => setIsOfficial(e.target.checked)} />
              Oficial
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={requiresAck} onChange={(e) => setRequiresAck(e.target.checked)} />
              Exigir ciência
            </label>
          </div>
        </div>
        <label className="flex items-center justify-center gap-3 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer text-sm text-muted-foreground">
          <Upload className="h-5 w-5" />
          <span>Selecionar arquivo para upload</span>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f);
              if (fileRef.current) fileRef.current.value = '';
            }}
          />
        </label>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : (docs ?? []).length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm mt-3 text-muted-foreground">Nenhum documento ainda</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {docs!.map((d: any) => (
              <li key={d.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{d.description || '—'}</div>
                </div>
                {d.isOfficial && <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">Oficial</span>}
                <button onClick={() => handleDownload(d)} className="p-2 hover:bg-muted rounded">
                  <Download className="h-4 w-4" />
                </button>
                <button onClick={() => del.mutate(d.id)} className="p-2 hover:bg-destructive/10 hover:text-destructive rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
