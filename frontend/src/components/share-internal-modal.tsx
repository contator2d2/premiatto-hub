import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { ALL_ROLES, type AppRole } from '@/lib/utils';

type Props = { documentId: string; documentName: string; onClose: () => void };

export function ShareInternalModal({ documentId, documentName, onClose }: Props) {
  const qc = useQueryClient();
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data as any[],
  });

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [scopeAll, setScopeAll] = useState(false);
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [requireAck, setRequireAck] = useState(false);
  const [allowDownload, setAllowDownload] = useState(true);
  const [dueAt, setDueAt] = useState('');

  const send = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/documents/${documentId}/shares`, {
          targetUserIds: selectedUsers,
          targetRoles: selectedRoles,
          scopeAll,
          message: message || undefined,
          priority,
          requireAck,
          allowDownload,
          dueAt: dueAt || null,
        })
      ).data,
    onSuccess: () => {
      toast.success('Documento compartilhado');
      qc.invalidateQueries({ queryKey: ['doc-shares', documentId] });
      qc.invalidateQueries({ queryKey: ['doc-timeline', documentId] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Falha ao compartilhar'),
  });

  const canSend = scopeAll || selectedUsers.length > 0 || selectedRoles.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold font-display">Compartilhar internamente</h2>
            <p className="text-xs text-muted-foreground truncate">{documentName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Usuários
            </label>
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-background divide-y divide-border">
              {(users ?? []).map((u: any) => (
                <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={(e) =>
                      setSelectedUsers((prev) =>
                        e.target.checked ? [...prev, u.id] : prev.filter((x) => x !== u.id),
                      )
                    }
                  />
                  <div className="text-sm min-w-0 flex-1">
                    <div className="font-medium truncate">{u.fullName || u.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Perfis (RBAC)
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_ROLES.map((r) => {
                const active = selectedRoles.includes(r);
                return (
                  <button
                    key={r}
                    onClick={() =>
                      setSelectedRoles((prev) => (active ? prev.filter((x) => x !== r) : [...prev, r]))
                    }
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {r.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={scopeAll} onChange={(e) => setScopeAll(e.target.checked)} />
            Compartilhar com toda a plataforma
          </label>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Mensagem (opcional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="mt-2 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
              placeholder="Ex: Segue a nova versão do contrato padrão. Favor ler e confirmar."
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="mt-2 w-full h-9 px-2 rounded border border-input bg-background text-sm"
              >
                <option value="normal">Normal</option>
                <option value="important">Importante</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Prazo p/ leitura
              </label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="mt-2 w-full h-9 px-2 rounded border border-input bg-background text-sm"
              />
            </div>
            <div className="flex flex-col gap-2 pt-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={requireAck} onChange={(e) => setRequireAck(e.target.checked)} />
                Exigir ciência
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} />
                Permitir download
              </label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-border text-sm">
            Cancelar
          </button>
          <button
            onClick={() => send.mutate()}
            disabled={!canSend || send.isPending}
            className="h-10 px-4 rounded-lg gradient-brand text-primary-foreground text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
}
