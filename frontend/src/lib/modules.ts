import {
  LayoutDashboard,
  FileText,
  GraduationCap,
  Megaphone,
  Radio,
  Inbox,
  BookOpen,
  Calendar,
  Handshake,
  Store,
  Target,
  BarChart3,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { AppRole } from './utils';

export type ModuleGroup = 'workspace' | 'conhecimento' | 'operacao' | 'inteligencia';

export type PlatformModule = {
  key: string;
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  group: ModuleGroup;
  status: 'live' | 'coming_soon';
  requiredRoles?: AppRole[]; // if omitted, everyone with account sees it
};

export const GROUP_LABELS: Record<ModuleGroup, string> = {
  workspace: 'Workspace',
  conhecimento: 'Conhecimento',
  operacao: 'Operação',
  inteligencia: 'Inteligência',
};

export const MODULES: PlatformModule[] = [
  {
    key: 'dashboard',
    to: '/dashboard',
    label: 'Dashboard',
    description: 'Visão geral do ecossistema Premiatto Connect.',
    icon: LayoutDashboard,
    group: 'workspace',
    status: 'live',
  },
  {
    key: 'documents',
    to: '/documents',
    label: 'Central de Documentos',
    description: 'Central Inteligente de Documentos — pastas, versões, ciência e compartilhamento.',
    icon: FileText,
    group: 'workspace',
    status: 'live',
  },
  {
    key: 'university',
    to: '/university',
    label: 'Universidade Premiatto',
    description: 'EAD corporativo com trilhas, cursos, avaliações e certificados.',
    icon: GraduationCap,
    group: 'conhecimento',
    status: 'coming_soon',
  },
  {
    key: 'knowledge',
    to: '/knowledge',
    label: 'Base de Conhecimento',
    description: 'Wiki corporativa com POPs, tutoriais, FAQ e boas práticas.',
    icon: BookOpen,
    group: 'conhecimento',
    status: 'coming_soon',
  },
  {
    key: 'marketing',
    to: '/marketing',
    label: 'Marketing Hub',
    description: 'Biblioteca oficial de artes, vídeos, campanhas e materiais aprovados.',
    icon: Megaphone,
    group: 'conhecimento',
    status: 'coming_soon',
  },
  {
    key: 'communication',
    to: '/communication',
    label: 'Central de Comunicação',
    description: 'Comunicados, avisos, notícias e campanhas internas.',
    icon: Radio,
    group: 'operacao',
    status: 'coming_soon',
  },
  {
    key: 'requests',
    to: '/requests',
    label: 'Central de Solicitações',
    description: 'Chamados de Marketing, Financeiro, Jurídico, RH e Operacional.',
    icon: Inbox,
    group: 'operacao',
    status: 'coming_soon',
  },
  {
    key: 'calendar',
    to: '/calendar',
    label: 'Calendário Corporativo',
    description: 'Eventos, treinamentos, campanhas e agenda oficial da rede.',
    icon: Calendar,
    group: 'operacao',
    status: 'coming_soon',
  },
  {
    key: 'correspondent',
    to: '/correspondent',
    label: 'Portal do Correspondente',
    description: 'Área exclusiva para correspondentes — documentos, marketing e solicitações.',
    icon: Handshake,
    group: 'operacao',
    status: 'coming_soon',
  },
  {
    key: 'franchise',
    to: '/franchise',
    label: 'Portal do Franqueado',
    description: 'Dashboard, treinamentos, marketing, documentos e indicadores das franquias.',
    icon: Store,
    group: 'operacao',
    status: 'coming_soon',
  },
  {
    key: 'crm',
    to: '/crm',
    label: 'CRM Comercial',
    description: 'Pipeline, clientes, leads e oportunidades comerciais.',
    icon: Target,
    group: 'inteligencia',
    status: 'coming_soon',
  },
  {
    key: 'bi',
    to: '/bi',
    label: 'Business Intelligence',
    description: 'Dashboards executivos, KPIs e indicadores da rede.',
    icon: BarChart3,
    group: 'inteligencia',
    status: 'coming_soon',
  },
  {
    key: 'ai',
    to: '/ai',
    label: 'Inteligência Artificial',
    description: 'Assistente Premiatto — respostas, busca inteligente e apoio operacional.',
    icon: Sparkles,
    group: 'inteligencia',
    status: 'coming_soon',
  },
];

export function getModuleByKey(key: string) {
  return MODULES.find((m) => m.key === key);
}
