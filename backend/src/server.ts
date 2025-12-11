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

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "API de Estoque e Pedidos rodando 🚀" });
});

/* ========================= ESTOQUE ========================= */

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

      // soma total + recalcula unitário REAL
      const novoValorTotal =
        Number(itemExistente.valor_total_entrada || 0) +
        valorTotalEntrada;

      const novoValorUnitario =
        novaQuantidade > 0 ? novoValorTotal / novaQuantidade : 0;

      const atualizado = await prisma.estoque_registro.update({
        where: { codigoItem: itemExistente.codigoItem },
        data: {
          quant_entrada:
            (itemExistente.quant_entrada || 0) + quantidadeEntrada,
          estoque_quantidade: novaQuantidade,

          valor_total_entrada: new Prisma.Decimal(novoValorTotal),
          estoque_valor_unitario: new Prisma.Decimal(novoValorUnitario),

          // agora atualiza nota/fornecedor sempre
          nota_fiscal: data.nota_fiscal || itemExistente.nota_fiscal,
          fornecedor: data.fornecedor || itemExistente.fornecedor,
          data_vencimento: data.data_vencimento || itemExistente.data_vencimento,

          // valor venda mantém antigo se não enviado
          valor_venda: data.valor_venda
            ? new Prisma.Decimal(Number(data.valor_venda))
            : itemExistente.valor_venda,
        },
      });

      return res.json({
        message: "Item existia — estoque somado corretamente.",
        item: atualizado,
      });
    }

    /* ITEM NOVO */
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

  } catch (error) {
    console.error("❌ Erro ao criar/somar item:", error);
    return res
      .status(500)
      .json({ error: "Erro ao criar ou atualizar estoque." });
  }
});


// Listar estoque
app.get("/estoque", async (_req: Request, res: Response) => {
  try {
    const itens = await prisma.estoque_registro.findMany();
    return res.json(itens);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao listar estoque." });
  }
});

// Atualizar item
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

    const novaEntrada = Number(data.quant_entrada || itemAtual.quant_entrada);
    const novaQuantidade =
      (itemAtual.estoque_quantidade || 0) +
      (novaEntrada - (itemAtual.quant_entrada || 0));

    const novoValorTotal =
      Number(data.valor_total_entrada || itemAtual.valor_total_entrada);

    const novoValorUnitario =
      novaQuantidade > 0 ? novoValorTotal / novaQuantidade : 0;

    const atualizado = await prisma.estoque_registro.update({
      where: { codigoItem },
      data: {
        descricao: data.descricao || itemAtual.descricao,
        fornecedor: data.fornecedor || itemAtual.fornecedor,
        nota_fiscal: data.nota_fiscal || itemAtual.nota_fiscal,

        quant_entrada: novaEntrada,
        estoque_quantidade: novaQuantidade,

        valor_total_entrada: new Prisma.Decimal(novoValorTotal),
        estoque_valor_unitario: new Prisma.Decimal(novoValorUnitario),

        valor_venda: data.valor_venda
          ? new Prisma.Decimal(Number(data.valor_venda))
          : itemAtual.valor_venda,
      },
    });

    return res.json(atualizado);
  } catch (error) {
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
    return res.status(500).json({ error: "Erro ao deletar item." });
  }
});


/* ================== PREVISÃO DE PEDIDO (NÃO SALVA) ================== */

