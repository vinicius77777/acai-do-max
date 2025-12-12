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

  // NOVO: estado para lista de itens do lote (quando adicionar vários de uma vez)
  const [itensLote, setItensLote] = useState<Partial<EstoqueItem>[]>([]);
  // Fornecedor e notaFiscal fixos do lote (visíveis no modal de adicionar lote)
  const [loteFornecedor, setLoteFornecedor] = useState("");
  const [loteNotaFiscal, setLoteNotaFiscal] = useState("");

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
    // se passar item → edição simples (mantém comportamento antigo)
    if (item) {
      setEditandoItem(item);
      setForm({ ...item });
      setItensLote([]);
      setLoteFornecedor(item.fornecedor || "");
      setLoteNotaFiscal(item.nota_fiscal || "");
    } else {
      // criar novo lote (modo lote)
      setEditandoItem(null);
      setForm({});
      setItensLote([]);
      setLoteFornecedor("");
      setLoteNotaFiscal("");
    }
    setModalAberto(true);
  };

  const fecharModal = () => {
    setEditandoItem(null);
    setForm({});
    setItensLote([]);
    setLoteFornecedor("");
    setLoteNotaFiscal("");
    setModalAberto(false);
  };

  // -------------------------------------------------------
  // MANIPULAR FORM
  // -------------------------------------------------------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // Manipula campos do item do lote
  const handleChangeItemLote = (index: number, name: string, value: any) => {
    setItensLote((prev) => {
      const copy = [...prev];
      copy[index] = { ...(copy[index] || {}), [name]: value };
      return copy;
    });
  };

  // Adiciona um item na lista do lote (antes de salvar)
  const adicionarItemLote = () => {
    // pega do form os campos de item padrão (descr, quant, valor_total, valor_venda)
    if (!form.descricao || !form.quant_entrada) {
      alert("Preencha pelo menos descrição e quantidade do item antes de adicionar.");
      return;
    }

    const item: Partial<EstoqueItem> = {
      descricao: form.descricao,
      quant_entrada: Number(form.quant_entrada) || 0,
      valor_total_entrada:
        form.valor_total_entrada !== undefined
          ? Number(form.valor_total_entrada)
          : undefined,
      valor_venda:
        form.valor_venda !== undefined ? Number(form.valor_venda) : undefined,
      unidade_entrada: form.unidade_entrada,
      data_vencimento: form.data_vencimento,
    };

    setItensLote((prev) => [...prev, item]);

    // limpa somente os campos do item no form (mantendo fornecedor/nota se quiser)
    setForm((prev) => ({
      ...prev,
      descricao: "",
      quant_entrada: undefined,
      valor_total_entrada: undefined,
      valor_venda: undefined,
      unidade_entrada: undefined,
      data_vencimento: undefined,
    }));
  };

  // Remove item do lote por índice
  const removerItemLote = (index: number) => {
    setItensLote((prev) => prev.filter((_, i) => i !== index));
  };

  // -------------------------------------------------------
  // SALVAR (POST OU PUT)
  // -------------------------------------------------------
  const salvar = async () => {
    try {
      if (editandoItem) {
        const payload: any = { ...form };

        // Não enviar valor unitário (backend calcula)
        delete payload.estoque_valor_unitario;

        // Normaliza números
        if (payload.quant_entrada !== undefined)
          payload.quant_entrada = Number(payload.quant_entrada);

        if (payload.valor_total_entrada !== undefined)
          payload.valor_total_entrada = Number(payload.valor_total_entrada);

        if (payload.valor_venda !== undefined)
          payload.valor_venda = Number(payload.valor_venda);

        // 🔥 muito importante! manter o estoque atual
        payload.estoque_quantidade =
          form.estoque_quantidade !== undefined
            ? Number(form.estoque_quantidade)
            : editandoItem.estoque_quantidade;

        await api.put(`/estoque/${editandoItem.codigoItem}`, payload);
    }else {
        // Se não há itens no lote → criar um único item (comportamento antigo)
        if (itensLote.length === 0) {
          const hoje = new Date();
          const dia = hoje.getDate();
          const mes = (hoje.getMonth() + 1).toString().padStart(2, "0");

          const payload: any = {
            ...form,
            dia_entrada: dia,
            mes_entrada: mes,
            fornecedor: loteFornecedor || form.fornecedor,
            nota_fiscal: loteNotaFiscal || form.nota_fiscal,
          };

          if (payload.quant_entrada) payload.quant_entrada = Number(payload.quant_entrada);
          if (payload.valor_total_entrada) payload.valor_total_entrada = Number(payload.valor_total_entrada);
          if (payload.valor_venda) payload.valor_venda = Number(payload.valor_venda);

          delete payload.estoque_valor_unitario;

          await api.post("/estoque", payload);
        } else {
          // CRIAR VÁRIOS ITENS: envia 1 por 1 para o backend (cada um vira registro de estoque)
          const hoje = new Date();
          const dia = hoje.getDate();
          const mes = (hoje.getMonth() + 1).toString().padStart(2, "0");

          for (const item of itensLote) {
            const payload: any = {
              descricao: item.descricao,
              quant_entrada: Number(item.quant_entrada || 0),
              valor_total_entrada:
                item.valor_total_entrada !== undefined
                  ? Number(item.valor_total_entrada)
                  : 0,
              valor_venda:
                item.valor_venda !== undefined ? Number(item.valor_venda) : undefined,
              unidade_entrada: item.unidade_entrada,
              data_vencimento: item.data_vencimento,
              dia_entrada: dia,
              mes_entrada: mes,
              fornecedor: loteFornecedor,
              nota_fiscal: loteNotaFiscal,
            };

            // envia item por item
            await api.post("/estoque", payload);
          }
        }
      }

      fecharModal();
      buscarEstoque();
    } catch (error) {
      console.error("Erro ao salvar item:", error);
      alert("Erro ao salvar item. Veja console.");
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
      orientation: "landscape",
      unit: "pt",
      format: "A4",
    });

    const titulo = "Estoque";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(titulo, 40, 40);

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
      styles: {
        font: "helvetica",
        fontSize: 11,
        cellPadding: 6,
        valign: "middle",
        textColor: "#000",
        lineColor: "#bfbfbf",
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: "#2c2c2c",
        textColor: "#fff",
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: "#f5f5f5",
      },
      bodyStyles: {
        fillColor: "#ffffff",
      },
      tableWidth: "auto",
      margin: { left: 40, right: 40 },
    });

    doc.save("relatorio_estoque.pdf");
  };

  const exportarXLSX = () => {
    const dados = itensFiltrados.map((item) => ({
      Descrição: item.descricao || "",
      Fornecedor: item.fornecedor || "",
      "Nota Fiscal": item.nota_fiscal || "",
      Quantidade: item.quant_entrada || "",
      "Em Estoque": item.estoque_quantidade || "",
      "Valor Unitário": formatarValor(item.estoque_valor_unitario),
      "Valor Total": formatarValor(item.valor_total_entrada),
    }));

    const wb = XLSX.utils.book_new();

    const cabecalho = [
      ["Estoque"],
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

        const isHeader = R <= 1 || R === 1; 
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
            placeholder="Buscar"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="input-busca"
          />

          <button className="btn-adicionar" onClick={() => abrirModal()}>
            + Adicionar Item / Lote
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

      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editandoItem ? "Editar Item" : "Adicionar Novo Item / Lote"}</h3>

            {/* Se estiver editando um item existente, usamos o formulário antigo */}
            {editandoItem ? (
              <>
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

                <input
                  type="number"
                  name="valor_venda"
                  placeholder="Valor de venda (R$)"
                  value={form.valor_venda || ""}
                  onChange={handleChange}
                />
              </>
            ) : (
              /* MODO LOTE: fornecedor e nota fiscal no topo + adicionar vários itens abaixo */
              <>
                <input
                  type="text"
                  name="fornecedor"
                  placeholder="Fornecedor do Lote"
                  value={loteFornecedor}
                  onChange={(e) => setLoteFornecedor(e.target.value)}
                />

                <input
                  type="text"
                  name="nota_fiscal"
                  placeholder="Nota Fiscal do Lote"
                  value={loteNotaFiscal}
                  onChange={(e) => setLoteNotaFiscal(e.target.value)}
                />

                <hr style={{ opacity: 0.08, margin: "10px 0" }} />

                {/* Campos para montar um item (temporário em form) */}
                <input
                  type="text"
                  name="descricao"
                  placeholder="Descrição do item"
                  value={form.descricao || ""}
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

                <input
                  type="number"
                  name="valor_venda"
                  placeholder="Valor de venda (R$)"
                  value={form.valor_venda || ""}
                  onChange={handleChange}
                />

                <button
                  className="btn-add-item"
                  onClick={adicionarItemLote}
                >
                  + Adicionar Item ao Lote
                </button>

                {/* Lista de itens do lote */}
                {itensLote.length > 0 && (
                  <div className="lista-itens-pedido" style={{ marginTop: 12 }}>
                    <h4>Itens do Lote:</h4>
                    {itensLote.map((item, index) => (
                      <div key={index} className="item-card">
                        <div style={{ textAlign: "left" }}>
                          <strong>{item.descricao}</strong>
                          <div style={{ fontSize: 13 }}>
                            {item.quant_entrada} un — {formatarValor(item.valor_total_entrada)} — venda: {formatarValor(item.valor_venda)}
                          </div>
                        </div>

                        <div>
                          <button
                            className="btn-remover-item"
                            onClick={() => removerItemLote(index)}
                          >
                            ❌
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="modal-acoes" style={{ marginTop: 12 }}>
              <button className="btn-salvar" onClick={salvar}>
                {editandoItem ? "Salvar Alterações" : "Salvar Lote / Item"}
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
