# 🍧 Sistema de Estoque e Pedidos — Açaí do Max

Sistema completo para controle de estoque, pedidos, lucro, descontos personalizados e regras de preço, desenvolvido para uso real em loja.

## 🚀 Funcionalidades

- Cadastro e gerenciamento de produtos em estoque
- Entrada de mercadorias com cálculo automático do custo unitário
- Controle de quantidade e validade dos produtos
- Registro de pedidos e saídas de estoque
- Aplicação automática de descontos por cliente e loja
- Regras especiais de preço para casos específicos
- Cálculo automático de lucro unitário, lucro total e margem percentual
- Atualização automática do estoque ao criar, editar ou excluir pedidos
- Sistema permite pedidos mesmo sem estoque disponível

## 🛠️ Tecnologias Utilizadas

Backend: Node.js, Express, TypeScript, Prisma ORM, MySQL, Dotenv, CORS  
Frontend: React, Vite, TypeScript, CSS

## ⚙️ Como rodar o projeto localmente

1. Clonar o repositório  
   git clone https://github.com/seu-usuario/seu-repositorio.git

2. Backend  
   cd backend  
   npm install  
   npx prisma generate  
   npx prisma migrate dev  
   npm run dev

3. Frontend  
   cd frontend  
   npm install  
   npm run dev

## 📌 Observações

Projeto em evolução, desenvolvido para uso real em comércio, com foco em regras de negócio, controle financeiro e organização de dados.

## 👨‍💻 Autor

Vinícius Fernandes
