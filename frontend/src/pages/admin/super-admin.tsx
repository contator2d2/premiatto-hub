import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  Layers,
  ShieldCheck,
  Palette,
  FileCog,
  Database,
  Bell,
  Plug,
  HardDrive,
  ScrollText,
  KeySquare,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';

type Card = {
  title: string;
  description: string;
  icon: LucideIcon;
  to?: string;
  status: 'live' | 'coming_soon';
  group: string;
};

const CARDS: Card[] = [
  { title: 'Empresas & Franquias', description: 'Cadastro de empresas, franquias e unidades da rede.', icon: Building2, status: 'coming_soon', group: 'Organização' },
  { title: 'Departamentos', description: 'Estruture setores, hierarquia e áreas da operação.', icon: Layers, status: 'coming_soon', group: 'Organização' },
  { title: 'Categorias', description: 'Taxonomia global usada em documentos, marketing e cursos.', icon: FileCog, status: 'coming_soon', group: 'Organização' },
  { title: 'Usuários', description: 'Criar, editar e desativar usuários da plataforma.', icon: Users, to: '/users', status: 'live', group: 'Pessoas & Acesso' },
  { title: 'Templates de Acesso', description: 'Modelos de módulos visíveis por perfil (RBAC) e por usuário.', icon: ShieldCheck, to: '/admin/access-templates', status: 'live', group: 'Pessoas & Acesso' },
  { title: 'Autenticação & SSO', description: 'MFA, SSO corporativo, políticas de senha e sessões.', icon: KeySquare, status: 'coming_soon', group: 'Pessoas & Acesso' },
  { title: 'Identidade Visual', description: 'Nome, logos, favicon e cores institucionais da plataforma.', icon: Palette, to: '/admin/branding', status: 'live', group: 'Plataforma' },
  { title: 'Módulos', description: 'Ativar, desativar e configurar módulos do ecossistema.', icon: LayoutGrid, status: 'coming_soon', group: 'Plataforma' },
  { title: 'Notificações', description: 'Canais, templates e regras de envio (e-mail, push, WhatsApp).', icon: Bell, status: 'coming_soon', group: 'Plataforma' },
  { title: 'Integrações', description: 'APIs, webhooks e integrações com ERPs, CRMs e BI.', icon: Plug, status: 'coming_soon', group: 'Plataforma' },
  { title: 'Storage', description: 'Buckets, cotas e políticas de retenção de arquivos.', icon: HardDrive, status: 'coming_soon', group: 'Infraestrutura' },
  { title: 'Banco de Dados', description: 'Saúde do banco, backups e migrações.', icon: Database, status: 'coming_soon', group: 'Infraestrutura' },
  { title: 'Auditoria & Logs', description: 'Trilha completa de eventos, acessos e alterações.', icon: ScrollText, to: '/audit', status: 'live', group: 'Infraestrutura' },
];

const GROUPS = ['Organização', 'Pessoas & Acesso', 'Plataforma', 'Infraestrutura'];

export default function SuperAdminPage() {
  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-10">
      <header className="relative overflow-hidden rounded-2xl gradient-brand text-primary-foreground p-8 lg:p-10 shadow-elegant">
        <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-white/20">
            <ShieldCheck className="h-3 w-3" /> Painel do Super Admin
          </span>
          <h1 className="mt-3 text-3xl lg:text-4xl font-semibold font-display tracking-tight">
            Centro de Controle
          </h1>
          <p className="mt-2 text-primary-foreground/80 max-w-lg">
            Gerencie empresas, franquias, pessoas, permissões e toda a infraestrutura do Premiatto Connect
            em um único painel executivo.
          </p>
        </div>
      </header>

      {GROUPS.map((group) => (
        <section key={group} className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</h2>
            <div className="h-px flex-1 mx-4 bg-border" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CARDS.filter((c) => c.group === group).map((c) => {
              const inner = (
                <div className="group h-full rounded-2xl border border-border bg-card p-5 hover:shadow-elegant hover:-translate-y-0.5 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <c.icon className="h-5 w-5" />
                    </div>
                    {c.status === 'coming_soon' ? (
                      <span className="text-[10px] uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded font-semibold">
                        Em breve
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider bg-success/15 text-success px-2 py-0.5 rounded font-semibold">
                        Ativo
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{c.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{c.description}</p>
                </div>
              );
              if (c.status === 'live' && c.to) {
                return (
                  <Link key={c.title} to={c.to} className="block">
                    {inner}
                  </Link>
                );
              }
              return (
                <div key={c.title} className="opacity-90 cursor-not-allowed">
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
