import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Search,
  Star,
  Download,
  Share2,
  MoreHorizontal,
  X,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Documentos — Premiatto Connect" },
      { name: "description", content: "Central Inteligente de Documentos Premiatto." },
      { property: "og:title", content: "Documentos — Premiatto Connect" },
      { property: "og:description", content: "Gerencie, compartilhe e versione documentos corporativos." },
    ],
  }),
  component: DocumentsPage,
});

type Doc = {
  id: string;
  name: string;
  description: string | null;
  file_type: string | null;
  file_size: number | null;
  file_path: string;
  is_official: boolean;
  requires_acknowledgement: boolean;
  allow_download: boolean;
  tags: string[] | null;
  version: number;
  view_count: number;
  download_count: number;
  created_at: string;
  created_by: string | null;
};

function useDocuments(search: string) {
  return useQuery({
    queryKey: ["documents", search],
    queryFn: async () => {
      let q = supabase
        .from("documents" as never)
        .select("*")
        .eq("is_deleted", false)
        .order("is_official", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      if (search.trim()) {
        q = q.ilike("name", `%${search.trim()}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data as Doc[] | null) ?? [];
    },
  });
}

function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const { data: docs, isLoading } = useDocuments(search);

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Central Inteligente — organize, compartilhe e versione.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              className="h-10 pl-10 pr-3 rounded-lg border border-input bg-card text-sm w-64 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => setUploadOpen(true)}
            className="h-10 px-4 rounded-lg gradient-brand text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-elegant hover:opacity-95"
          >
            <Upload className="h-4 w-4" />
            Enviar
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : (docs ?? []).length === 0 ? (
        <EmptyState onUpload={() => setUploadOpen(true)} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docs!.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}

      {uploadOpen && <UploadDialog onClose={() => setUploadOpen(false)} />}
    </div>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-16 text-center">
      <div className="h-14 w-14 rounded-2xl gradient-brand mx-auto flex items-center justify-center">
        <FileText className="h-6 w-6 text-primary-foreground" />
      </div>
      <h3 className="mt-6 font-semibold">Nenhum documento ainda</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        Envie o primeiro documento para começar a construir sua central de conhecimento.
      </p>
      <button
        onClick={onUpload}
        className="mt-6 h-10 px-4 rounded-lg gradient-brand text-primary-foreground text-sm font-medium inline-flex items-center gap-2"
      >
        <Upload className="h-4 w-4" />
        Enviar primeiro documento
      </button>
    </div>
  );
}

function DocumentCard({ doc }: { doc: Doc }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.file_path, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
      await supabase.from("documents" as never).update({ download_count: doc.download_count + 1 }).eq("id", doc.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no download");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="group rounded-xl border border-border bg-card p-5 hover:shadow-elegant transition-all">
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
          <FileText className="h-5 w-5 text-accent-foreground" />
        </div>
        {doc.is_official && (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 rounded font-semibold">
            <ShieldCheck className="h-3 w-3" />
            Oficial
          </span>
        )}
      </div>
      <h3 className="mt-4 font-semibold text-sm truncate">{doc.name}</h3>
      {doc.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.description}</p>
      )}
      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>v{doc.version}</span>
        <span>•</span>
        <span>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: ptBR })}</span>
        {doc.file_type && <><span>•</span><span className="uppercase">{doc.file_type}</span></>}
      </div>
      <div className="mt-4 pt-4 border-t border-border flex items-center gap-1">
        {doc.allow_download && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="h-8 px-2.5 rounded-md text-xs font-medium hover:bg-accent inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {downloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            Baixar
          </button>
        )}
        <button className="h-8 px-2.5 rounded-md text-xs font-medium hover:bg-accent inline-flex items-center gap-1.5">
          <Share2 className="h-3 w-3" />
          Compartilhar
        </button>
        <button className="h-8 w-8 rounded-md hover:bg-accent inline-flex items-center justify-center ml-auto">
          <Star className="h-3.5 w-3.5" />
        </button>
        <button className="h-8 w-8 rounded-md hover:bg-accent inline-flex items-center justify-center">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function UploadDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isOfficial, setIsOfficial] = useState(false);
  const [requiresAck, setRequiresAck] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File) {
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !me?.user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${me.user.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("documents").upload(path, file);
      if (up.error) throw up.error;

      const insert = await supabase.from("documents" as never).insert({
        name,
        description: description || null,
        file_path: path,
        file_type: ext,
        file_size: file.size,
        mime_type: file.type,
        is_official: isOfficial,
        requires_acknowledgement: requiresAck,
        created_by: me.user.id,
        updated_by: me.user.id,
        author: me.profile?.full_name || me.profile?.email,
      });
      if (insert.error) throw insert.error;

      await supabase.from("audit_log" as never).insert({
        user_id: me.user.id,
        action: "document.upload",
        entity_type: "document",
        metadata: { name, size: file.size },
      });

      toast.success("Documento enviado!");
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["recent-docs"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-border shadow-elegant w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-semibold">Enviar documento</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Adicione um arquivo à central</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) pickFile(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-accent" : "border-border hover:border-primary/50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
            />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            {file ? (
              <>
                <p className="text-sm font-medium mt-2 truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium mt-2">Arraste um arquivo ou clique para escolher</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, imagens...</p>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent">
              <input
                type="checkbox"
                checked={isOfficial}
                onChange={(e) => setIsOfficial(e.target.checked)}
                className="accent-primary"
              />
              <div>
                <div className="text-xs font-medium">Documento oficial</div>
                <div className="text-[10px] text-muted-foreground">Recebe selo azul</div>
              </div>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent">
              <input
                type="checkbox"
                checked={requiresAck}
                onChange={(e) => setRequiresAck(e.target.checked)}
                className="accent-primary"
              />
              <div>
                <div className="text-xs font-medium">Exigir ciência</div>
                <div className="text-[10px] text-muted-foreground">Leitura obrigatória</div>
              </div>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="flex-1 h-10 rounded-lg gradient-brand text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
