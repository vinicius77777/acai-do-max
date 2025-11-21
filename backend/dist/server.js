// @ts-nocheck
// ** Arquivo: server.js ou index.js **

import express from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import cors from 'cors';

// Se você precisar de autenticação, precisará reinstalar e configurar:

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"; // Removido pois Auth está desabilitada

app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173", // porta do frontend (Vite)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));


// POST /itens: Cria um novo Item
app.post("/itens", async (req, res) => {
    // Campos necessários: codigoItem, descricao, valorUnitarioCusto, estoqueQuant, estoqueUnidade
    const { codigoItem, descricao, valorUnitarioCusto, estoqueQuant, estoqueUnidade } = req.body;

    if (!descricao || !valorUnitarioCusto || estoqueQuant === undefined || !estoqueUnidade) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    try {
        const novoItem = await prisma.item.create({
            data: {
                codigoItem,
                descricao,
                valorUnitarioCusto: parseFloat(valorUnitarioCusto),
                estoqueQuant: parseInt(estoqueQuant),
                estoqueUnidade,
                // Os campos Decimal? (nullable) e os de lucratividade serão null ou calculados, se a lógica for implementada
                // Se o DB espera um Decimal, assegure que o tipo seja Number/Decimal (o PrismaClient fará a conversão)
            },
        });
        return res.status(201).json(novoItem);
    }
    catch (error) {
        // P1000/P2002 para unique constraint violation (codigoItem)
        return res.status(500).json({ error: "Erro ao criar item.", details: String(error) });
    }
});

// GET /itens: Lista todos os Itens
app.get("/itens", async (_req, res) => {
    try {
        const itens = await prisma.item.findMany({
            // Incluir as movimentacoes, se necessário. Adicionado aqui como exemplo.
            include: {
                saidas: true, 
            },
        });
        return res.json(itens);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao listar itens.", details: String(error) });
    }
});

// GET /itens/:id: Busca um Item por ID
app.get("/itens/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const item = await prisma.item.findUnique({ 
            where: { id },
            include: {
                saidas: true, 
            },
        });
        if (!item) {
            return res.status(404).json({ error: "Item não encontrado." });
        }
        return res.json(item);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao buscar item.", details: String(error) });
    }
});

// PUT /itens/:id: Atualiza um Item
app.put("/itens/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const dados = req.body; // Recebe todos os dados para atualização

    // Converte os campos Decimal/Int que podem vir como string
    if (dados.valorUnitarioCusto !== undefined) dados.valorUnitarioCusto = parseFloat(dados.valorUnitarioCusto);
    if (dados.estoqueQuant !== undefined) dados.estoqueQuant = parseInt(dados.estoqueQuant);
    // Adicione conversão para outros campos Decimais (estoqueValorTotal, etc.) se forem atualizados

    try {
        const atualizado = await prisma.item.update({
            where: { id },
            data: dados,
        });
        return res.json(atualizado);
    }
    catch (error) {
        // P2025: Registro não existe para atualizar
        if (error.code === 'P2025') {
            return res.status(404).json({ error: "Item não encontrado para atualização." });
        }
        return res.status(500).json({ error: "Erro ao atualizar item.", details: String(error) });
    }
});

// DELETE /itens/:id: Deleta um Item
app.delete("/itens/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        await prisma.item.delete({ where: { id } });
        return res.json({ message: "Item removido com sucesso." });
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: "Item não encontrado para exclusão." });
        }
        // P2003: Foreign key constraint violation (se houver Movimentacoes relacionadas)
        if (error.code === 'P2003') {
             return res.status(409).json({ error: "Não é possível excluir: O item possui movimentações registradas." });
        }
        return res.status(500).json({ error: "Erro ao deletar item.", details: String(error) });
    }
});


/** =========================================
 * ROTAS DE MOVIMENTAÇÕES (Model: Movimentacao)
 * =========================================
 */

// POST /movimentacoes: Cria uma nova Movimentação (Saída)
app.post("/movimentacoes", async (req, res) => {
    // Campos necessários: itemId, dataSaida, diaSaida, quantidadeSaida, responsavel, loja, localidade, valorUnitarioVenda, valorTotalVenda, margemAplicada
    const { itemId, dataSaida, diaSaida, quantidadeSaida, responsavel, loja, localidade, valorUnitarioVenda, valorTotalVenda, margemAplicada } = req.body;

    if (!itemId || !dataSaida || diaSaida === undefined || quantidadeSaida === undefined || !responsavel || !loja || !localidade || valorUnitarioVenda === undefined || valorTotalVenda === undefined || margemAplicada === undefined) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    try {
        const novaMovimentacao = await prisma.movimentacao.create({
            data: {
                itemId: parseInt(itemId),
                dataSaida,
                diaSaida: parseInt(diaSaida),
                quantidadeSaida: parseInt(quantidadeSaida),
                responsavel,
                loja,
                localidade,
                valorUnitarioVenda: parseFloat(valorUnitarioVenda),
                valorTotalVenda: parseFloat(valorTotalVenda),
                margemAplicada: parseFloat(margemAplicada),
            },
        });
        return res.status(201).json(novaMovimentacao);
    }
    catch (error) {
        // P2003: Foreign key constraint violation (itemId não existe)
        if (error.code === 'P2003') {
            return res.status(400).json({ error: "O itemId fornecido não corresponde a nenhum item existente." });
        }
        return res.status(500).json({ error: "Erro ao criar movimentação.", details: String(error) });
    }
});

// GET /movimentacoes: Lista todas as Movimentações
app.get("/movimentacoes", async (_req, res) => {
    try {
        const movimentacoes = await prisma.movimentacao.findMany({
            // Incluir os dados do Item relacionado, se necessário.
            include: {
                item: true, 
            },
        });
        return res.json(movimentacoes);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao listar movimentações.", details: String(error) });
    }
});

// GET /movimentacoes/:id: Busca uma Movimentação por ID
app.get("/movimentacoes/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const movimentacao = await prisma.movimentacao.findUnique({ 
            where: { id },
            include: {
                item: true, 
            },
        });
        if (!movimentacao) {
            return res.status(404).json({ error: "Movimentação não encontrada." });
        }
        return res.json(movimentacao);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro ao buscar movimentação.", details: String(error) });
    }
});

// DELETE /movimentacoes/:id: Deleta uma Movimentação
app.delete("/movimentacoes/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        await prisma.movimentacao.delete({ where: { id } });
        return res.json({ message: "Movimentação removida com sucesso." });
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: "Movimentação não encontrada para exclusão." });
        }
        return res.status(500).json({ error: "Erro ao deletar movimentação.", details: String(error) });
    }
});


/** Boot */
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});