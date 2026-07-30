import { Link } from 'react-router-dom';
import { ArrowLeft, Lock, Check, type LucideIcon } from 'lucide-react';

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  bullets?: string[];
};

export default function ComingSoon({ title, description, icon: Icon, bullets = [] }: Props) {
  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Dashboard
      </Link>

      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 lg:p-14 shadow-elegant">
        <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full gradient-brand opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-60 w-60 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-14 w-14 rounded-2xl gradient-brand text-primary-foreground flex items-center justify-center shadow-elegant">
              <Icon className="h-6 w-6" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 backdrop-blur px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Lock className="h-3 w-3" /> Em breve
            </span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-semibold font-display tracking-tight">{title}</h1>
          <p className="mt-3 text-muted-foreground text-base lg:text-lg leading-relaxed max-w-xl">
            {description}
          </p>

          {bullets.length > 0 && (
            <ul className="mt-8 grid sm:grid-cols-2 gap-3 max-w-xl">
              {bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2.5 rounded-xl border border-border bg-background/60 backdrop-blur px-3.5 py-3"
                >
                  <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground/90">{b}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10 rounded-2xl border border-dashed border-border/70 bg-background/40 p-5 max-w-xl">
            <p className="text-xs text-muted-foreground">
              Este módulo já faz parte da arquitetura do Premiatto Connect. A equipe está desenvolvendo
              a experiência completa. Você será notificado assim que estiver disponível para o seu perfil.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
