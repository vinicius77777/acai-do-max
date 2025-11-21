import { useState, useEffect } from "react";
import api from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import "../styles/pedidosList.css";

interface Pedido {
  id: number;
  descricao: string;
  quant_saida?: number;
  responsavel?: string;
  localidade?: string;
  valor_unitario_venda?: number;
  valor_total_saida?: number;
}

interface EstoqueItem {
  codigoItem: number;
  descricao: string;
  estoque_quantidade?: number;
  valor_venda?: number;
}

export default function PedidosList() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  const [formData, setFormData] = useState<Partial<Pedido>>({});
  const [showModal, setShowModal] = useState(false);
  const [filtroEstoque, setFiltroEstoque] = useState<EstoqueItem[]>([]);
  const [filtro, setFiltro] = useState("");
  const [ordemDescAsc, setOrdemDescAsc] = useState(true);
  const [ordemRespAsc, setOrdemRespAsc] = useState(true);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    carregarPedidos();
    carregarEstoque();
  }, []);

  async function carregarPedidos() {
    const res = await api.get("/pedidos");
    setPedidos(res.data);
  }

  async function carregarEstoque() {
    const res = await api.get("/estoque");
    setEstoque(res.data);
  }

  const formatarValor = (valor?: string | number) => {
    const numero = parseFloat(String(valor || "0"));
    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  async function criarPedido() {
    try {
      const payload = {
        ...formData,
        quant_saida: Number(formData.quant_saida) || 0,
        valor_unitario_venda: Number(formData.valor_unitario_venda) || 0,
        valor_total_saida:
          (formData.quant_saida || 0) *
          (formData.valor_unitario_venda || 0),
      };

      await api.post("/pedidos", payload);
      await carregarPedidos();
      await carregarEstoque();
      setShowModal(false);
      setFormData({});
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao criar pedido.");
    }
  }

  async function editarPedido() {
    try {
      const payload = {
        ...formData,
        quant_saida: Number(formData.quant_saida),
        valor_unitario_venda: Number(formData.valor_unitario_venda),
        valor_total_saida:
          Number(formData.quant_saida) *
          Number(formData.valor_unitario_venda),
      };

      await api.put(`/pedidos/${formData.id}`, payload);
      await carregarPedidos();
      setShowModal(false);
      setEditando(false);
      setFormData({});
    } catch (error) {
      alert("Erro ao editar pedido.");
    }
  }

  // ----------------------------
  // FILTRO POR DESCRIÇÃO OU RESPONSÁVEL
  // ----------------------------
  const pedidosFiltrados = pedidos.filter(
    (p) =>
      p.descricao.toLowerCase().includes(filtro.toLowerCase()) ||
      (p.responsavel?.toLowerCase().includes(filtro.toLowerCase()) ?? false)
  );

  // ----------------------------
  // ORDENAR POR DESCRIÇÃO
  // ----------------------------
  const ordenarPorDescricao = () => {
    const novaOrdem = !ordemDescAsc;
    setOrdemDescAsc(novaOrdem);
    setPedidos([
      ...pedidos.sort((a, b) => {
        const A = a.descricao.toLowerCase();
        const B = b.descricao.toLowerCase();
        if (A < B) return novaOrdem ? -1 : 1;
        if (A > B) return novaOrdem ? 1 : -1;
        return 0;
      }),
    ]);
  };

  // ----------------------------
  // ORDENAR POR RESPONSÁVEL
  // ----------------------------
  const ordenarPorResponsavel = () => {
    const novaOrdem = !ordemRespAsc;
    setOrdemRespAsc(novaOrdem);
    setPedidos([
      ...pedidos.sort((a, b) => {
        const A = (a.responsavel || "").toLowerCase();
        const B = (b.responsavel || "").toLowerCase();
        if (A < B) return novaOrdem ? -1 : 1;
        if (A > B) return novaOrdem ? 1 : -1;
        return 0;
      }),
    ]);
  };

  // ----------------------------
  // BUSCA SUGESTÕES DO ESTOQUE
  // ----------------------------
  useEffect(() => {
    if (formData.descricao && formData.descricao.trim() !== "") {
      const termo = formData.descricao.toLowerCase();
      const filtrados = estoque.filter((e) =>
        e.descricao.toLowerCase().includes(termo)
      );
      setFiltroEstoque(filtrados);
    } else {
      setFiltroEstoque([]);
    }
  }, [formData.descricao, estoque]);

  function escolherItem(item: EstoqueItem) {
  setFormData((prev) => ({
    ...prev,
    descricao: item.descricao,
    valor_unitario_venda:
      prev.valor_unitario_venda && prev.valor_unitario_venda > 0
        ? prev.valor_unitario_venda
        : item.valor_venda,
  }));
  setFiltroEstoque([]);
}

  const valorTotal =
    (formData.quant_saida || 0) *
    (formData.valor_unitario_venda || 0);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      valor_total_saida: valorTotal,
    }));
  }, [formData.quant_saida, formData.valor_unitario_venda]);

  // ----------------------------
  // EXPORTAÇÃO
  // ----------------------------
  const exportarPDF = () => {
  const doc = new jsPDF({
    orientation: "landscape", // <-- PDF mais largo
    unit: "pt",
    format: "A4",
  });

  const titulo = "Pedidos";
  const data = new Date().toLocaleString("pt-BR");

  // TÍTULO
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(titulo, 40, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`${data}`, 40, 60);

  const colunas = [
    { header: "Descrição", dataKey: "descricao" },
    { header: "Quantidade", dataKey: "quant_saida" },
    { header: "Responsável", dataKey: "responsavel" },
    { header: "Localidade", dataKey: "localidade" },
    { header: "Valor Unitário", dataKey: "valor_unitario" },
    { header: "Valor Total", dataKey: "valor_total" },
  ];

  const linhas = pedidosFiltrados.map((p) => ({
    descricao: p.descricao,
    quant_saida: p.quant_saida || "",
    responsavel: p.responsavel || "",
    localidade: p.localidade || "",
    valor_unitario: formatarValor(p.valor_unitario_venda),
    valor_total: formatarValor(p.valor_total_saida),
  }));

  autoTable(doc, {
    startY: 85,
    head: [colunas.map((c) => c.header)],
    body: linhas.map((l) => Object.values(l)),
    theme: "grid",

    // 📌 ESTILO MODERNO
    styles: {
      font: "helvetica",
      fontSize: 11,
      cellPadding: 6,
      valign: "middle",
      textColor: "#000",
      lineColor: "#bfbfbf",
      lineWidth: 0.5,
    },

    // 📌 CABEÇALHO PROFISSIONAL
    headStyles: {
      fillColor: "#2c2c2c",
      textColor: "#fff",
      fontStyle: "bold",
    },

    // 📌 ZEBRADO
    alternateRowStyles: {
      fillColor: "#f5f5f5",
    },

    // 📌 LINHA NORMAL
    bodyStyles: {
      fillColor: "#ffffff",
    },

    tableWidth: "auto",      // <-- usa largura total do PDF
    margin: { left: 40, right: 40 },
  });

  doc.save("relatorio_pedidos.pdf");
};


