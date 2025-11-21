# 📘 README - Projeto Qolop

## 📌 Requisitos

Antes de começar, verifique se você tem instalado no seu computador:



- [Node.js (>=18.x)](https://nodejs.org/en/)
- [npm](https://www.npmjs.com/) (vem junto com o Node.js) ou [yarn](https://yarnpkg.com/)
- [MySQL (>=8.x)](https://dev.mysql.com/downloads/mysql/)
- # [Prisma CLI](https://www.prisma.io/docs/concepts/components/prisma-cli) – será instalado junto com `npm install`

* [Node.js (>=18.x)](https://nodejs.org/en/)
* [npm](https://www.npmjs.com/) (vem junto com o Node.js) ou [yarn](https://yarnpkg.com/)
* [MySQL (>=8.x)](https://dev.mysql.com/downloads/mysql/)
* [Prisma CLI](https://www.prisma.io/docs/concepts/components/prisma-cli) – será instalado junto com `npm install`
  14b35af2b698fc4e9ab6443fc43b7eb5347278fc

---

## ⚙️ 1. Configuração do Banco de Dados

1. Crie o banco no MySQL:

```sql
CREATE DATABASE qolop;
```

2. Depois, configure a conexão no arquivo **`.env`** dentro da pasta `backend/`:

```env
DATABASE_URL="mysql://usuario:senha@localhost:3306/qolop"
JWT_SECRET="sua_chave_secreta_super_segura"
```

> Substitua `usuario` e `senha` pelos dados do seu MySQL.

---

## ⚙️ 2. Backend (API)

1. Acesse a pasta:

```bash
cd backend
```

2. Instale as dependências:

```bash
npm install
```

3. Gere o Prisma Client e rode as migrations:

```bash
npx prisma migrate dev --name init_schema
```

4. Inicie o servidor:

```bash
npm run dev
```

✅ O backend rodará em:
👉 `http://localhost:3000`

---

## ⚙️ 3. Frontend (React)

1. Vá para a pasta:

```bash
cd frontend
```

2. Instale as dependências:

```bash
npm install
```

3. Inicie o projeto:

```bash
npm run dev
```

✅ O frontend estará disponível em:
👉 `http://localhost:5173` (ou na porta que o Vite indicar)

---

## 🚀 Fluxo de Uso (via Postman ou pelo Frontend)

### 1. Criar usuário comum

```json
POST http://localhost:3000/usuarios
{
  "nome": "João",
  "email": "joao@email.com",
  "senha": "123456",
  "role": "user"
}
```

### 2. Criar usuário admin

```json
POST http://localhost:3000/usuarios
{
  "nome": "Admin",
  "email": "admin@email.com",
  "senha": "123456",
  "role": "admin"
}
```

### 3. Fazer login

```json
POST http://localhost:3000/login
{
  "email": "admin@email.com",
  "senha": "123456"
}
```

🔑 A resposta trará o `token`, que deve ser usado no **Authorization** como _Bearer Token_.

🔑 A resposta trará o `token`, que deve ser usado no **Authorization** como _Bearer Token_.

---

### 4. Rotas de Pedidos

- Criar pedido: `POST /pedidos`
- Listar pedidos: `GET /pedidos` (auth)
- Atualizar pedido (admin): `PUT /pedidos/:id`
- Deletar pedido (admin): `DELETE /pedidos/:id`

### 5. Rotas de Ambientes

- Criar ambiente (admin): `POST /ambientes`
- Listar ambientes: `GET /ambientes`
- Atualizar ambiente (admin): `PUT /ambientes/:id`
- Deletar ambiente (admin): `DELETE /ambientes/:id`

---

## 📂 Estrutura de Pastas

```
qolop/
│── backend/          # API Node.js + Express + Prisma
│   ├── src/server.ts
│   ├── prisma/schema.prisma
│   ├── package.json
│   └── .env
│
│── frontend/         # React + Vite + TypeScript
│   ├── src/pages/
│   ├── src/services/api.ts
│   ├── src/App.tsx
│   └── package.json
```

---

## ✅ Passo a passo para rodar em outro computador

1. Instalar Node.js e MySQL
2. Clonar o projeto
3. Configurar o `.env` no backend
4. Rodar `npm install` no backend e frontend
5. Rodar `npx prisma migrate dev` no backend
6. Iniciar o backend (`npm run dev`)
7. Iniciar o frontend (`npm run dev`)

---

## 💡 Sobre o Projeto

O **Qolop** foi desenvolvido com foco em aprendizado e boas práticas, unindo **Node.js, Prisma, React e TypeScript** em uma estrutura completa de front e backend.
A ideia é oferecer uma base sólida para projetos modernos, com autenticação, painel administrativo e um visual limpo e agradável.

---

## ✨ Autor

**Desenvolvido por [Vinícius Fernandes](https://github.com/vinicius77777)**
💻 Projeto criado com dedicação e atenção aos detalhes.

---

=======



---

## 💡 Sobre o Projeto

O **Qolop** foi desenvolvido com foco em aprendizado e boas práticas, unindo **Node.js, Prisma, React e TypeScript** em uma estrutura completa de front e backend.
A ideia é oferecer uma base sólida para projetos modernos, com autenticação, painel administrativo e um visual limpo e agradável.

---

## ✨ Autor

**Desenvolvido por [Vinícius Fernandes](https://github.com/vinicius77777)**
💻 Projeto criado com dedicação e atenção aos detalhes.

---

