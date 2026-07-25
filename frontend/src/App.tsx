import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/auth-context';
import { ReactNode } from 'react';
import AuthPage from './pages/auth';
import Dashboard from './pages/dashboard';
import DocumentsPage from './pages/documents';
import PublicDocumentPage from './pages/public-document';
import UsersPage from './pages/users';
import AuditPage from './pages/audit';
import BrandingAdmin from './pages/admin/branding';
import SuperAdminPage from './pages/admin/super-admin';
import AccessTemplatesPage from './pages/admin/access-templates';
import ComingSoon from './pages/coming-soon';
import AppShell from './components/app-shell';
import { NotificationToaster } from './components/notification-toaster';
import { MODULES } from './lib/modules';

function Protected({
  children,
  adminOnly = false,
  superAdminOnly = false,
  moduleKey,
}: {
  children: ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  moduleKey?: string;
}) {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;
  if (superAdminOnly && !isSuperAdmin) return <Navigate to="/dashboard" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (moduleKey && !isSuperAdmin && user.allowedModules && !user.allowedModules.includes(moduleKey)) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <>
      <AppShell>{children}</AppShell>
      <NotificationToaster />
    </>
  );
}

const COMING_SOON_BULLETS: Record<string, string[]> = {
  university: ['Trilhas por cargo', 'Vídeo-aulas e avaliações', 'Certificados automáticos', 'Progresso individual'],
  knowledge: ['Wiki colaborativa', 'POPs e fluxos', 'FAQ com busca', 'Versionamento de conteúdo'],
  marketing: ['Artes e vídeos oficiais', 'Templates aprovados', 'Campanhas ativas', 'Download em lote'],
  communication: ['Comunicados oficiais', 'Segmentação por perfil', 'Confirmação de leitura', 'Histórico completo'],
  requests: ['Fluxos por departamento', 'SLA e acompanhamento', 'Anexos e comentários', 'Aprovações multinível'],
  calendar: ['Agenda corporativa', 'Eventos e treinamentos', 'Sincronização Google/Outlook', 'Lembretes automáticos'],
  correspondent: ['Documentos exclusivos', 'Marketing autorizado', 'Solicitações rápidas', 'Treinamentos dedicados'],
  franchise: ['Dashboard da unidade', 'Indicadores em tempo real', 'Comunicação com a rede', 'Materiais oficiais'],
  crm: ['Pipeline visual', 'Leads e oportunidades', 'Automação comercial', 'Relatórios de conversão'],
  bi: ['KPIs executivos', 'Dashboards customizáveis', 'Comparativos por unidade', 'Exportação de dados'],
  ai: ['Assistente Premiatto', 'Busca inteligente em documentos', 'Explicação de processos', 'Apoio 24/7'],
};

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/p/:token" element={<PublicDocumentPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/dashboard" element={<Protected moduleKey="dashboard"><Dashboard /></Protected>} />
      <Route path="/documents" element={<Protected moduleKey="documents"><DocumentsPage /></Protected>} />

      {MODULES.filter((m) => m.status === 'coming_soon').map((m) => (
        <Route
          key={m.key}
          path={m.to}
          element={
            <Protected moduleKey={m.key}>
              <ComingSoon
                title={m.label}
                description={m.description}
                icon={m.icon}
                bullets={COMING_SOON_BULLETS[m.key] || []}
              />
            </Protected>
          }
        />
      ))}

      <Route path="/users" element={<Protected adminOnly><UsersPage /></Protected>} />
      <Route path="/audit" element={<Protected adminOnly><AuditPage /></Protected>} />

      <Route path="/admin" element={<Protected superAdminOnly><SuperAdminPage /></Protected>} />
      <Route path="/admin/branding" element={<Protected superAdminOnly><BrandingAdmin /></Protected>} />
      <Route path="/admin/access-templates" element={<Protected superAdminOnly><AccessTemplatesPage /></Protected>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