app.post("/pedidos/prever", async (req: Request, res: Response) => {
  try {
    const { descricao, quant_saida, responsavel, saida_loja } = req.body;

    const descricaoTrim = String(descricao || "").trim();
    const quantidade = Number(quant_saida || 1);

    const item = await prisma.estoque_registro.findFirst({
      where: { descricao: descricaoTrim },
    });

    let valorUnitarioVenda = item ? Number(item.valor_venda || 0) : 0;
    let valorUnitarioCusto = item ? Number(item.estoque_valor_unitario || 0) : 0;

    // cálculo inicial
    let lucroUnitario = valorUnitarioVenda - valorUnitarioCusto;

   // identificar se precisa aplicar desconto especial
const isDescontoCliente =
  (responsavel === "Rodrigo" && saida_loja === "Barra Açaí") ||
  (responsavel === "Ericsson" && saida_loja === "Açaí da Ponte");

const nomeLower = descricaoTrim.toLowerCase();

// itens que NÃO recebem desconto normal
const isSemDesconto =
  nomeLower.includes("caixa de papelão") ||
  nomeLower.includes("caixa papelão") ||
  nomeLower.includes("caixa papelon");

let descontoAplicado = false;

// 🔥 REGRA ESPECIAL: Rodrigo + Barra Açaí + qualquer item contendo "aça"
if (
  responsavel === "Rodrigo" &&
  saida_loja === "Barra Açaí" &&
  nomeLower.includes("aça")
) {
  valorUnitarioVenda = 122.50;
  descontoAplicado = true;

} else if (item && isDescontoCliente && !isSemDesconto) {
  // ⭐ regra normal de desconto (50% do lucro)
  const metadeLucro = lucroUnitario * 0.5;
  valorUnitarioVenda = valorUnitarioCusto + metadeLucro;
  descontoAplicado = true;
}

// arredondar
valorUnitarioVenda = Number(valorUnitarioVenda.toFixed(2));
const valorTotal = Number((valorUnitarioVenda * quantidade).toFixed(2));

return res.json({
  valor_unitario_venda: valorUnitarioVenda,
  valor_total_saida: valorTotal,
  descontoAplicado,
});
  } catch (error) {
    console.error("❌ Erro ao prever pedido:", error);
    return res.status(500).json({ error: "Erro ao prever pedido." });
  }
});



/* ========================= PEDIDOS ========================= */

