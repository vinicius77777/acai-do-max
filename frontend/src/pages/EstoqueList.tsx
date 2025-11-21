import { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/estoqueList.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

interface EstoqueItem {
  codigoItem: number;
  descricao?: string;
  mes_entrada?: string;
  dia_entrada?: number;
  quant_entrada?: number;
  unidade_entrada?: string;
  nota_fiscal?: string;
  fornecedor?: string;
  valor_total_entrada?: number | string;
  data_vencimento?: string;
  estoque_quantidade?: number;
  estoque_unidade?: string;
  estoque_valor_unitario?: number | string;
  valor_venda?: number | string;
}

export default function EstoqueList() {
  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  const [editandoItem, setEditandoItem] = useState<EstoqueItem | null>(null);
  const [form, setForm] = useState<Partial<EstoqueItem>>({});
  const [modalAberto, setModalAberto] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [ordemAsc, setOrdemAsc] = useState(true);

  // -------------------------------------------------------
  // BUSCAR ESTOQUE AO INICIAR
  // -------------------------------------------------------
  useEffect(() => {
    buscarEstoque();
  }, []);

  const buscarEstoque = async () => {
    try {
      const response = await api.get("/estoque");
      setEstoque(response.data);
    } catch (error) {
      console.error("Erro ao buscar estoque:", error);
    }
  };

  const excluirItem = async (codigoItem: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este item?")) return;

    try {
      await api.delete(`/estoque/${codigoItem}`);
      buscarEstoque();
    } catch (error) {
      console.error("Erro ao excluir item:", error);
    }
  };

  // -------------------------------------------------------
  // ABRIR MODAL (Editar ou Novo)
  // -------------------------------------------------------
  const abrirModal = (item?: EstoqueItem) => {
    if (item) {
      setEditandoItem(item);
      setForm({ ...item });
    } else {
      setEditandoItem(null);
      setForm({});
    }
    setModalAberto(true);
  };

  const fecharModal = () => {
    setEditandoItem(null);
    setForm({});
    setModalAberto(false);
  };

  // -------------------------------------------------------
  // MANIPULAR FORM
  // -------------------------------------------------------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // -------------------------------------------------------
  // SALVAR (POST OU PUT)
  // -------------------------------------------------------
  const salvar = async () => {
    try {
      if (editandoItem) {
        // atualizar
        const payload: any = { ...form };

        delete payload.estoque_valor_unitario;

        await api.put(`/estoque/${editandoItem.codigoItem}`, payload);
      } else {
        // criar novo
        const hoje = new Date();
        const dia = hoje.getDate();
        const mes = (hoje.getMonth() + 1).toString().padStart(2, "0");

        const payload: any = {
          ...form,
          dia_entrada: dia,
          mes_entrada: mes,
        };

        if (payload.quant_entrada)
          payload.quant_entrada = Number(payload.quant_entrada);
        if (payload.valor_total_entrada)
          payload.valor_total_entrada = Number(payload.valor_total_entrada);
        if (payload.valor_venda)
          payload.valor_venda = Number(payload.valor_venda);

        delete payload.estoque_valor_unitario;

        await api.post("/estoque", payload);
      }

      fecharModal();
      buscarEstoque();
    } catch (error) {
      console.error("Erro ao salvar item:", error);
    }
  };

  // -------------------------------------------------------
  // FILTRO + ORDENAR
  // -------------------------------------------------------
  const itensFiltrados = estoque.filter((item) =>
    item.descricao?.toLowerCase().includes(filtro.toLowerCase())
  );

  const ordenarPorDescricao = () => {
    const novaOrdem = !ordemAsc;
    setOrdemAsc(novaOrdem);
    setEstoque(
      [...estoque].sort((a, b) => {
        const A = a.descricao?.toLowerCase() || "";
        const B = b.descricao?.toLowerCase() || "";
        if (A < B) return novaOrdem ? -1 : 1;
        if (A > B) return novaOrdem ? 1 : -1;
        return 0;
      })
    );
  };

  // -------------------------------------------------------
  // FORMATAÇÕES
  // -------------------------------------------------------
  const formatarValor = (valor?: string | number) => {
    const numero = parseFloat(String(valor || "0"));
    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatarDataEntrada = (item: EstoqueItem) => {
    const dia = item.dia_entrada;
    const mes = item.mes_entrada;
    if (!dia || !mes) return "";
    const ano = new Date().getFullYear();
    return `${String(dia).padStart(2, "0")}/${mes}/${ano}`;
  };

  // -------------------------------------------------------
  // EXPORTAÇÃO PDF / EXCEL
  // -------------------------------------------------------
  const exportarPDF = () => {
  const doc = new jsPDF({
    orientation: "landscape", // PDF mais largo
    unit: "pt",
    format: "A4",
  });

  const titulo = "Estoque";
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
    { header: "Fornecedor", dataKey: "fornecedor" },
    { header: "Nota Fiscal", dataKey: "nota_fiscal" },
    { header: "Entrada", dataKey: "entrada" },
    { header: "Quantidade", dataKey: "quantidade" },
    { header: "Em Estoque", dataKey: "estoque" },
    { header: "Valor Unitário", dataKey: "valor_unitario" },
    { header: "Valor Total", dataKey: "valor_total" },
  ];

  const linhas = itensFiltrados.map((item) => ({
    descricao: item.descricao || "",
    fornecedor: item.fornecedor || "",
    nota_fiscal: item.nota_fiscal || "",
    entrada: formatarDataEntrada(item),
    quantidade: item.quant_entrada || "",
    estoque: item.estoque_quantidade || "",
    valor_unitario: formatarValor(item.estoque_valor_unitario),
    valor_total: formatarValor(item.valor_total_entrada),
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

    tableWidth: "auto", // usa largura total do PDF
    margin: { left: 40, right: 40 },
  });

  doc.save("relatorio_estoque.pdf");
};


const exportarXLSX = () => {
  const dados = itensFiltrados.map((item) => ({
    Descrição: item.descricao || "",
    Fornecedor: item.fornecedor || "",
    "Nota Fiscal": item.nota_fiscal || "",
    "Data Entrada": formatarDataEntrada(item),
    Quantidade: item.quant_entrada || "",
    "Em Estoque": item.estoque_quantidade || "",
    "Valor Unitário": formatarValor(item.estoque_valor_unitario),
    "Valor Total": formatarValor(item.valor_total_entrada),
  }));

  const wb = XLSX.utils.book_new();

  const cabecalho = [
    ["Estoque"],
    [`${new Date().toLocaleString("pt-BR")}`],
    [],
  ];

  const ws = XLSX.utils.aoa_to_sheet(cabecalho);
  XLSX.utils.sheet_add_json(ws, dados, { origin: -1 });

  const colunas = [
    { wch: 30 },
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
  ];
  ws["!cols"] = colunas;

  const totalLinhas = dados.length + cabecalho.length;
  for (let R = 0; R < totalLinhas; R++) {
    for (let C = 0; C < 8; C++) {
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
          ? { fgColor: { rgb: "333333" } } // cinza escuro no cabeçalho
          : R % 2 === 1
          ? { fgColor: { rgb: "F5F5F5" } } // linha alternada cinza claro
          : { fgColor: { rgb: "FFFFFF" } }, // linha branca
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Estoque");

  const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([arrayBuffer], { type: "application/octet-stream" });
  saveAs(blob, "relatorio_estoque.xlsx");
};

  // -------------------------------------------------------
  // JSX
  // -------------------------------------------------------
  return (
    <div className="estoque-container">
      <div className="estoque-header">
        <h2 className="estoque-titulo">Lista de Itens do Estoque</h2>

        <div className="estoque-controles">
          <input
            type="text"
            placeholder="Buscar por descrição..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="input-busca"
          />

          <button className="btn-adicionar" onClick={() => abrirModal()}>
            + Adicionar Item
          </button>

          <button className="btn-exportar" onClick={exportarPDF}>
            📄 PDF
          </button>
          <button className="btn-exportar" onClick={exportarXLSX}>
            📊 Excel
          </button>
        </div>
      </div>

      <div className="estoque-tabela-wrapper">
        <table className="estoque-tabela">
          <thead>
            <tr>
              <th onClick={ordenarPorDescricao} className="coluna-clickavel">
                Descrição {ordemAsc ? "▲" : "▼"}
              </th>
              <th>Fornecedor</th>
              <th>Nota Fiscal</th>
              <th>Entrada</th>
              <th>Quantidade</th>
              <th>Estoque</th>
              <th className="valor-unitario">Valor Unitário</th>
              <th>Valor Total</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {itensFiltrados.map((item) => (
              <tr key={item.codigoItem}>
                <td>{item.descricao}</td>
                <td>{item.fornecedor}</td>
                <td>{item.nota_fiscal}</td>
                <td>{formatarDataEntrada(item)}</td>
                <td>{item.quant_entrada}</td>
                <td>{item.estoque_quantidade ?? 0}</td>

                <td className="valor-unitario">
                  {formatarValor(item.estoque_valor_unitario)}
                </td>

                <td>{formatarValor(item.valor_total_entrada)}</td>

                <td className="acoes">
                  <button
                    className="btn-editar"
                    onClick={() => abrirModal(item)}
                  >
                    Editar
                  </button>

                  <button
                    className="btn-excluir"
                    onClick={() => excluirItem(item.codigoItem)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editandoItem ? "Editar Item" : "Adicionar Novo Item"}</h3>

            <input
              type="text"
              name="descricao"
              placeholder="Descrição"
              value={form.descricao || ""}
              onChange={handleChange}
            />

            <input
              type="text"
              name="fornecedor"
              placeholder="Fornecedor"
              value={form.fornecedor || ""}
              onChange={handleChange}
            />

            <input
              type="text"
              name="nota_fiscal"
              placeholder="Nota Fiscal"
              value={form.nota_fiscal || ""}
              onChange={handleChange}
            />

            <input
              type="number"
              name="quant_entrada"
              placeholder="Quantidade"
              value={form.quant_entrada || ""}
              onChange={handleChange}
            />

            <input
              type="number"
              name="valor_total_entrada"
              placeholder="Valor total (R$)"
              value={form.valor_total_entrada || ""}
              onChange={handleChange}
            />

            {/* VALOR DE VENDA */}
            <input
              type="number"
              name="valor_venda"
              placeholder="Valor de venda (R$)"
              value={form.valor_venda || ""}
              onChange={handleChange}
            />

            <div className="modal-acoes">
              <button className="btn-salvar" onClick={salvar}>
                Salvar
              </button>
              <button className="btn-cancelar" onClick={fecharModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
