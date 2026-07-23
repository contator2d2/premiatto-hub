import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useBranding } from '@/contexts/branding-context';

export default function AuthPage() {
  const { user, login, register, loading } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await register(email, password, fullName);
        toast.success('Conta criada!');
      } else {
        await login(email, password);
        toast.success('Bem-vindo de volta!');
      }
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao autenticar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      <div className="hidden lg:flex relative gradient-brand text-primary-foreground p-12 flex-col justify-between overflow-hidden">
        <div className="relative z-10 flex items-center gap-3">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          )}
          <span className="text-lg font-semibold tracking-tight">{branding?.appName || 'Premiatto Connect'}</span>
        </div>
        <div className="relative z-10 space-y-6 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight font-display">
            {branding?.tagline || 'O ecossistema digital da Premiatto.'}
          </h1>
          <p className="text-primary-foreground/80 text-base leading-relaxed">
            Documentos, comunicação e conhecimento em uma plataforma única.
          </p>
        </div>
        <div className="relative z-10 text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Premiatto. Todos os direitos reservados.
        </div>
        <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight font-display">
              {mode === 'signin' ? 'Acesse sua conta' : 'Criar conta'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'signin' ? 'Entre com suas credenciais.' : 'Comece em segundos.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome completo</label>
                <input
                  type="text" required value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Seu nome"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">E-mail</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="voce@premiatto.com.br"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Senha</label>
              <input
                type="password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={submitting}
              className="w-full h-11 rounded-lg gradient-brand text-primary-foreground font-medium text-sm shadow-elegant hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'signin' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === 'signin' ? 'Não tem uma conta?' : 'Já possui conta?'}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-primary font-medium hover:underline"
            >
              {mode === 'signin' ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