// 🔥 ACEITA PEDIDOS MESMO SEM ESTOQUE
app.post("/pedidos", async (req: Request, res: Response) => {
  try {
    const {
      descricao,
      quant_saida,
      responsavel,
      saida_loja,
      localidade
    } = req.body;

    const agora = new Date();
    const dia_saida = agora.getDate();
    const mes_saida = String(agora.getMonth() + 1).padStart(2, "0");

    const descricaoTrim = String(descricao || "").trim();
    const quantidadeSaida = Number(quant_saida);

    // Produto existe no estoque (opcional agora)
    const item = await prisma.estoque_registro.findFirst({
      where: { descricao: descricaoTrim },
    });

    let valorUnitarioVenda = item ? Number(item.valor_venda || 0) : 0;
    let valorUnitarioCusto = item ? Number(item.estoque_valor_unitario || 0) : 0;
    let estoqueId: number | null = item ? item.codigoItem : null;

    // ===== CÁLCULOS INICIAIS =====
    let lucroUnitario = valorUnitarioVenda - valorUnitarioCusto;
    let lucroTotal = lucroUnitario * quantidadeSaida;
    let margem =
      valorUnitarioVenda > 0
        ? ((lucroUnitario / valorUnitarioVenda) * 100).toFixed(2) + "%"
        : "0%";

    let valorTotalSaida = valorUnitarioVenda * quantidadeSaida;

    
    /* ===== DESCONTO ESPECIAL (Rodrigo / Ericsson) ===== */

    const isDescontoCliente =
  (responsavel === "Rodrigo" && saida_loja === "Barra Açaí") ||
  (responsavel === "Ericsson" && saida_loja === "Açaí da Ponte");

const nomeLower = descricaoTrim.toLowerCase();

// Produtos SEM desconto
const isSemDesconto =
  nomeLower.includes("açai") ||
  nomeLower.includes("açaí") ||
  nomeLower.includes("acai") ||
  nomeLower.includes("caixa de papelão") ||
  nomeLower.includes("caixa papelão") ||
  nomeLower.includes("caixa papelon");

// ✅🔥 REGRA ESPECIAL – AÇAÍ DO RODRIGO (Barra Açaí): 122,50 SEMPRE
if (
  responsavel === "Rodrigo" &&
  saida_loja === "Barra Açaí" &&
  nomeLower.includes("aça")
) {
  valorUnitarioVenda = 122.50;

  valorTotalSaida = valorUnitarioVenda * quantidadeSaida;
  lucroUnitario = valorUnitarioVenda - valorUnitarioCusto;
  lucroTotal = lucroUnitario * quantidadeSaida;
  margem =
    valorUnitarioVenda > 0
      ? ((lucroUnitario / valorUnitarioVenda) * 100).toFixed(2) + "%"
      : "0%";

} else if (isSemDesconto && item) {
  // 👇 NÃO APLICA DESCONTO NORMAL (fica preço do banco)
  valorUnitarioVenda = valorUnitarioVenda;

} else if (isDescontoCliente && !isSemDesconto && item) {
  // 👇 APLICA DESCONTO NORMAL
  const metadeLucro = lucroUnitario * 0.5;
  valorUnitarioVenda = valorUnitarioCusto + metadeLucro;

  lucroUnitario = valorUnitarioVenda - valorUnitarioCusto;
  valorTotalSaida = valorUnitarioVenda * quantidadeSaida;
  lucroTotal = lucroUnitario * quantidadeSaida;
  margem =
    valorUnitarioVenda > 0
      ? ((lucroUnitario / valorUnitarioVenda) * 100).toFixed(2) + "%"
      : "0%";
}

// 🔥 Se o front já calculou desconto (via /prever), usa ele
if (req.body.valor_unitario_venda && req.body.valor_unitario_venda > 0) {
  valorUnitarioVenda = Number(req.body.valor_unitario_venda);
}

// Recalcula total final
valorTotalSaida = valorUnitarioVenda * quantidadeSaida;

const novoPedido = await prisma.pedidos_registro.create({
  data: {
    descricao: descricaoTrim,
    quant_saida: quantidadeSaida,
    responsavel,
    saida_loja,
    localidade,
    mes_saida,
    dia_saida,
    valor_unitario_venda: new Prisma.Decimal(Number(valorUnitarioVenda)),
    valor_total_saida: new Prisma.Decimal(Number(valorTotalSaida)),
    lucratividade_unitario: new Prisma.Decimal(Number(lucroUnitario)),
    lucratividade_total: new Prisma.Decimal(Number(lucroTotal)),
    margem_aplicada: margem,
    estoqueId,
  },
});

// 🔥 AGORA SIM: DESCONTAR DO ESTOQUE
if (estoqueId && item) {
  await prisma.estoque_registro.update({
    where: { codigoItem: estoqueId },
    data: {
      estoque_quantidade: Number(item.estoque_quantidade || 0) - quantidadeSaida,
    },
  });
}
return res.status(201).json({
  message: "Pedido criado com sucesso.",
  pedido: novoPedido,
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
    return res.status(500).json({ error: "Erro ao listar pedidos." });
  }
});

app.put("/pedidos/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  try {
    const pedidoExistente = await prisma.pedidos_registro.findUnique({
      where: { id },
    });

    if (!pedidoExistente) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    let valorUnitarioVenda =
      Number(req.body.valor_unitario_venda || pedidoExistente.valor_unitario_venda);
    const quantSaida =
      Number(req.body.quant_saida || pedidoExistente.quant_saida);

    let lucroUnitario = 0;
    let margem = "0%";

    const estoqueItem = pedidoExistente.estoqueId
      ? await prisma.estoque_registro.findUnique({
          where: { codigoItem: pedidoExistente.estoqueId },
        })
      : null;

    if (estoqueItem) {
      const valorUnitarioCusto = Number(estoqueItem.estoque_valor_unitario || 0);
      lucroUnitario = valorUnitarioVenda - valorUnitarioCusto;
      margem =
        valorUnitarioVenda > 0
          ? ((lucroUnitario / valorUnitarioVenda) * 100).toFixed(2) + "%"
          : "0%";
    }

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
        lucratividade_total: new Prisma.Decimal(
          lucroUnitario * quantSaida
        ),
        margem_aplicada: margem,
      },
    });

    return res.json(atualizado);
  } catch (err) {
    return res.status(500).json({ error: "Erro ao editar pedido." });
  }
});

// ❗ DELETE devolve estoque se aplicável
app.delete("/pedidos/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  try {
    const pedido = await prisma.pedidos_registro.findUnique({
      where: { id },
    });

    if (!pedido) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    if (pedido.estoqueId) {
      const item = await prisma.estoque_registro.findUnique({
        where: { codigoItem: pedido.estoqueId },
      });

      if (item) {
        await prisma.estoque_registro.update({
          where: { codigoItem: item.codigoItem },
          data: {
            estoque_quantidade:
              (item.estoque_quantidade || 0) + (pedido.quant_saida || 0),
          },
        });
      }
    }

    await prisma.pedidos_registro.delete({
      where: { id },
    });

    return res.json({
      message: "Pedido excluído (estoque restaurado se aplicável).",
    });
  } catch (err) {
    return res.status(500).json({ error: "Erro ao excluir pedido." });
  }
});

/* ========================= SERVER ========================= */

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
