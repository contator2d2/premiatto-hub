import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FileText, Users, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  const { data: docs } = useQuery({
    queryKey: ['docs-recent'],
    queryFn: async () => (await api.get('/documents')).data,
  });

  const stats = [
    { label: 'Documentos', value: docs?.length ?? 0, icon: FileText },
    { label: 'Oficiais', value: docs?.filter((d: any) => d.isOfficial).length ?? 0, icon: ShieldCheck },
    ...(isAdmin ? [{ label: 'Perfil', value: user?.roles?.join(', '), icon: Users }] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight font-display">Olá, {user?.fullName || user?.email}</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral da plataforma.</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-2xl font-semibold">{s.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Documentos recentes</h2>
        <ul className="divide-y divide-border">
          {(docs ?? []).slice(0, 8).map((d: any) => (
            <li key={d.id} className="py-3 flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{d.name}</div>
                <div className="text-xs text-muted-foreground truncate">{d.description || '—'}</div>
              </div>
              {d.isOfficial && (
                <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">Oficial</span>
              )}
            </li>
          ))}
          {(!docs || docs.length === 0) && <li className="py-8 text-sm text-muted-foreground text-center">Nenhum documento ainda.</li>}
        </ul>
      </section>
    </div>
  );
}
