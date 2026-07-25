import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  FileText,
  ShieldCheck,
  TrendingUp,
  Clock,
  Users,
  AlertCircle,
  ArrowUpRight,
  Sparkles,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Link } from 'react-router-dom';
import { MODULES } from '@/lib/modules';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Stats = {
  totals: {
    documents: number;
    officials: number;
    newLast7: number;
    users: number;
    pendingAcksGlobal: number;
    pendingAcksMine: number;
    unreadNotifications: number;
  };
  timeline: { date: string; count: number }[];
  recentEvents: any[];
  topDocs: {
    id: string;
    name: string;
    viewCount: number;
    downloadCount: number;
    isOfficial: boolean;
    updatedAt: string;
  }[];
};

export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => (await api.get('/dashboard/stats')).data as Stats,
  });

  const firstName = (user?.fullName || user?.email || '').split(' ')[0];
  const t = stats?.totals;

  const cards = [
    {
      label: 'Documentos',
      value: t?.documents ?? 0,
      icon: FileText,
      hint: 'Total no acervo',
      accent: 'from-blue-500/20 to-blue-500/5',
    },
    {
      label: 'Oficiais',
      value: t?.officials ?? 0,
      icon: ShieldCheck,
      hint: 'Documentos oficiais',
      accent: 'from-emerald-500/20 to-emerald-500/5',
    },
    {
      label: 'Últimos 7 dias',
      value: t?.newLast7 ?? 0,
      icon: TrendingUp,
      hint: 'Novos uploads',
      accent: 'from-amber-500/20 to-amber-500/5',
    },
    {
      label: 'Usuários',
      value: t?.users ?? 0,
      icon: Users,
      hint: 'Colaboradores ativos',
      accent: 'from-purple-500/20 to-purple-500/5',
    },
  ];

  const maxTimeline = Math.max(1, ...(stats?.timeline?.map((d) => d.count) ?? [1]));
  const liveModules = MODULES.filter((m) => m.status === 'live').slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl gradient-brand text-primary-foreground p-8 lg:p-10 shadow-elegant">
        <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-medium ring-1 ring-white/20">
              <Clock className="h-3 w-3" />
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              })}
            </span>
            <h1 className="text-3xl lg:text-4xl font-display font-semibold tracking-tight">
              Olá, {firstName} 👋
            </h1>
            <p className="text-primary-foreground/80 max-w-xl">
              Bem-vindo à Premiatto Connect. Aqui está o resumo da sua operação hoje.
            </p>
          </div>
          {(t?.pendingAcksMine ?? 0) > 0 && (
            <Link
              to="/documents"
              className="rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/20 px-5 py-4 hover:bg-white/25 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                <AlertCircle className="h-3.5 w-3.5" />
                Ação necessária
              </div>
              <div className="mt-1 text-2xl font-semibold">{t?.pendingAcksMine}</div>
              <div className="text-xs text-primary-foreground/80">
                documento(s) aguardando sua ciência
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Stats cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${c.accent} opacity-60`} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {c.label}
                </span>
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-3 text-3xl font-display font-semibold">
                {isLoading ? '—' : c.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{c.hint}</div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline chart */}
        <section className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display font-semibold">Uploads recentes</h2>
              <p className="text-xs text-muted-foreground">Últimos 14 dias</p>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-end gap-1.5 h-40">
            {(stats?.timeline ?? []).map((d) => {
              const h = (d.count / maxTimeline) * 100;
              return (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center gap-1 group"
                  title={`${d.date}: ${d.count} upload(s)`}
                >
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full rounded-t bg-primary/70 hover:bg-primary transition-colors relative"
                      style={{ height: `${Math.max(h, 3)}%` }}
                    >
                      {d.count > 0 && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          {d.count}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(d.date).getDate()}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent activity */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Atividade recente</h2>
            {isAdmin && (
              <Link to="/audit" className="text-xs text-primary hover:underline">
                Ver tudo
              </Link>
            )}
          </div>
          <ul className="space-y-3">
            {(stats?.recentEvents ?? []).slice(0, 6).map((e: any) => (
              <li key={e.id} className="flex items-start gap-3 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{e.action}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {e.user?.fullName || e.user?.email || 'sistema'} ·{' '}
                    {formatDistanceToNow(new Date(e.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                </div>
              </li>
            ))}
            {(!stats?.recentEvents || stats.recentEvents.length === 0) && (
              <li className="text-sm text-muted-foreground text-center py-6">
                Sem atividade
              </li>
            )}
          </ul>
        </section>
      </div>

      {/* Top docs + modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Documentos em destaque</h2>
            <Link to="/documents" className="text-xs text-primary hover:underline">
              Central de arquivos
            </Link>
          </div>
          <ul className="space-y-1">
            {(stats?.topDocs ?? []).map((d) => (
              <li key={d.id}>
                <Link
                  to="/documents"
                  className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">
                      {d.name}
                      {d.isOfficial && (
                        <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {d.viewCount} visualização(ões) · {d.downloadCount} download(s)
                    </div>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </li>
            ))}
            {(!stats?.topDocs || stats.topDocs.length === 0) && (
              <li className="text-sm text-muted-foreground text-center py-6">
                Nenhum documento ainda
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold">Acesso rápido</h2>
              <p className="text-xs text-muted-foreground">Módulos disponíveis</p>
            </div>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {liveModules.map((m) => (
              <Link
                key={m.key}
                to={m.to}
                className="flex items-center gap-2.5 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
              >
                <m.icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium truncate">{m.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
