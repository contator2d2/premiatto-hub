import { cn } from '@/lib/utils';
import { Check, CheckCheck, BadgeCheck } from 'lucide-react';

export type ShareStatusValue = 'delivered' | 'viewed' | 'opened' | 'acknowledged';

type Props = {
  status: ShareStatusValue;
  deliveredAt?: string | Date | null;
  viewedAt?: string | Date | null;
  openedAt?: string | Date | null;
  acknowledgedAt?: string | Date | null;
  compact?: boolean;
};

function fmt(d?: string | Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR');
}

export function ShareStatus({ status, deliveredAt, viewedAt, openedAt, acknowledgedAt, compact }: Props) {
  const label =
    status === 'acknowledged'
      ? 'Leitura confirmada'
      : status === 'opened'
        ? 'Documento aberto'
        : status === 'viewed'
          ? 'Notificação visualizada'
          : 'Entregue';

  const tooltip = [
    `Entregue: ${fmt(deliveredAt)}`,
    `Visualizado: ${fmt(viewedAt)}`,
    `Aberto: ${fmt(openedAt)}`,
    `Leitura: ${fmt(acknowledgedAt)}`,
  ].join('\n');

  const icon =
    status === 'acknowledged' ? (
      <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
    ) : status === 'opened' ? (
      <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
    ) : status === 'viewed' ? (
      <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
    ) : (
      <Check className="h-3.5 w-3.5 text-muted-foreground" />
    );

  return (
    <span
      title={tooltip}
      className={cn(
        'inline-flex items-center gap-1 text-[11px]',
        status === 'acknowledged' && 'text-emerald-700',
        status === 'opened' && 'text-sky-600',
        !compact && 'font-medium',
      )}
    >
      {icon}
      {!compact && label}
    </span>
  );
}
