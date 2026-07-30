import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, Loader2, ShieldCheck, Sparkles, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { BrandLogo } from '@/components/brand-logo';
import { useBranding } from '@/contexts/branding-context';

export default function AuthPage() {
  const { user, login, loading } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Bem-vindo de volta!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao autenticar');
    } finally {
      setSubmitting(false);
    }
  }

  const appName = branding?.appName || 'Premiatto Connect';
  const hasLogo = !!(branding?.logoUrl && String(branding.logoUrl).trim());


  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1.1fr_1fr] bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex relative gradient-brand text-primary-foreground p-14 flex-col justify-between overflow-hidden">
        {/* subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="pointer-events-none absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-[22rem] w-[22rem] rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <BrandLogo
            src={branding?.logoUrl}
            className="h-11 w-11 rounded-2xl object-cover ring-1 ring-white/20"
            fallback={
              <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/20">
                <Building2 className="h-5 w-5" />
              </div>
            }
          />
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight">{appName}</span>
            <span className="text-xs text-primary-foreground/70">Plataforma corporativa</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-medium ring-1 ring-white/15">
            <Sparkles className="h-3.5 w-3.5" /> Acesso restrito a colaboradores
          </div>
          <h1 className="text-[2.75rem] font-semibold leading-[1.05] tracking-tight font-display">
            {branding?.tagline || 'Um só lugar para documentos, pessoas e conhecimento.'}
          </h1>
          <p className="text-primary-foreground/80 text-base leading-relaxed max-w-md">
            Centralize processos, comunique com clareza e mantenha sua operação sob controle — em uma plataforma moderna e segura.
          </p>

          <ul className="space-y-3 pt-2">
            {[
              { icon: ShieldCheck, text: 'Segurança corporativa com RBAC e auditoria completa' },
              { icon: Lock, text: 'Documentos criptografados e rastreamento de acesso' },
              { icon: Sparkles, text: 'Experiência premium inspirada em Linear e Notion' },
            ].map((f) => (
              <li key={f.text} className="flex items-start gap-3 text-sm text-primary-foreground/90">
                <div className="mt-0.5 h-6 w-6 rounded-md bg-white/15 flex items-center justify-center ring-1 ring-white/15">
                  <f.icon className="h-3.5 w-3.5" />
                </div>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} {appName}. Todos os direitos reservados.
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-3">
            <BrandLogo
              src={branding?.logoUrl}
              className="h-10 w-10 rounded-xl object-cover"
              fallback={
                <div className="h-10 w-10 rounded-xl gradient-brand flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
              }
            />
            <span className="text-lg font-semibold">{appName}</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-[1.7rem] font-semibold tracking-tight font-display leading-tight">
              Acesse sua conta
            </h2>
            <p className="text-sm text-muted-foreground">
              Use suas credenciais corporativas para entrar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">E-mail</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition"
                placeholder="voce@premiatto.com.br"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Senha</label>
              <input
                type="password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit" disabled={submitting}
              className="w-full h-11 rounded-xl gradient-brand text-primary-foreground font-medium text-sm shadow-elegant hover:opacity-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </button>
          </form>

          <div className="rounded-xl border border-border bg-muted/40 p-4 flex items-start gap-3">
            <Lock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Contas são criadas apenas por administradores internos. Se você precisa de acesso, fale com o responsável da sua equipe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
