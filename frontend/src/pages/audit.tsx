import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/lib/api';

export default function AuditPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: async () => (await api.get('/audit')).data,
  });

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight font-display">Auditoria</h1>
        <p className="text-sm text-muted-foreground mt-1">Registro de ações da plataforma.</p>
      </header>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <ul className="divide-y divide-border">
            {(logs ?? []).map((l: any) => (
              <li key={l.id} className="px-5 py-3 text-sm flex items-center gap-4">
                <span className="text-xs uppercase tracking-wider bg-muted px-2 py-0.5 rounded font-medium">{l.action}</span>
                <span className="text-muted-foreground truncate">{l.user?.email || 'sistema'}</span>
                <span className="ml-auto text-xs text-muted-foreground">{formatDistanceToNow(new Date(l.createdAt), { addSuffix: true, locale: ptBR })}</span>
              </li>
            ))}
            {(!logs || logs.length === 0) && <li className="p-10 text-center text-sm text-muted-foreground">Sem registros.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