const exportarXLSX = () => {
  const dados = pedidosFiltrados.map((p) => ({
    Descrição: p.descricao || "",
    Responsável: p.responsavel || "",
    Localidade: p.localidade || "",
    Quantidade: p.quant_saida || "",
    "Valor Unitário": formatarValor(p.valor_unitario_venda),
    "Valor Total": formatarValor(p.valor_total_saida),
  }));

  const wb = XLSX.utils.book_new();

  // Cabeçalho com título e data
  const cabecalho = [
    ["Pedidos"],
    [`${new Date().toLocaleString("pt-BR")}`],
    [],
  ];

  const ws = XLSX.utils.aoa_to_sheet(cabecalho);
  XLSX.utils.sheet_add_json(ws, dados, { origin: -1 });

  // largura das colunas
  const colunas = [
    { wch: 30 }, // Descrição
    { wch: 20 }, // Responsável
    { wch: 15 }, // Localidade
    { wch: 10 }, // Quantidade
    { wch: 15 }, // Valor Unitário
    { wch: 15 }, // Valor Total
  ];
  ws["!cols"] = colunas;

  const totalLinhas = dados.length + cabecalho.length;

  for (let R = 0; R < totalLinhas; R++) {
    for (let C = 0; C < 6; C++) {
      const cell_ref = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cell_ref]) continue;

      const isHeader = R <= 2 || R === 3; // título, data e cabeçalho das colunas
      ws[cell_ref].s = {
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
        font: {
          name: "Arial",
          sz: 11,
          bold: isHeader,
          color: { rgb: isHeader ? "FFFFFF" : "000000" },
        },
        alignment: { vertical: "center", horizontal: "center" },
        fill: isHeader
          ? { fgColor: { rgb: "333333" } }
          : R % 2 === 1
          ? { fgColor: { rgb: "F5F5F5" } }
          : { fgColor: { rgb: "FFFFFF" } },
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Pedidos");

  const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([arrayBuffer], { type: "application/octet-stream" });
  saveAs(blob, "relatorio_pedidos.xlsx");
};



  return (
    <div className="pedidos-container">
      <div className="pedidos-header">
        <h2 className="titulo">Pedidos dos Clientes</h2>

        <div className="botoes-topo">
          <input
            type="text"
            placeholder="Buscar por descrição ou responsável..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="input-busca"
          />

          <button
            className="btn-novo"
            onClick={() => {
              setShowModal(true);
              setEditando(false);
              setFormData({});
            }}
          >
            + Adicionar Pedido
          </button>

          <button className="btn-exportar" onClick={exportarPDF}>
            📄 PDF
          </button>

          <button className="btn-exportar" onClick={exportarXLSX}>
            📊 Excel
          </button>
        </div>
      </div>

      <table className="pedidos-tabela">
        <thead>
          <tr>
            <th onClick={ordenarPorDescricao} className="coluna-clickavel">
              Descrição {ordemDescAsc ? "▲" : "▼"}
            </th>
            <th>Quantidade</th>
            <th onClick={ordenarPorResponsavel} className="coluna-clickavel">
              Responsável {ordemRespAsc ? "▲" : "▼"}
            </th>
            <th>Localidade</th>
            <th>Valor Unitário</th>
            <th>Valor Total</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          {pedidosFiltrados.map((p) => (
            <tr key={p.id}>
              <td>{p.descricao}</td>
              <td>{p.quant_saida}</td>
              <td>{p.responsavel}</td>
              <td>{p.localidade}</td>
              <td>{formatarValor(p.valor_unitario_venda)}</td>
              <td>{formatarValor(p.valor_total_saida)}</td>

              <td className="acoes">
                <button
                  className="btn-editar"
                  onClick={() => {
                    setFormData(p);
                    setEditando(true);
                    setShowModal(true);
                  }}
                >
                  Editar
                </button>

                <button
                  className="btn-excluir"
                  onClick={async () => {
                    if (window.confirm("Deseja excluir este pedido?")) {
                      await api.delete(`/pedidos/${p.id}`);
                      carregarPedidos();
                      carregarEstoque();
                    }
                  }}
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-overlay">
          <div
            className="modal"
            style={{
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <h3>{editando ? "Editar Pedido" : "Novo Pedido"}</h3>

            <input
              placeholder="Descrição"
              value={formData.descricao || ""}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
            />

            {filtroEstoque.length > 0 && (
              <ul className="lista-sugestoes">
                {filtroEstoque.map((item) => (
                  <li
                    key={item.codigoItem}
                    onClick={() => escolherItem(item)}
                    className="item-sugestao"
                  >
                    {item.descricao} — {item.estoque_quantidade ?? 0} unid. —{" "}
                    {formatarValor(item.valor_venda)}
                  </li>
                ))}
              </ul>
            )}

            <input
              type="number"
              placeholder="Quantidade saída"
              value={formData.quant_saida || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quant_saida: Number(e.target.value),
                })
              }
            />

            <input
              type="number"
              placeholder="Valor unitário (R$)"
              value={Number(formData.valor_unitario_venda ?? 0)}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  valor_unitario_venda: Number(e.target.value),
                })
              }
            />

            <input
              placeholder="Responsável"
              value={formData.responsavel || ""}
              onChange={(e) =>
                setFormData({ ...formData, responsavel: e.target.value })
              }
            />

            <input
              placeholder="Localidade"
              value={formData.localidade || ""}
              onChange={(e) =>
                setFormData({ ...formData, localidade: e.target.value })
              }
            />

            <div className="valor-total-preview">
              <strong>Valor Total:</strong> {formatarValor(valorTotal)}
            </div>

            <div className="modal-acoes">
              <button
                className="btn-salvar"
                onClick={editando ? editarPedido : criarPedido}
              >
                {editando ? "Salvar Alterações" : "Salvar"}
              </button>

              <button
                className="btn-cancelar"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
