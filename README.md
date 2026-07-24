# Premiatto Connect

Plataforma de comunicação, documentação, treinamento e gestão do conhecimento da Premiatto.

Arquitetura self-hosted separada — pronta para deploy no **Easypanel** via Docker e GitHub.

```
premiatto-connect/
├── backend/          NestJS + Prisma + PostgreSQL + JWT
├── frontend/         Vite + React 19 + Tailwind v4 + React Router
├── docker-compose.yml
└── easypanel.md      guia de deploy passo a passo
```

## Stack

- **Backend**: NestJS 10, Prisma 5, PostgreSQL 16, JWT (access + refresh httpOnly), bcrypt, Multer.
- **Frontend**: React 19, Vite 6, Tailwind CSS v4, TanStack Query, React Router, Axios, Sonner, Lucide.
- **Deploy**: Docker (multi-stage) + Nginx no frontend.

## Rodar localmente (Docker)

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend:  http://localhost:3000/api
- Postgres: localhost:5432 (usuário `premiatto`, senha `premiatto`)

**Login inicial local**: `admin@premiatto.com.br` / `TroquePorUmaSenhaForte123!` (troque em produção).

## Rodar em desenvolvimento (hot reload)

Em dois terminais:

```bash
# Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev

# Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Funcionalidades

- **Auth**: registro, login, refresh automático, logout — sem Google, apenas e-mail + senha.
- **RBAC**: 6 perfis (`super_admin`, `admin`, `gestor`, `colaborador`, `correspondente`, `franqueado`) com `RolesGuard` no backend e proteção de rotas no frontend.
- **Documentos**: upload, download com auditoria, marcação como oficial, ciência obrigatória, favoritos, versões.
- **Usuários**: admin gerencia usuários e perfis (adicionar/remover roles com um clique).
- **Auditoria**: log de todas ações relevantes; visível para admins.
- **Marca (Branding)**: admin altera nome, tagline, cor primária, cor de destaque, logo, logo escuro e favicon — aplicado em tempo real via CSS variables.

## Deploy no Easypanel

Veja [`easypanel.md`](./easypanel.md).
