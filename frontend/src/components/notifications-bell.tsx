import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, Inbox } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Notification = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  url?: string | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: count } = useQuery({
    queryKey: ['notif-count'],
    queryFn: async () => (await api.get('/notifications/count')).data as { unread: number },
    refetchInterval: 30000,
  });

  const { data: items } = useQuery({
    queryKey: ['notif-list'],
    queryFn: async () => (await api.get('/notifications')).data as Notification[],
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-count'] });
      qc.invalidateQueries({ queryKey: ['notif-list'] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-count'] });
      qc.invalidateQueries({ queryKey: ['notif-list'] });
    },
  });

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  const unread = count?.unread ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-9 w-9 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground"
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-1rem)] bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Notificações</div>
              <div className="text-[11px] text-muted-foreground">
                {unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'}
              </div>
            </div>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!items || items.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Nenhuma notificação
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      'px-4 py-3 hover:bg-muted/60 cursor-pointer transition-colors',
                      !n.isRead && 'bg-primary/[0.03]',
                    )}
                    onClick={() => {
                      if (!n.isRead) markRead.mutate(n.id);
                      if (n.url) {
                        setOpen(false);
                        navigate(n.url);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full mt-1.5 shrink-0',
                          n.isRead ? 'bg-transparent' : 'bg-primary',
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{n.title}</div>
                        {n.body && (
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {n.body}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead.mutate(n.id);
                          }}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                          title="Marcar como lida"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
