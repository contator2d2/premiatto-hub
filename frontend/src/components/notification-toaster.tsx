import { useEffect, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Bell, X, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

type Notification = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  url?: string | null;
  isRead: boolean;
  createdAt: string;
};

// Tipos considerados "críticos" — exibem popup persistente.
// Qualquer notificação onde o back-end marcar type contendo essas palavras.
const CRITICAL_TYPES = ['ack', 'ciencia', 'urgent', 'critical', 'alert', 'obrigat'];

function isCritical(n: Notification) {
  const t = (n.type || '').toLowerCase();
  return CRITICAL_TYPES.some((k) => t.includes(k));
}

const DISMISS_KEY = 'pc.notif.dismissed';

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>) {
  try {
    // guarda no máx. 200 ids para não crescer indefinidamente
    const arr = Array.from(set).slice(-200);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(arr));
  } catch {
    /* noop */
  }
}

export function NotificationToaster() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());

  const { data: items } = useQuery({
    queryKey: ['notif-list-toaster'],
    queryFn: async () => (await api.get('/notifications?unread=true')).data as Notification[],
    refetchInterval: 30000,
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-count'] });
      qc.invalidateQueries({ queryKey: ['notif-list'] });
      qc.invalidateQueries({ queryKey: ['notif-list-toaster'] });
    },
  });

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(next);
  };

  useEffect(() => {
    // limpa dismissed que não estão mais na lista (foram lidos)
    if (!items) return;
    const alive = new Set(items.map((i) => i.id));
    const next = new Set(Array.from(dismissed).filter((id) => alive.has(id)));
    if (next.size !== dismissed.size) {
      setDismissed(next);
      saveDismissed(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items?.length]);

  if (!user) return null;

  const visible = (items ?? [])
    .filter((n) => isCritical(n) && !n.isRead && !dismissed.has(n.id))
    .slice(0, 4); // limita a 4 popups simultâneos

  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 w-[min(380px,calc(100vw-2rem))] pointer-events-none">
      {visible.map((n, idx) => (
        <div
          key={n.id}
          className={cn(
            'pointer-events-auto rounded-xl border border-border bg-card shadow-2xl',
            'animate-in slide-in-from-right-6 fade-in duration-300',
            'ring-1 ring-primary/20',
          )}
          style={{ animationDelay: `${idx * 60}ms` }}
          role="alertdialog"
          aria-live="assertive"
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {isCritical(n) ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">
                    Ação necessária
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold leading-snug">{n.title}</div>
                {n.body && (
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-3">
                    {n.body}
                  </div>
                )}
              </div>
              <button
                onClick={() => dismiss(n.id)}
                className="shrink-0 h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fechar"
                title="Fechar (permanece pendente até você tratar)"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {n.url && (
                <button
                  onClick={() => {
                    markRead.mutate(n.id);
                    dismiss(n.id);
                    navigate(n.url!);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Abrir
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={() => {
                  markRead.mutate(n.id);
                  dismiss(n.id);
                }}
                className="flex-1 inline-flex items-center justify-center h-8 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium transition-colors"
              >
                Marcar como lida
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
