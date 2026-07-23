# Plano — Migração para arquitetura self-hosted

## Objetivo
Sair de Supabase/TanStack Start e entregar um repositório pronto para push no GitHub e deploy no Easypanel, com **backend NestJS+Prisma+JWT** e **frontend Vite+React SPA** separados, PostgreSQL em Docker, sem login Google, e com admin de **Branding** (cores + logos) integrado ao RBAC.

## Arquitetura final

```text
premiatto-connect/
├── backend/                  NestJS + Prisma + JWT
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── auth/             login, refresh, bcrypt, JwtStrategy, RolesGuard
│   │   ├── users/            CRUD + roles
│   │   ├── documents/        upload (disco local /data/uploads), versões, ciência
│   │   ├── folders/ categories/ shares/ audit/
│   │   ├── branding/         GET público + PUT admin (cores, logos)
│   │   └── uploads/          Multer + servir estáticos protegidos
│   ├── Dockerfile
│   └── .env.example
├── frontend/                 Vite + React SPA
│   ├── src/
│   │   ├── lib/api.ts        axios com interceptor JWT + refresh
│   │   ├── hooks/            useAuth, useBranding, useCurrentUser
│   │   ├── pages/            auth, dashboard, documents, users, audit, admin/branding, admin/roles
│   │   └── routes/           TanStack Router client-only (sem SSR)
│   ├── Dockerfile            build → nginx
│   └── .env.example          VITE_API_URL
├── docker-compose.yml        postgres + backend + frontend (para dev local)
├── easypanel.md              guia de deploy passo a passo
└── README.md
```

## Backend (NestJS)

**Módulos**
- `AuthModule`: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`. Bcrypt para senha; access token 15min + refresh token 7d (httpOnly cookie ou body — configurável).
- `UsersModule`: listar, criar (admin), atualizar perfil, atribuir/remover roles.
- `RolesGuard` + decorator `@Roles('admin','super_admin')` — RBAC igual aos 6 perfis atuais (super_admin, admin, gestor, colaborador, correspondente, franqueado).
- `DocumentsModule`: upload multer para `/data/uploads/<uuid>`, versões, download com log, marcar oficial, exigir ciência, endpoint público com token para links externos.
- `BrandingModule`: tabela `branding` singleton (`primary_color`, `accent_color`, `logo_url`, `logo_dark_url`, `favicon_url`, `app_name`). `GET /branding` público (sem auth) — frontend consome no boot. `PUT /branding` só super_admin/admin.
- `AuditModule`: registra ações; endpoint só admin.
- Servir estáticos: `/uploads/*` só autenticado; `/branding/assets/*` público.

**Prisma schema** (modelos): `User`, `UserRole`, `Company`, `Department`, `Category`, `Folder`, `Document`, `DocumentVersion`, `DocumentShare`, `DocumentPublicLink`, `DocumentAcknowledgement`, `DocumentFavorite`, `AuditLog`, `Branding`. Enum `AppRole`. Sem RLS (autorização em código via guards).

**Seed**: cria super_admin padrão (email/senha via env) + registro Branding com cor azul Premiatto.

## Frontend (Vite SPA)

- Reaproveita todo o design system atual (`styles.css`, componentes, sidebar, telas).
- Remove tudo de Supabase (`src/integrations/supabase/*`, `lovable`), TanStack Start server functions, `src/start.ts`, `src/server.ts`, `_authenticated` server guards.
- Router client-only (TanStack Router file-based ou React Router — mantém TanStack pra não retrabalhar telas).
- `lib/api.ts` axios: baseURL `VITE_API_URL`, interceptor injeta access token, refresh automático no 401.
- `AuthContext` com token em memória + refresh em httpOnly cookie.
- `BrandingProvider` no root: busca `/branding` no boot, aplica `--primary`, `--accent` em `document.documentElement.style`, troca logo/favicon dinamicamente.
- Página `/admin/branding` (só admin): color pickers + upload de logo/favicon + preview ao vivo.
- Página `/admin/users` já existe — adicionar edição de roles (checkboxes de AppRole).
- Remover botão "Continuar com Google" da tela de auth; deixar só email/senha + link "Esqueci minha senha" (stub inicial).

## Docker & Easypanel

- `backend/Dockerfile`: multi-stage node:20-alpine → `prisma migrate deploy` no start → `node dist/main.js` na porta 3000.
- `frontend/Dockerfile`: build Vite → `nginx:alpine` servindo `dist/` + fallback SPA.
- `docker-compose.yml` para dev local: `postgres:16`, `backend`, `frontend`, volumes para `pgdata` e `uploads`.
- `easypanel.md`: instruções — criar app Postgres, criar 2 apps (backend + frontend) apontando pro repo, variáveis de ambiente (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `UPLOADS_DIR`, `SUPER_ADMIN_EMAIL/PASSWORD`), volume persistente para `/data/uploads`.

## Ordem de execução

1. Criar estrutura `backend/` com NestJS + Prisma + schema completo + módulos Auth/Users/Branding/Documents/Audit + seed + Dockerfile.
2. Mover frontend atual para `frontend/`, remover integrações Supabase/TanStack Start, adicionar `api.ts`, `AuthContext`, `BrandingProvider`, página de admin de branding, ajustar telas para consumir REST.
3. Escrever `docker-compose.yml`, Dockerfiles, `.env.example`, `README.md`, `easypanel.md`.
4. Remover integrações Lovable Cloud/Supabase do projeto (arquivos gerados, `.env` Supabase).

## Notas

- Dados atuais no Supabase serão descartados (você escolheu "começar zero com Prisma"). O seed vai criar o super_admin inicial.
- Uploads em disco local no volume `/data/uploads` do Easypanel — simples e sem custo de S3. Podemos trocar por S3/MinIO depois se quiser.
- Refresh token: vou usar httpOnly cookie por padrão (mais seguro que localStorage). Requer CORS com `credentials: true` e domínios configurados via env.
- Confirma o esquema de auth (email+senha JWT) ou prefere magic link por email SMTP?
