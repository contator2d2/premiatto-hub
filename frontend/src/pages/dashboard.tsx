import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FileText, ShieldCheck, TrendingUp, Clock, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();

  const { data: docs } = useQuery({
    queryKey: ['docs-recent'],
    queryFn: async () => (await api.get('/documents')).data as any[],
  });

  const total = docs?.length ?? 0;
  const officials = docs?.filter((d: any) => d.isOfficial).length ?? 0;
  const recent7 =
    docs?.filter((d: any) => {
      const t = new Date(d.createdAt).getTime();
      return Date.now() - t < 7 * 24 * 60 * 60 * 1000;
    }).length ?? 0;

  const stats = [
    { label: 'Documentos', value: total, icon: FileText, hint: 'Total no acervo' },
    { label: 'Oficiais', value: officials, icon: ShieldCheck, hint: 'Marcados como oficial' },
    { label: 'Últimos 7 dias', value: recent7, icon: TrendingUp, hint: 'Novos uploads' },
  ];

  const firstName = (user?.fullName || user?.email || '').split(' ')[0];

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
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </span>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight font-display leading-tight">
              Olá, {firstName || 'colaborador'} 👋
            </h1>
            <p className="text-primary-foreground/80 max-w-lg">
              Aqui está um resumo do seu workspace. Acesse documentos, revise atualizações e continue de onde parou.
            </p>
          </div>
          <Link
            to="/documents"
            className="inline-flex items-center gap-2 rounded-xl bg-white text-foreground px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-white/90 transition"
          >
            Ir para documentos <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="group rounded-2xl border border-border bg-card p-5 hover:shadow-elegant hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{s.label}</span>
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 text-3xl font-semibold font-display tracking-tight">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
          </div>
        ))}
      </section>

      {/* Recent documents */}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Documentos recentes</h2>
            <p className="text-xs text-muted-foreground">Últimos arquivos publicados no acervo</p>
          </div>
          <Link to="/documents" className="text-xs font-medium text-primary hover:underline">
            Ver todos
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {(docs ?? []).slice(0, 8).map((d: any) => (
            <li key={d.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-muted/40 transition-colors">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{d.name}</div>
                <div className="text-xs text-muted-foreground truncate">{d.description || 'Sem descrição'}</div>
              </div>
              {d.isOfficial && (
                <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">
                  Oficial
                </span>
              )}
              <span className="hidden sm:inline text-xs text-muted-foreground">
                {d.createdAt ? new Date(d.createdAt).toLocaleDateString('pt-BR') : ''}
              </span>
            </li>
          ))}
          {(!docs || docs.length === 0) && (
            <li className="py-16 text-sm text-muted-foreground text-center">
              <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
              Nenhum documento ainda.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
