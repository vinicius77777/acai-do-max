import express, { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// =========================================
// ROTA INICIAL
// =========================================
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "API de Estoque e Pedidos rodando 🚀" });
});

// =========================================
// ROTAS DE ESTOQUE
// =========================================

// Criar novo item ou somar ao existente
app.post("/estoque", async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const descricao = String(data.descricao || "").trim();
    const quantidadeEntrada = Number(data.quant_entrada) || 0;
    const valorTotalEntrada = Number(data.valor_total_entrada) || 0;

    const valorUnitario =
      quantidadeEntrada > 0 ? valorTotalEntrada / quantidadeEntrada : 0;

    const itemExistente = await prisma.estoque_registro.findFirst({
      where: { descricao },
    });

    if (itemExistente) {
      const novaQuantidade =
        (itemExistente.estoque_quantidade || 0) + quantidadeEntrada;
      const novoValorTotal =
        valorTotalEntrada ||
        Number(itemExistente.valor_total_entrada || 0);

      const atualizado = await prisma.estoque_registro.update({
        where: { codigoItem: itemExistente.codigoItem },
        data: {
          quant_entrada:
            (itemExistente.quant_entrada || 0) + quantidadeEntrada,
          estoque_quantidade: novaQuantidade,
          valor_total_entrada: new Prisma.Decimal(novoValorTotal),
          estoque_valor_unitario: new Prisma.Decimal(valorUnitario),
          valor_venda: data.valor_venda
            ? new Prisma.Decimal(Number(data.valor_venda))
            : itemExistente.valor_venda,
        },
      });

      return res.json({
        message: "Item já existia — estoque somado com sucesso.",
        item: atualizado,
      });
    } else {
      const novoItem = await prisma.estoque_registro.create({
        data: {
          descricao,
          mes_entrada: data.mes_entrada || null,
          dia_entrada: data.dia_entrada ? Number(data.dia_entrada) : null,
          quant_entrada: quantidadeEntrada,
          unidade_entrada: data.unidade_entrada || null,
          nota_fiscal: data.nota_fiscal || null,
          fornecedor: data.fornecedor || null,
          valor_total_entrada: new Prisma.Decimal(valorTotalEntrada),
          data_vencimento: data.data_vencimento || null,
          estoque_quantidade: quantidadeEntrada,
          estoque_unidade:
            data.estoque_unidade || data.unidade_entrada || null,
          estoque_valor_unitario: new Prisma.Decimal(valorUnitario),
          valor_venda: data.valor_venda
            ? new Prisma.Decimal(Number(data.valor_venda))
            : null,
        },
      });

      return res.status(201).json({
        message: "Novo item criado com sucesso.",
        item: novoItem,
      });
    }
  } catch (error) {
    console.error("❌ Erro ao criar/somar item:", error);
    return res
      .status(500)
      .json({ error: "Erro ao criar ou atualizar estoque." });
  }
});

// Listar todos os itens
app.get("/estoque", async (_req: Request, res: Response) => {
  try {
    const itens = await prisma.estoque_registro.findMany();
    return res.json(itens);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar estoque." });
  }
});

