import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/auth-context';
import { ReactNode } from 'react';
import AuthPage from './pages/auth';
import Dashboard from './pages/dashboard';
import DocumentsPage from './pages/documents';
import UsersPage from './pages/users';
import AuditPage from './pages/audit';
import BrandingAdmin from './pages/admin/branding';
import AppShell from './components/app-shell';

function Protected({ children, adminOnly = false, superAdminOnly = false }: { children: ReactNode; adminOnly?: boolean; superAdminOnly?: boolean }) {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Carregando…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (superAdminOnly && !isSuperAdmin) return <Navigate to="/dashboard" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/documents" element={<Protected><DocumentsPage /></Protected>} />
      <Route path="/users" element={<Protected adminOnly><UsersPage /></Protected>} />
      <Route path="/audit" element={<Protected adminOnly><AuditPage /></Protected>} />
      <Route path="/admin/branding" element={<Protected superAdminOnly><BrandingAdmin /></Protected>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

