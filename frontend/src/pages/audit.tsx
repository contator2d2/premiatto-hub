import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity,
  Search,
  Filter,
  Download,
  Calendar,
  User as UserIcon,
} from 'lucide-react';
import { api } from '@/lib/api';

type Log = {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: any;
  ip?: string | null;
  createdAt: string;
  user?: { id: string; email: string; fullName?: string | null } | null;
};

type Summary = {
  total: number;
  last30: number;
  topActions: { action: string; count: number }[];
};

export default function AuditPage() {
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (action) p.set('action', action);
    if (entityType) p.set('entityType', entityType);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    p.set('limit', '500');
    return p.toString();
  }, [q, action, entityType, from, to]);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit', query],
    queryFn: async () => (await api.get(`/audit?${query}`)).data as Log[],
  });

  const { data: summary } = useQuery({
    queryKey: ['audit-summary'],
    queryFn: async () => (await api.get('/audit/summary')).data as Summary,
  });

  const exportCsv = () => {
    if (!logs) return;
    const rows = [
      ['data', 'usuario', 'email', 'acao', 'entidade', 'entidadeId', 'ip'].join(','),
      ...logs.map((l) =>
        [
          new Date(l.createdAt).toISOString(),
          l.user?.fullName || '',
          l.user?.email || '',
          l.action,
          l.entityType || '',
          l.entityId || '',
          l.ip || '',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      ),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setQ('');
    setAction('');
    setEntityType('');
    setFrom('');
    setTo('');
  };

  const hasFilter = q || action || entityType || from || to;

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-display">Auditoria</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro completo de ações da plataforma.
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!logs || logs.length === 0}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-background hover:bg-muted text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </button>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total de eventos
            </span>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3 text-3xl font-display font-semibold">
            {summary?.total ?? '—'}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Últimos 30 dias
            </span>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3 text-3xl font-display font-semibold">
            {summary?.last30 ?? '—'}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Ações mais frequentes
          </span>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(summary?.topActions ?? []).slice(0, 5).map((a) => (
              <button
                key={a.action}
                onClick={() => setAction(a.action)}
                className="text-[10px] uppercase tracking-wider bg-muted hover:bg-primary/10 hover:text-primary px-2 py-1 rounded-md font-medium transition-colors"
              >
                {a.action} · {a.count}
              </button>
            ))}
            {(!summary?.topActions || summary.topActions.length === 0) && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros</span>
          {hasFilter && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-primary hover:underline"
            >
              Limpar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar ação, entidade..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Ação (ex: document.view)"
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium">
            {isLoading ? 'Carregando…' : `${logs?.length ?? 0} registro(s)`}
          </span>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground bg-muted/40">
                <tr>
                  <th className="text-left px-5 py-2.5 font-medium">Ação</th>
                  <th className="text-left px-5 py-2.5 font-medium">Usuário</th>
                  <th className="text-left px-5 py-2.5 font-medium">Entidade</th>
                  <th className="text-left px-5 py-2.5 font-medium">IP</th>
                  <th className="text-right px-5 py-2.5 font-medium">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(logs ?? []).map((l) => (
                  <tr key={l.id} className="hover:bg-muted/40">
                    <td className="px-5 py-2.5">
                      <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                        {l.action}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <UserIcon className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {l.user?.fullName || l.user?.email || 'sistema'}
                          </div>
                          {l.user?.fullName && (
                            <div className="text-[11px] text-muted-foreground truncate">
                              {l.user.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {l.entityType ? (
                        <span>
                          {l.entityType}
                          {l.entityId && (
                            <span className="text-[11px] font-mono ml-1 opacity-60">
                              {l.entityId.slice(0, 8)}
                            </span>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground font-mono text-xs">
                      {l.ip || '—'}
                    </td>
                    <td className="px-5 py-2.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                      <div>
                        {formatDistanceToNow(new Date(l.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </div>
                      <div className="text-[10px] opacity-70">
                        {format(new Date(l.createdAt), 'dd/MM HH:mm', { locale: ptBR })}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!logs || logs.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-10 text-center text-sm text-muted-foreground"
                    >
                      Nenhum registro para os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
