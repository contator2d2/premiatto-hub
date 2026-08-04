import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  ArrowUp,
  Bell,
  ChevronRight,
  FileText,
  FolderOpen,
  HardDrive,
  MoreHorizontal,
  Plus,
  Settings2,
  Share2,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileIcon } from '@/components/file-icon';
import heroIllustration from '@/assets/hero-docs.png';

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
  recentEvents: any[];
  topDocs: {
    id: string;
    name: string;
    viewCount: number;
    downloadCount: number;
    isOfficial: boolean;
    updatedAt: string;
    version?: string;
    folder?: string;
    author?: string;
  }[];
};

const avatarColors = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-teal-500',
];

function Avatar({ name, i = 0 }: { name: string; i?: number }) {
  const initials = name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className={`h-7 w-7 rounded-full ${avatarColors[i % avatarColors.length]} text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-card`}
    >
      {initials}
    </div>
  );
}

// Removido em favor do FileIcon


export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => (await api.get('/dashboard/stats')).data as Stats,
  });

  const firstName = (user?.fullName || user?.email || '').split(' ')[0];
  const t = stats?.totals;

  const kpis = [
    {
      label: 'Total de documentos',
      value: t?.documents ?? 0,
      trend: '+12%',
      trendLabel: 'este mês',
      icon: FileText,
      tint: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Documentos oficiais',
      value: t?.officials ?? 0,
      trend: '+8%',
      trendLabel: 'este mês',
      icon: ShieldCheck,
      tint: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Pendentes de leitura',
      value: t?.pendingAcksGlobal ?? 0,
      trend: t?.pendingAcksMine ? `↑ ${t.pendingAcksMine} urgentes` : 'em dia',
      trendLabel: '',
      icon: Bell,
      tint: 'bg-rose-50 text-rose-600',
      trendClass: 'text-rose-600',
    },
    {
      label: 'Compartilhamentos ativos',
      value: t?.newLast7 ?? 0,
      trend: '+15%',
      trendLabel: 'este mês',
      icon: Share2,
      tint: 'bg-violet-50 text-violet-600',
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto p-6 lg:p-8 space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-card p-8 lg:p-10">
        <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 hidden md:block opacity-90">
          <img
            src={heroIllustration}
            alt=""
            className="h-48 w-auto object-contain"
            width={1024}
            height={768}
          />
        </div>
        <div className="relative flex items-start justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="flex items-center gap-2 text-base">
              <span className="text-muted-foreground font-medium">Olá, {firstName}!</span>
              <span>👋</span>
            </div>
            <h1 className="text-[28px] lg:text-[32px] font-display font-semibold tracking-tight leading-tight">
              Bem-vindo ao Premiatto Connect
            </h1>
            <p className="text-sm text-muted-foreground">
              Sua central inteligente de documentos e gestão corporativa.
            </p>
          </div>
          <button className="hidden md:inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors shadow-sm">
            <Settings2 className="h-4 w-4" />
            Personalizar dashboard
          </button>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className={`h-9 w-9 rounded-lg ${k.tint} flex items-center justify-center mb-4`}>
              <k.icon className="h-4 w-4" />
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">{k.label}</div>
            <div className="mt-1 text-3xl font-display font-semibold tracking-tight">
              {k.value.toLocaleString('pt-BR')}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className={`inline-flex items-center gap-0.5 font-semibold ${(k as any).trendClass || 'text-emerald-600'}`}>
                {!(k as any).trendClass && <ArrowUp className="h-3 w-3" />}
                {k.trend}
              </span>
              {k.trendLabel && <span className="text-muted-foreground">{k.trendLabel}</span>}
            </div>
          </div>
        ))}
        {/* Featured storage card */}
        <div className="rounded-xl gradient-hero-card text-white p-5 shadow-elegant relative overflow-hidden">
          <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 opacity-30">
            <HardDrive className="h-24 w-24" />
          </div>
          <div className="relative">
            <div className="text-[11px] font-medium text-white/70">Espaço utilizado</div>
            <div className="mt-1 text-3xl font-display font-semibold">62%</div>
            <div className="mt-3 h-1.5 rounded-full bg-white/15 overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: '62%' }} />
            </div>
            <div className="mt-2 text-[11px] text-white/80">124.5 GB de 200 GB</div>
          </div>
        </div>
      </section>

      {/* Quick access */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="mb-4">
          <h2 className="font-display font-semibold text-base">Acesso rápido</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Todos os arquivos', desc: 'Navegar todos', icon: FileText, to: '/documents', tint: 'bg-blue-50 text-blue-600' },
            { label: 'Documentos oficiais', desc: 'Acesso rápido', icon: ShieldCheck, to: '/documents?filter=officials', tint: 'bg-amber-50 text-amber-600' },
            { label: 'Pendentes de leitura', desc: 'Ver pendências', icon: Bell, to: '/documents?filter=pending', tint: 'bg-rose-50 text-rose-600', badge: t?.pendingAcksMine },
            { label: 'Compartilhados comigo', desc: 'Ver todos', icon: Share2, to: '/documents?filter=shared-with-me', tint: 'bg-violet-50 text-violet-600' },
          ].map((q) => (
            <Link
              key={q.label}
              to={q.to}
              className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/[0.02] transition-all"
            >
              <div className={`h-10 w-10 rounded-lg ${q.tint} flex items-center justify-center shrink-0`}>
                <q.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold truncate">{q.label}</div>
                  {q.badge ? (
                    <span className="text-[10px] font-semibold bg-primary text-primary-foreground rounded-md min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                      {q.badge}
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground truncate">{q.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent docs + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-display font-semibold text-base">Documentos recentes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/40">
                  <th className="px-6 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Pasta</th>
                  <th className="px-4 py-3 font-medium">Última atualização</th>
                  <th className="px-4 py-3 font-medium">Atividade</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {(stats?.topDocs ?? []).slice(0, 5).map((d, idx) => (
                  <tr key={d.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <FileIcon name={d.name} className="h-9 w-9" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground truncate">{d.name}</span>
                            {d.isOfficial && (
                              <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                Oficial
                              </span>
                            )}
                            {d.version && (
                              <span className="text-[11px] text-muted-foreground">v{d.version}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span className="text-[13px]">{d.folder || 'Institucional'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[13px]">
                        {formatDistanceToNow(new Date(d.updatedAt), { addSuffix: true, locale: ptBR })}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{d.author || 'Sistema'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex -space-x-2">
                        <Avatar name={d.author || 'GC'} i={idx} />
                        <Avatar name="MA" i={idx + 1} />
                        <span className="ml-2 self-center text-[11px] text-muted-foreground">+{d.viewCount % 5 + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </td>
                  </tr>
                ))}
                {(!stats?.topDocs || stats.topDocs.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                      Nenhum documento ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Link
            to="/documents"
            className="block px-6 py-3.5 border-t border-border text-center text-sm font-medium text-primary hover:bg-muted/40 transition-colors"
          >
            Ver todos os documentos <ChevronRight className="inline h-3.5 w-3.5 -mt-0.5" />
          </Link>
        </section>

        {/* Right column */}
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-base">Atividades recentes</h2>
              <Link to="/audit" className="text-xs text-primary hover:underline font-medium">
                Ver todas
              </Link>
            </div>
            <ul className="space-y-4">
              {(stats?.recentEvents ?? []).slice(0, 5).map((e: any, i: number) => (
                <li key={e.id} className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${['bg-blue-50 text-blue-600','bg-emerald-50 text-emerald-600','bg-amber-50 text-amber-600','bg-violet-50 text-violet-600','bg-rose-50 text-rose-600'][i%5]}`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px]">
                      <span className="font-medium">{e.user?.fullName || 'Sistema'}</span>{' '}
                      <span className="text-muted-foreground">{e.action}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                </li>
              ))}
              {(!stats?.recentEvents || stats.recentEvents.length === 0) && (
                <li className="text-sm text-muted-foreground text-center py-4">
                  Sem atividade recente
                </li>
              )}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display font-semibold text-base mb-4">Atalhos úteis</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Criar pasta', icon: FolderOpen, to: '/documents' },
                { label: 'Enviar arquivo', icon: Upload, to: '/documents' },
                { label: 'Compartilhar', icon: Share2, to: '/documents' },
                { label: 'Solicitação', icon: Plus, to: '/requests' },
              ].map((s) => (
                <Link
                  key={s.label}
                  to={s.to}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-[13px] font-medium hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
                >
                  <s.icon className="h-4 w-4 text-primary" />
                  <span className="truncate">{s.label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
