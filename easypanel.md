# Deploy no Easypanel

Guia passo a passo para hospedar o **Premiatto Connect** em um VPS com Easypanel.

## 1. Pré-requisitos

- VPS com Easypanel instalado (Ubuntu 22.04+ recomendado).
- Repositório deste projeto no GitHub.
- Domínio apontando para o IP do servidor (ex.: `app.premiatto.com.br`, `api.premiatto.com.br`).

## 2. Criar o serviço PostgreSQL

1. No Easypanel, **+ Service → Postgres**.
2. Nome do serviço: `premiatto-db`.
3. Usuário: `premiatto`, senha forte, database: `premiatto`.
4. Salve. Anote a **Connection URL interna** — algo como:
   `postgresql://premiatto:SENHA@premiatto-db:5432/premiatto?schema=public`

## 3. Criar o app **Backend**

1. **+ Service → App**, nome: `premiatto-backend`.
2. Aba **Source → GitHub**: aponte para o repositório, branch `main`, **Build Path**: `backend`.
3. Aba **Build**: tipo `Dockerfile` (usa `backend/Dockerfile`).
4. Aba **Environment** — no `DATABASE_URL`, cole apenas a URL como valor, sem aspas e sem `DATABASE_URL=`:
   ```
   DATABASE_URL=postgresql://premiatto:SENHA@premiatto-db:5432/premiatto?schema=public
   PORT=3000
   CORS_ORIGIN=https://app.premiatto.com.br
   JWT_SECRET=<gere com: openssl rand -hex 48>
   JWT_ACCESS_TTL=15m
   JWT_REFRESH_TTL=7d
   UPLOADS_DIR=/data/uploads
   SUPER_ADMIN_EMAIL=admin@premiatto.com.br
   SUPER_ADMIN_PASSWORD=<senha forte inicial>
   SUPER_ADMIN_NAME=Administrador
   NODE_ENV=production
   ```
5. Aba **Mounts**: crie volume persistente montado em `/data/uploads`.
6. Aba **Domains**: adicione `api.premiatto.com.br` na porta interna `3000` (SSL automático via Let's Encrypt).
7. **Deploy**. Na primeira execução o container roda `prisma migrate deploy` + seed automaticamente.

## 4. Criar o app **Frontend**

1. **+ Service → App**, nome: `premiatto-frontend`.
2. **Source → GitHub**: mesmo repositório, **Build Path**: `frontend`.
3. **Build**: tipo `Dockerfile` (usa `frontend/Dockerfile`).
4. **Build Args**:
   ```
   VITE_API_URL=https://api.premiatto.com.br/api
   ```
   > Alternativa: manter `VITE_API_URL=/api` e usar o proxy do Nginx (ver passo 5).
5. **Environment**: (nenhuma obrigatória).
6. **Domains**: adicione `app.premiatto.com.br` na porta interna `80` (SSL automático).
7. **Deploy**.

## 5. Opção — Proxy pelo Nginx (mesmo domínio)

Se preferir servir frontend e API sob o mesmo domínio (`app.premiatto.com.br` → `/api` proxy para o backend):

- Ajuste `frontend/nginx.conf` para `proxy_pass http://premiatto-backend:3000/api/;` (o hostname interno é o **nome do serviço** no Easypanel).
- Build arg do frontend fica `VITE_API_URL=/api`.
- Não precisa expor domínio para o backend.

## 6. Primeiro acesso

- Abra `https://app.premiatto.com.br`.
- Entre com `admin@premiatto.com.br` + a senha configurada em `SUPER_ADMIN_PASSWORD`.
- Vá em **Marca** e troque logos/cores.
- Vá em **Usuários** para criar contas dos colaboradores e atribuir perfis.

## 7. Backups

- Easypanel Postgres: ative snapshots agendados no painel do serviço.
- Volume `/data/uploads`: use a rotina de backup do Easypanel para volumes.

## 8. Rotação de segredos

- Para trocar `JWT_SECRET`: atualize no Easypanel e reinicie o app. Todos usuários serão deslogados (esperado).
- Para trocar senha de admin: use a tela `/api/auth/change-password` (autenticado) ou atualize direto no DB.
