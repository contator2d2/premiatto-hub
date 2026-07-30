import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle, X } from 'lucide-react';

type HelpTopic = {
  title: string;
  intro: string;
  steps: string[];
  tips?: string[];
};

const HELP: { match: (path: string, search: string) => boolean; topic: HelpTopic }[] = [
  {
    match: (p, s) => p.startsWith('/documents') && s.includes('filter=pending'),
    topic: {
      title: 'Pendentes de leitura',
      intro:
        'Aqui ficam os documentos compartilhados com você que exigem confirmação de leitura (ciência).',
      steps: [
        'Abra o documento na lista.',
        'Leia o conteúdo no visualizador.',
        'Clique em "Confirmar leitura" no painel lateral.',
        'A confirmação registra data, hora e IP na auditoria.',
      ],
      tips: ['O número no menu mostra quantas confirmações ainda faltam para você.'],
    },
  },
  {
    match: (p) => p.startsWith('/documents'),
    topic: {
      title: 'Central de Documentos',
      intro: 'Organize, versione, compartilhe e acompanhe todos os arquivos da Premiatto.',
      steps: [
        'Use "Enviar arquivo" para subir um documento e definir categoria, tags e se exige leitura.',
        'Clique em um documento para abrir o painel com versões, compartilhamentos e histórico.',
        'Use o botão de download para baixar o arquivo com o nome original.',
        'Compartilhe internamente (usuário, departamento ou perfil) ou gere um link externo com senha e validade.',
      ],
      tips: [
        'Os filtros da lateral (Oficiais, Compartilhados, Favoritos, Lixeira) refinam a listagem.',
        'Os "vistos" indicam entrega, abertura e confirmação — não provam leitura integral.',
      ],
    },
  },
  {
    match: (p) => p === '/' || p.startsWith('/dashboard'),
    topic: {
      title: 'Dashboard',
      intro: 'Visão geral do ecossistema: indicadores, pendências e atividades recentes.',
      steps: [
        'Confira os cards de indicadores no topo (documentos, oficiais, novos, pendências).',
        'Use os atalhos rápidos para ir direto ao que precisa.',
        'Acompanhe as atividades recentes e os documentos mais acessados.',
      ],
    },
  },
  {
    match: (p) => p.startsWith('/users'),
    topic: {
      title: 'Usuários',
      intro: 'Cadastre e administre as pessoas com acesso à plataforma.',
      steps: [
        'Clique em "Novo usuário" para criar um acesso interno (não há autocadastro).',
        'Use o menu de cada linha para editar nome, telefone, cargo e status.',
        'Use "Redefinir senha" para gerar uma nova senha para o colaborador.',
      ],
    },
  },
  {
    match: (p) => p.startsWith('/audit'),
    topic: {
      title: 'Auditoria',
      intro: 'Registro imutável de tudo que acontece na plataforma.',
      steps: [
        'Filtre por período, usuário ou tipo de evento.',
        'Exporte o resultado em CSV para relatórios e compliance.',
      ],
    },
  },
  {
    match: (p) => p.startsWith('/admin/branding'),
    topic: {
      title: 'Marca',
      intro: 'Personalize nome, cores, logos e favicon da plataforma (exclusivo Super Admin).',
      steps: [
        'Defina o nome e a tagline do app.',
        'Escolha a cor primária e a de destaque (use hex válido, ex.: #0B3D91).',
        'Envie logo claro, logo escuro e favicon (PNG ou SVG quadrado, até 5 MB).',
        'Clique em "Salvar alterações" — o tema é aplicado imediatamente.',
      ],
      tips: ['Se a imagem não aparecer, o sistema volta ao logo padrão automaticamente.'],
    },
  },
  {
    match: (p) => p.startsWith('/admin/access-templates'),
    topic: {
      title: 'Templates de acesso',
      intro: 'Defina quais módulos cada perfil pode ver, com exceções por usuário.',
      steps: [
        'Crie ou edite um template (ex.: Financeiro, Jurídico).',
        'Marque os módulos liberados.',
        'Vincule o template a um perfil ou aplique uma exceção pontual a um usuário.',
      ],
    },
  },
  {
    match: (p) => p.startsWith('/admin/policies'),
    topic: {
      title: 'Políticas de documentos',
      intro: 'Regras automáticas de visualização, download e compartilhamento.',
      steps: [
        'Escolha o escopo (pasta, categoria, departamento ou perfil).',
        'Configure as regras de leitura, download e compartilhamento externo.',
        'Salve — o motor aplica as regras a todos os documentos no escopo.',
        'Aprove ou recuse exceções na aba de pendências.',
      ],
    },
  },
  {
    match: (p) => p.startsWith('/admin/super-admin'),
    topic: {
      title: 'Painel Super Admin',
      intro: 'Central de controle geral da plataforma.',
      steps: [
        'Acesse os atalhos para marca, permissões, políticas e usuários.',
        'Acompanhe o status geral dos módulos.',
      ],
    },
  },
];

const FALLBACK: HelpTopic = {
  title: 'Como usar esta tela',
  intro: 'Este módulo ainda está em evolução dentro do Premiatto Connect.',
  steps: [
    'Use o menu lateral para navegar entre os módulos.',
    'O ícone de sino mostra notificações e pendências.',
    'Em caso de dúvida, fale com o administrador da plataforma.',
  ],
};

export function HelpButton() {
  const { pathname, search } = useLocation();
  const [open, setOpen] = useState(false);

  const topic = useMemo(
    () => HELP.find((h) => h.match(pathname, search))?.topic ?? FALLBACK,
    [pathname, search],
  );

  useEffect(() => setOpen(false), [pathname, search]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Como usar esta tela"
        aria-label="Ajuda: como usar esta tela"
        className="h-9 w-9 shrink-0 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto bg-background border border-border rounded-t-2xl sm:rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-9 w-9 rounded-xl gradient-brand text-primary-foreground flex items-center justify-center shrink-0">
                  <HelpCircle className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold font-display truncate">{topic.title}</h2>
                  <p className="text-[11px] text-muted-foreground">Como usar esta tela</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-muted shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">{topic.intro}</p>

            <ol className="space-y-2">
              {topic.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-muted text-[11px] font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>

            {topic.tips?.length ? (
              <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Dicas
                </div>
                {topic.tips.map((t, i) => (
                  <p key={i} className="text-[13px] text-muted-foreground">• {t}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
