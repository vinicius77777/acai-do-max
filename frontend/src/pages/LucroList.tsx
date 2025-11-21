import { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/lucroList.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";
import { Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Pedido {
  id: number;
  descricao: string;
  responsavel?: string;
  localidade?: string;
  mes_saida?: string | null;
  dia_saida?: number | null;
  quant_saida?: number | null;
  valor_unitario_venda?: number | null;
  valor_total_saida?: number | null;
  margem_aplicada?: string | null;
  lucratividade_unitario?: number | null;
  lucratividade_total?: number | null;
}

export default function LucroList() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtro, setFiltro] = useState("");
  const [ordem, setOrdem] = useState<{ coluna: string; asc: boolean }>({
    coluna: "descricao",
    asc: true,
  });
  const [mesFiltro, setMesFiltro] = useState<string>("");

  useEffect(() => {
    buscarPedidos();
  }, []);

  const buscarPedidos = async () => {
    try {
      const res = await api.get("/pedidos");
      // normalizar valores numéricos e strings
      const dados: Pedido[] = res.data.map((p: any) => ({
        id: Number(p.id),
        descricao: p.descricao,
        responsavel: p.responsavel ?? null,
        localidade: p.localidade ?? null,
        mes_saida: p.mes_saida ?? null,
        dia_saida: p.dia_saida ?? null,
        quant_saida: Number(p.quant_saida || 0),
        valor_unitario_venda: Number(p.valor_unitario_venda || 0),
        valor_total_saida: Number(p.valor_total_saida || 0),
        margem_aplicada: p.margem_aplicada ?? null,
        lucratividade_unitario: Number(p.lucratividade_unitario || 0),
        lucratividade_total: Number(p.lucratividade_total || 0),
      }));
      setPedidos(dados);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
    }
  };

  const formatarValor = (valor?: number | string | null) => {
    const numero = parseFloat(String(valor || "0"));
    return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatarDataSaida = (p: Pedido) => {
    const dia = p.dia_saida;
    const mes = p.mes_saida;
    if (!dia || !mes) return "";
    const ano = new Date().getFullYear();
    return `${String(dia).padStart(2, "0")}/${mes}/${ano}`;
  };

  // filtragem por mês e texto
  const pedidosFiltrados = pedidos.filter(
    (p) =>
      (!mesFiltro || p.mes_saida === mesFiltro) &&
      (p.descricao?.toLowerCase().includes(filtro.toLowerCase()) ||
        (p.responsavel ?? "").toLowerCase().includes(filtro.toLowerCase()) ||
        (p.localidade ?? "").toLowerCase().includes(filtro.toLowerCase()))
  );

  // lucro total do "mês" (com base em pedidos filtrados)
  const lucroTotalMes = pedidosFiltrados.reduce(
    (acc, p) => acc + (p.lucratividade_total || 0),
    0
  );

  // ordenação genérica por coluna
  const ordenarPor = (coluna: keyof Pedido) => {
    const asc = ordem.coluna === coluna ? !ordem.asc : true;
    setOrdem({ coluna: coluna as string, asc });

    setPedidos((prev) =>
      [...prev].sort((a, b) => {
        const A = (a[coluna] ?? "") as any;
        const B = (b[coluna] ?? "") as any;
        if (typeof A === "string" && typeof B === "string") {
          return asc ? A.localeCompare(B) : B.localeCompare(A);
        }
        return asc ? Number(A) - Number(B) : Number(B) - Number(A);
      })
    );
  };

  // preparar dados do gráfico (agrupar por mes_saida)
  const meses: string[] = Array.from(
    new Set(pedidos.map((p) => p.mes_saida || "").filter((m) => m))
  ).sort();

  const lucroPorMes = meses.map((mes) =>
    pedidos
      .filter((p) => p.mes_saida === mes)
      .reduce((acc, p) => acc + (p.lucratividade_total || 0), 0)
  );

  const dataGrafico = {
    labels: meses,
    datasets: [
      {
        label: "Lucro por Mês",
        data: lucroPorMes,
        fill: false,
        tension: 0.2,
        borderWidth: 2,
        // colors kept in CSS responsibility; but explicit fallback:
        borderColor: "rgba(75,192,192,1)",
        pointBackgroundColor: "rgba(75,192,192,1)",
      },
    ],
  };

  // cast as any to avoid Chart.js deep partial typing friction in TS
  const opcoesGrafico: any = {
    plugins: {
      legend: { labels: { color: "#fff", font: { size: 12 } } },
      title: {
        display: true,
        text: "Lucro por Mês (baseado em pedidos)",
        color: "#fff",
        font: { size: 14, weight: "bold" as const },
      },
    },
    scales: {
      x: {
        ticks: { color: "#fff" },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
      y: {
        ticks: { color: "#fff", callback: (val: any) => formatarValor(Number(val)) },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  const exportarPDF = () => {
  const doc = new jsPDF({
    orientation: "landscape", // PDF mais largo
    unit: "pt",
    format: "A4",
  });

  const titulo = "Lucro";
  const data = new Date().toLocaleString("pt-BR");

  // TÍTULO
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(titulo, 40, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`${data}`, 40, 60);
  doc.text(`Lucro total: ${formatarValor(lucroTotalMes)}`, 40, 80);

  const colunas = [
    { header: "Descrição", dataKey: "descricao" },
    { header: "Responsável", dataKey: "responsavel" },
    { header: "Localidade", dataKey: "localidade" },
    { header: "Entrada", dataKey: "entrada" },
    { header: "Qtd", dataKey: "quant_saida" },
    { header: "Valor Unitário", dataKey: "valor_unitario" },
    { header: "Valor Total", dataKey: "valor_total" },
    { header: "Lucro Unitário", dataKey: "lucro_unitario" },
    { header: "Lucro Total", dataKey: "lucro_total" },
    { header: "Margem", dataKey: "margem" },
  ];

  const linhas = pedidosFiltrados.map((p) => ({
    descricao: p.descricao || "",
    responsavel: p.responsavel || "",
    localidade: p.localidade || "",
    entrada: formatarDataSaida(p),
    quant_saida: p.quant_saida || "",
    valor_unitario: formatarValor(p.valor_unitario_venda),
    valor_total: formatarValor(p.valor_total_saida),
    lucro_unitario: formatarValor(p.lucratividade_unitario),
    lucro_total: formatarValor(p.lucratividade_total),
    margem: p.margem_aplicada || "",
  }));

  autoTable(doc, {
    startY: 100,
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

    tableWidth: "auto",      // usa largura total do PDF
    margin: { left: 40, right: 40 },
  });

  doc.save("relatorio_lucro_pedidos.pdf");
};

  const exportarXLSX = () => {
  const dados = pedidosFiltrados.map((p) => ({
    Descrição: p.descricao || "",
    Responsável: p.responsavel || "",
    Localidade: p.localidade || "",
    Entrada: formatarDataSaida(p),
    Quantidade: p.quant_saida || "",
    "Valor Unitário": formatarValor(p.valor_unitario_venda),
    "Valor Total": formatarValor(p.valor_total_saida),
    "Lucro Unitário": formatarValor(p.lucratividade_unitario),
    "Lucro Total": formatarValor(p.lucratividade_total),
    Margem: p.margem_aplicada || "",
  }));

  const wb = XLSX.utils.book_new();

  const cabecalho = [
    ["Relatório de Lucro"],
    [`${new Date().toLocaleString("pt-BR")}`],
    [],
  ];

  const ws = XLSX.utils.aoa_to_sheet(cabecalho);
  XLSX.utils.sheet_add_json(ws, dados, { origin: -1 });

  const colunas = [
    { wch: 30 }, // Descrição
    { wch: 20 }, // Responsável
    { wch: 15 }, // Localidade
    { wch: 12 }, // Entrada
    { wch: 10 }, // Quantidade
    { wch: 15 }, // Valor Unitário
    { wch: 15 }, // Valor Total
    { wch: 15 }, // Lucro Unitário
    { wch: 15 }, // Lucro Total
    { wch: 12 }, // Margem
  ];
  ws["!cols"] = colunas;

  const totalLinhas = dados.length + cabecalho.length;
  for (let R = 0; R < totalLinhas; R++) {
    for (let C = 0; C < 10; C++) {
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

  XLSX.utils.book_append_sheet(wb, ws, "Lucro");

  const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([arrayBuffer], { type: "application/octet-stream" });
  saveAs(blob, "relatorio_lucro.xlsx");
};

  return (
    <div className="lucro-container">
      <h2>Relatório de Lucro</h2>

      <div className="filtros">
        <input
          type="text"
          placeholder="Buscar por descrição, responsável ou localidade..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}>
          <option value="">Todos os meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <button className="btn-exportar pdf" onClick={exportarPDF}>
           📄 PDF
        </button>
        <button className="btn-exportar excel" onClick={exportarXLSX}>
          📊 Excel
        </button>
      </div>

      <div className="valor-total-mes">
        <strong>Lucro total (filtrado): {formatarValor(lucroTotalMes)}</strong>
      </div>

      <div className="chart-container" style={{ marginBottom: 24, maxWidth: 900, height: 300 }}>
        <Chart type="line" data={dataGrafico as any} options={opcoesGrafico} />
      </div>

      <table className="lucro-tabela">
        <thead>
          <tr>
            <th onClick={() => ordenarPor("descricao")}>Descrição</th>
            <th onClick={() => ordenarPor("responsavel")}>Responsável</th>
            <th>Localidade</th>
            <th>Entrada</th>
            <th onClick={() => ordenarPor("quant_saida")}>Quantidade</th>
            <th>Valor Unitário</th>
            <th>Valor Total</th>
            <th>Lucro Unitário</th>
            <th>Lucro Total</th>
            <th>Margem</th>
          </tr>
        </thead>
        <tbody>
          {pedidosFiltrados.map((p) => (
            <tr key={p.id}>
              <td>{p.descricao}</td>
              <td>{p.responsavel}</td>
              <td>{p.localidade}</td>
              <td>{formatarDataSaida(p)}</td>
              <td>{p.quant_saida}</td>
              <td className={(p.lucratividade_unitario || 0) < 0 ? "negativo" : "positivo"}>
                {formatarValor(p.valor_unitario_venda)}
              </td>
              <td>{formatarValor(p.valor_total_saida)}</td>
              <td className={(p.lucratividade_unitario || 0) < 0 ? "negativo" : "positivo"}>
                {formatarValor(p.lucratividade_unitario)}
              </td>
              <td className={(p.lucratividade_total || 0) < 0 ? "negativo" : "positivo"}>
                {formatarValor(p.lucratividade_total)}
              </td>
              <td>{p.margem_aplicada}</td>
            </tr>
          ))}

          <tr className="total-row">
            <td colSpan={8}>TOTAL DO MÊS</td>
            <td>{formatarValor(lucroTotalMes)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