// =========================================
// ATUALIZAR ITEM
// =========================================
app.put("/estoque/:codigoItem", async (req: Request, res: Response) => {
  const codigoItem = parseInt(req.params.codigoItem, 10);
  const data = req.body;

  try {
    const itemAtual = await prisma.estoque_registro.findUnique({
      where: { codigoItem },
    });

    if (!itemAtual) {
      return res.status(404).json({ error: "Item não encontrado." });
    }

    const {
      descricao,
      fornecedor,
      quant_entrada,
      valor_total_entrada,
      estoque_quantidade,
      valor_venda,
    } = data;

    const novoQuantEntrada =
      typeof quant_entrada !== "undefined"
        ? Number(quant_entrada)
        : Number(itemAtual.quant_entrada || 0);

    const novoValorTotalEntrada =
      typeof valor_total_entrada !== "undefined"
        ? Number(valor_total_entrada)
        : Number(itemAtual.valor_total_entrada || 0);

    let novoValorUnitario: Prisma.Decimal | null = null;

    if (novoQuantEntrada > 0) {
      novoValorUnitario = new Prisma.Decimal(
        novoValorTotalEntrada / novoQuantEntrada
      );
    } else {
      novoValorUnitario = itemAtual.estoque_valor_unitario ?? null;
    }

    const atualizado = await prisma.estoque_registro.update({
      where: { codigoItem },
      data: {
        descricao: descricao ? String(descricao).trim() : undefined,
        fornecedor: fornecedor ?? undefined,
        quant_entrada:
          typeof quant_entrada !== "undefined"
            ? novoQuantEntrada
            : undefined,
        valor_total_entrada:
          typeof valor_total_entrada !== "undefined"
            ? new Prisma.Decimal(novoValorTotalEntrada)
            : undefined,
        estoque_quantidade:
          typeof estoque_quantidade !== "undefined"
            ? Number(estoque_quantidade)
            : undefined,
        estoque_valor_unitario:
          novoValorUnitario !== null ? novoValorUnitario : undefined,
        valor_venda:
          typeof valor_venda !== "undefined"
            ? new Prisma.Decimal(Number(valor_venda))
            : undefined,
      },
    });

    return res.json(atualizado);
  } catch (error) {
    console.error("❌ Erro ao atualizar:", error);
    return res.status(500).json({ error: "Erro ao atualizar item." });
  }
});

// Deletar item
app.delete("/estoque/:codigoItem", async (req: Request, res: Response) => {
  const codigoItem = parseInt(req.params.codigoItem, 10);
  try {
    await prisma.estoque_registro.delete({ where: { codigoItem } });
    return res.json({ message: "Item removido com sucesso." });
  } catch (error) {
    console.error("❌ Erro ao deletar:", error);
    return res.status(500).json({ error: "Erro ao deletar item." });
  }
});

// =========================================
// ROTAS DE PEDIDOS
// =========================================

// Criar pedido (ALTERAÇÃO AQUI ⬇)
app.post("/pedidos", async (req: Request, res: Response) => {
  try {
    const {
      descricao,
      quant_saida,
      responsavel,
      saida_loja,
      localidade
    } = req.body;

    // ============================
    // AUTOMÁTICO AQUI ✔
    // ============================
    const agora = new Date();
    const dia_saida = Number(String(agora.getDate()).padStart(2, "0"));
    const mes_saida = String(agora.getMonth() + 1).padStart(2, "0");
    // ============================

    const descricaoTrim = String(descricao || "").trim();
    const quantidadeSaida = Number(quant_saida);

    const item = await prisma.estoque_registro.findFirst({
      where: { descricao: descricaoTrim },
    });

    if (!item) {
      return res.status(400).json({
        error: `Produto "${descricaoTrim}" não encontrado no estoque.`,
      });
    }

    const estoqueAtual = item.estoque_quantidade ?? 0;
    if (estoqueAtual < quantidadeSaida) {
      return res.status(400).json({
        error: `Estoque insuficiente. Restam apenas ${estoqueAtual} unidades.`,
      });
    }

    const valorUnitarioVenda = Number(item.valor_venda || 0);
    const valorUnitarioCusto = Number(item.estoque_valor_unitario || 0);
    const lucroUnitario = valorUnitarioVenda - valorUnitarioCusto;
    const lucroTotal = lucroUnitario * quantidadeSaida;
    const margem =
      valorUnitarioVenda > 0
        ? ((lucroUnitario / valorUnitarioVenda) * 100).toFixed(2) + "%"
        : "0%";
    const valorTotalSaida = valorUnitarioVenda * quantidadeSaida;

    const resultado = await prisma.$transaction(async (tx) => {
      const estoqueAtualizado = await tx.estoque_registro.update({
        where: { codigoItem: item.codigoItem },
        data: { estoque_quantidade: estoqueAtual - quantidadeSaida },
      });

      const novoPedido = await tx.pedidos_registro.create({
        data: {
          estoqueId: item.codigoItem,
          descricao: descricaoTrim,
          quant_saida: quantidadeSaida,
          responsavel: responsavel || "Não informado",
          saida_loja: saida_loja || null,
          localidade: localidade || null,
          mes_saida,
          dia_saida,
          valor_unitario_venda: new Prisma.Decimal(valorUnitarioVenda),
          valor_total_saida: new Prisma.Decimal(valorTotalSaida),
          lucratividade_unitario: new Prisma.Decimal(lucroUnitario),
          lucratividade_total: new Prisma.Decimal(lucroTotal),
          margem_aplicada: margem,
        },
      });

      return { estoqueAtualizado, novoPedido };
    });

    return res.json({
      message: "Pedido criado e estoque abatido com sucesso.",
      ...resultado,
    });
  } catch (error) {
    console.error("❌ Erro ao criar pedido:", error);
    return res.status(500).json({ error: "Erro ao criar pedido." });
  }
});

