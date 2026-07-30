import { useEffect, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { assetUrl } from '@/lib/api';

type Props = {
  /** URL do logo vindo do branding (pode ser inválida/quebrada) */
  src?: string | null;
  className?: string;
  /** Conteúdo exibido quando não há logo ou o logo falha ao carregar */
  fallback: ReactNode;
};

/**
 * Renderiza o logo do branding com fallback seguro:
 * se a URL estiver quebrada (404, arquivo removido), mostra o fallback
 * em vez de deixar uma imagem quebrada no layout.
 */
export function BrandLogo({ src, className, fallback }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const resolved = assetUrl(src);
  if (!resolved || failed) return <>{fallback}</>;

  return (
    <img
      src={resolved}
      alt=""
      className={cn(className)}
      onError={() => setFailed(true)}
    />
  );
}
