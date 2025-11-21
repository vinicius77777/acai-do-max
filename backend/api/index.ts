import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// =======================
// ROTAS DE ESTOQUE
// =======================

// Listar todos os registros de estoque
app.get('/estoque', async (req, res) => {
  try {
    const registros = await prisma.estoque_registro.findMany();
    res.json(registros);
  } catch (error) {
    console.error('Erro ao listar estoque:', error);
    res.status(500).json({ error: 'Erro ao listar estoque.', details: String(error) });
  }
});

// Criar novo item de estoque
app.post('/estoque', async (req, res) => {
  try {
    const data = req.body;
    const novoRegistro = await prisma.estoque_registro.create({ data });
    res.json(novoRegistro);
  } catch (error) {
    console.error('Erro ao criar item de estoque:', error);
    res.status(500).json({ error: 'Erro ao criar item de estoque.', details: String(error) });
  }
});

// Atualizar item de estoque
app.put('/estoque/:codigoItem', async (req, res) => {
  try {
    const { codigoItem } = req.params;
    const data = req.body;
    const registroAtualizado = await prisma.estoque_registro.update({
      where: { codigoItem },
      data,
    });
    res.json(registroAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar item de estoque:', error);
    res.status(500).json({ error: 'Erro ao atualizar item de estoque.', details: String(error) });
  }
});

// Deletar item de estoque
app.delete('/estoque/:codigoItem', async (req, res) => {
  try {
    const { codigoItem } = req.params;
    await prisma.estoque_registro.delete({
      where: { codigoItem },
    });
    res.json({ message: 'Item deletado com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar item de estoque:', error);
    res.status(500).json({ error: 'Erro ao deletar item de estoque.', details: String(error) });
  }
});

// =======================
// ROTAS DE PEDIDOS
// =======================

// Listar pedidos
app.get('/pedidos', async (req, res) => {
  try {
    const pedidos = await prisma.pedidos_registro.findMany();
    res.json(pedidos);
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({ error: 'Erro ao listar pedidos.', details: String(error) });
  }
});

// Criar novo pedido
app.post('/pedidos', async (req, res) => {
  try {
    const data = req.body;
    const novoPedido = await prisma.pedidos_registro.create({ data });
    res.json(novoPedido);
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ error: 'Erro ao criar pedido.', details: String(error) });
  }
});

// Deletar pedido
app.delete('/pedidos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.pedidos_registro.delete({
      where: { id: Number(id) },
    });
    res.json({ message: 'Pedido deletado com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar pedido:', error);
    res.status(500).json({ error: 'Erro ao deletar pedido.', details: String(error) });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