// Listar pedidos
app.get("/pedidos", async (_req: Request, res: Response) => {
  try {
    const pedidos = await prisma.pedidos_registro.findMany();
    return res.json(pedidos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar pedidos." });
  }
});

// =========================================
// EDITAR PEDIDO
// =========================================
app.put("/pedidos/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  try {
    const pedidoExistente = await prisma.pedidos_registro.findUnique({
      where: { id },
    });

    if (!pedidoExistente) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    const estoqueItem = await prisma.estoque_registro.findUnique({
      where: { codigoItem: pedidoExistente.estoqueId ?? undefined },
    });

    if (!estoqueItem) {
      return res.status(404).json({ error: "Item do estoque não encontrado." });
    }

    const valorUnitarioVenda =
      Number(req.body.valor_unitario_venda || pedidoExistente.valor_unitario_venda || 0);
    const quantSaida = Number(req.body.quant_saida || pedidoExistente.quant_saida || 0);
    const valorUnitarioCusto = Number(estoqueItem.estoque_valor_unitario || 0);
    const lucroUnitario = valorUnitarioVenda - valorUnitarioCusto;
    const lucroTotal = lucroUnitario * quantSaida;
    const margem =
      valorUnitarioVenda > 0
        ? ((lucroUnitario / valorUnitarioVenda) * 100).toFixed(2) + "%"
        : "0%";

    const atualizado = await prisma.pedidos_registro.update({
      where: { id },
      data: {
        descricao: req.body.descricao,
        quant_saida: quantSaida,
        responsavel: req.body.responsavel,
        localidade: req.body.localidade,
        mes_saida: req.body.mes_saida || pedidoExistente.mes_saida,
        dia_saida: req.body.dia_saida
          ? Number(req.body.dia_saida)
          : pedidoExistente.dia_saida,
        valor_unitario_venda: new Prisma.Decimal(valorUnitarioVenda),
        valor_total_saida: new Prisma.Decimal(valorUnitarioVenda * quantSaida),
        lucratividade_unitario: new Prisma.Decimal(lucroUnitario),
        lucratividade_total: new Prisma.Decimal(lucroTotal),
        margem_aplicada: margem,
      },
    });

    return res.json(atualizado);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao editar pedido." });
  }
});

// =========================================
// EXCLUIR PEDIDO (restaura estoque)
// =========================================
app.delete("/pedidos/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  try {
    const pedido = await prisma.pedidos_registro.findUnique({
      where: { id },
    });

    if (!pedido) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    const item = await prisma.estoque_registro.findUnique({
      where: { codigoItem: pedido.estoqueId ?? undefined },
    });

    if (!item) {
      return res.status(404).json({ error: "Item do estoque não encontrado." });
    }

    await prisma.estoque_registro.update({
      where: { codigoItem: item.codigoItem },
      data: {
        estoque_quantidade:
          (item.estoque_quantidade || 0) + (pedido.quant_saida || 0),
      },
    });

    await prisma.pedidos_registro.delete({
      where: { id },
    });

    return res.json({
      message: "Pedido excluído e estoque restaurado com sucesso.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao excluir pedido." });
  }
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
