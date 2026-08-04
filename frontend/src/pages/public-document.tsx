import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Lock, ShieldCheck, BadgeCheck, Building2, Download, FileText } from 'lucide-react';
import { api, setAccessToken } from '@/lib/api';
import { FileViewer } from '@/components/file-viewer';
import { FileIcon } from '@/components/file-icon';

// Public page reachable at /p/:token — no auth.
export default function PublicDocumentPage() {
  const { token } = useParams<{ token: string }>();
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [opened, setOpened] = useState<any>(null);
  const [ackDone, setAckDone] = useState<{ protocolo: string } | null>(null);

  // Ensure axios doesn't attach a bearer inherited from another tab
  setAccessToken(null);

  const { data: info, isLoading, error } = useQuery({
    queryKey: ['public-link', token],
    queryFn: async () => (await api.get(`/p/${token}`)).data,
    retry: false,
    enabled: !!token,
  });

  const open = useMutation({
    mutationFn: async () => (await api.post(`/p/${token}/open`, { password, name, email })).data,
    onSuccess: (data: any) => setOpened(data),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Falha ao abrir'),
  });

  const ack = useMutation({
    mutationFn: async () => (await api.post(`/p/${token}/acknowledge`, { name, email })).data,
    onSuccess: (r: any) => setAckDone({ protocolo: r.protocolo }),
  });

  async function download() {
    try {
      const { data } = await api.post(`/p/${token}/download`, { name });
      window.open(data.filePath, '_blank');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Falha no download');
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Verificando link…
      </div>
    );
  }
  if (error || !info) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <div className="text-lg font-semibold">Link indisponível</div>
        <div className="text-sm text-muted-foreground max-w-sm">
          Este link não é mais válido. Ele pode ter expirado, sido revogado ou atingido o limite de acessos.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="h-16 border-b border-border bg-card px-6 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl gradient-brand flex items-center justify-center">
          <Building2 className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <div className="text-sm font-semibold font-display">Premiatto Connect</div>
          <div className="text-[11px] text-muted-foreground">Central Inteligente de Arquivos</div>
        </div>
        <div className="flex-1" />
        <span className="text-[10px] uppercase tracking-wider bg-muted text-muted-foreground px-2 py-1 rounded inline-flex items-center gap-1.5">
          <Lock className="h-3 w-3" /> Documento confidencial
        </span>
      </header>

      <main className="max-w-4xl mx-auto p-6 lg:p-10 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
          <div className="flex items-start gap-4">
            <FileIcon name={info.documentName} className="h-12 w-12" />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold font-display truncate">{info.documentName}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {info.documentDescription || 'Documento oficial disponibilizado pela Premiatto.'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Enviado por <span className="font-medium">{info.createdByName}</span>
                {info.recipientName && <> para <span className="font-medium">{info.recipientName}</span></>}
                {info.expiresAt && <> · válido até {new Date(info.expiresAt).toLocaleString('pt-BR')}</>}
              </p>
            </div>
          </div>
        </div>

        {!opened && (
          <div className="rounded-2xl border border-border bg-card p-6 lg:p-8 space-y-4">
            <h2 className="text-sm font-semibold">Autenticação</h2>
            {info.requireIdentify && (
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 px-3 rounded-lg border border-input bg-background text-sm"
                />
                <input
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 px-3 rounded-lg border border-input bg-background text-sm"
                />
              </div>
            )}
            {info.hasPassword && (
              <input
                type="password"
                placeholder="Senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-input bg-background text-sm"
              />
            )}
            <button
              onClick={() => open.mutate()}
              disabled={open.isPending}
              className="w-full h-11 rounded-lg gradient-brand text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              Visualizar documento
            </button>
            <p className="text-xs text-muted-foreground text-center">
              Ao continuar você concorda com a política de confidencialidade da Premiatto.
            </p>
          </div>
        )}

        {opened && (
          <div className="space-y-5">
            <FileViewer
              fileUrl={assetUrl(opened.filePath) || ''}
              fileType={opened.fileType}
              mimeType={opened.mimeType}
              allowDownload={opened.allowDownload}
              blockPrint={opened.blockPrint}
              watermark={name || email || 'Confidencial'}
              onDownload={download}
            />
            {opened.allowDownload && (
              <button
                onClick={download}
                className="h-10 px-4 rounded-lg border border-border text-sm inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" /> Baixar
              </button>
            )}
            {opened.requireAck && !ackDone && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-amber-900">
                      Declaro que li e estou ciente do conteúdo deste documento (v{opened.version}).
                    </div>
                    <button
                      onClick={() => ack.mutate()}
                      disabled={ack.isPending}
                      className="mt-3 h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
                    >
                      Confirmar leitura
                    </button>
                  </div>
                </div>
              </div>
            )}
            {ackDone && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                Leitura confirmada com sucesso · Protocolo <span className="font-mono font-semibold">{ackDone.protocolo}</span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
