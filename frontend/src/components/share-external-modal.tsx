import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Copy, MessageCircle, Link2, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';

type Props = { documentId: string; documentName: string; onClose: () => void };

export function ShareExternalModal({ documentId, documentName, onClose }: Props) {
  const qc = useQueryClient();
  const [state, setState] = useState({
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
    recipientCompany: '',
    password: '',
    expiresAt: '',
    maxAccesses: '' as string | number,
    allowDownload: false,
    requireAck: false,
    requireIdentify: false,
    blockPrint: false,
    notes: '',
  });
  const [createdLink, setCreatedLink] = useState<{ token: string; url: string; password: string } | null>(null);

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/documents/${documentId}/public-links`, {
          ...state,
          maxAccesses: state.maxAccesses ? parseInt(String(state.maxAccesses), 10) : null,
          expiresAt: state.expiresAt || null,
          password: state.password || undefined,
        })
      ).data,
    onSuccess: (data: any) => {
      const url = `${window.location.origin}/p/${data.token}`;
      setCreatedLink({ token: data.token, url, password: state.password });
      qc.invalidateQueries({ queryKey: ['doc-public-links', documentId] });
      qc.invalidateQueries({ queryKey: ['doc-timeline', documentId] });
      toast.success('Link seguro gerado');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Falha ao gerar link'),
  });

  function copyLink() {
    if (!createdLink) return;
    navigator.clipboard.writeText(createdLink.url);
    toast.success('Link copiado');
  }

  function shareWhatsApp() {
    if (!createdLink) return;
    const phone = (state.recipientPhone || '').replace(/\D/g, '');
    const msg = `Olá${state.recipientName ? ` ${state.recipientName}` : ''}, foi disponibilizado um documento oficial da Premiatto para sua consulta.\n\n📄 ${documentName}\n\n🔗 Link seguro: ${createdLink.url}\n\nA senha de acesso será enviada separadamente. Este link é confidencial.`;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold font-display">Compartilhar externamente</h2>
            <p className="text-xs text-muted-foreground truncate">
              Link seguro com token para pessoas fora do Premiatto Connect · {documentName}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {createdLink ? (
          <div className="p-6 space-y-5">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Link criado com sucesso. Compartilhe com a pessoa autorizada.
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Link seguro
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  readOnly
                  value={createdLink.url}
                  className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={copyLink}
                  className="h-10 px-3 rounded-lg border border-border text-sm inline-flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" /> Copiar
                </button>
              </div>
            </div>
            {createdLink.password && (
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Senha de acesso
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    readOnly
                    value={createdLink.password}
                    className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdLink.password);
                      toast.success('Senha copiada');
                    }}
                    className="h-10 px-3 rounded-lg border border-border text-sm inline-flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" /> Copiar
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" /> Envie a senha por um canal separado do link.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={shareWhatsApp}
                className="flex-1 h-11 rounded-lg bg-[#25D366] text-white text-sm font-medium inline-flex items-center justify-center gap-2 hover:brightness-95"
              >
                <MessageCircle className="h-4 w-4" /> Enviar pelo WhatsApp
              </button>
              <button
                onClick={onClose}
                className="h-11 px-4 rounded-lg border border-border text-sm"
              >
                Concluído
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Destinatário
                  </label>
                  <input
                    value={state.recipientName}
                    onChange={(e) => setState({ ...state, recipientName: e.target.value })}
                    placeholder="Nome"
                    className="mt-2 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Empresa
                  </label>
                  <input
                    value={state.recipientCompany}
                    onChange={(e) => setState({ ...state, recipientCompany: e.target.value })}
                    placeholder="Opcional"
                    className="mt-2 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={state.recipientEmail}
                    onChange={(e) => setState({ ...state, recipientEmail: e.target.value })}
                    placeholder="opcional"
                    className="mt-2 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Telefone (WhatsApp)
                  </label>
                  <input
                    value={state.recipientPhone}
                    onChange={(e) => setState({ ...state, recipientPhone: e.target.value })}
                    placeholder="Ex: 5511999999999"
                    className="mt-2 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Senha do link
                  </label>
                  <input
                    value={state.password}
                    onChange={(e) => setState({ ...state, password: e.target.value })}
                    placeholder="Deixe em branco para não exigir"
                    className="mt-2 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Expira em
                  </label>
                  <input
                    type="datetime-local"
                    value={state.expiresAt}
                    onChange={(e) => setState({ ...state, expiresAt: e.target.value })}
                    className="mt-2 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Limite de acessos
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={state.maxAccesses}
                    onChange={(e) => setState({ ...state, maxAccesses: e.target.value })}
                    placeholder="Ilimitado"
                    className="mt-2 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Observações internas
                  </label>
                  <input
                    value={state.notes}
                    onChange={(e) => setState({ ...state, notes: e.target.value })}
                    placeholder="Opcional"
                    className="mt-2 w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={state.allowDownload} onChange={(e) => setState({ ...state, allowDownload: e.target.checked })} />
                  Permitir download
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={state.requireAck} onChange={(e) => setState({ ...state, requireAck: e.target.checked })} />
                  Exigir confirmação de leitura
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={state.requireIdentify} onChange={(e) => setState({ ...state, requireIdentify: e.target.checked })} />
                  Exigir identificação (nome + e-mail)
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={state.blockPrint} onChange={(e) => setState({ ...state, blockPrint: e.target.checked })} />
                  Bloquear impressão (quando possível)
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
              <button onClick={onClose} className="h-10 px-4 rounded-lg border border-border text-sm">
                Cancelar
              </button>
              <button
                onClick={() => create.mutate()}
                disabled={create.isPending}
                className="h-10 px-4 rounded-lg gradient-brand text-primary-foreground text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Link2 className="h-4 w-4" /> Gerar link seguro
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
