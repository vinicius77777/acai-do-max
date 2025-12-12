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

  const [modoGrafico, setModoGrafico] = useState<"dia" | "mes" | "ano">("dia");
  const [dataInicio, setDataInicio] = useState("");
  const [quinzena, setQuinzena] = useState("");
  const [filtroData, setFiltroData] = useState("");



  useEffect(() => {
    buscarPedidos();
  }, []);

  const buscarPedidos = async () => {
    try {
      const res = await api.get("/pedidos");
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
    if (isNaN(numero)) return "R$ 0,00";
    return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatarDataSaida = (p: Pedido) => {
    if (!p.dia_saida || !p.mes_saida) return "";
    const anoAtual = new Date().getFullYear();
    return `${String(p.dia_saida).padStart(2, "0")}/${p.mes_saida}/${anoAtual}`;
  };

const pedidosFiltrados = pedidos.filter((p) => {
  // 🔎 FILTRO DE TEXTO
  const textoOk =
    p.descricao?.toLowerCase().includes(filtro.toLowerCase()) ||
    (p.responsavel ?? "").toLowerCase().includes(filtro.toLowerCase()) ||
    (p.localidade ?? "").toLowerCase().includes(filtro.toLowerCase());

  // 🔎 FILTRO POR MÊS
  const mesOk = !mesFiltro || p.mes_saida === mesFiltro;

  // 🔹 Monta a data real do pedido
  let dataPedido: Date | null = null;
  if (p.dia_saida && p.mes_saida) {
    const anoAtual = new Date().getFullYear();
    dataPedido = new Date(anoAtual, Number(p.mes_saida) - 1, p.dia_saida);
  }

  // 🔹 FILTRO POR DATA INICIAL
  const dataInicioOk =
    !dataInicio || (dataPedido && dataPedido >= new Date(dataInicio));

  // 🔹 FILTRO POR QUINZENA
  let quinzenaOk = true;
  if (quinzena && dataPedido) {
    const dia = dataPedido.getDate();
    if (quinzena === "1") quinzenaOk = dia >= 1 && dia <= 15;
    if (quinzena === "2") quinzenaOk = dia >= 16 && dia <= 31;
  }

  // -----------------------------------------------------------------------
  // 📅 FILTRO INTELIGENTE (26, 2601, 26012025, 26/01/2025, etc)
  // -----------------------------------------------------------------------
  if (filtroData.trim() !== "") {
    const limpa = filtroData.replace(/\D/g, "");

    if (limpa.length === 2) {
      const diaFiltro = Number(limpa);
      if (p.dia_saida !== diaFiltro) return false;
    }

    if (limpa.length === 4) {
      const diaFiltro = Number(limpa.slice(0, 2));
      const mesFiltro = Number(limpa.slice(2, 4));
      if (
        p.dia_saida !== diaFiltro ||
        Number(p.mes_saida) !== mesFiltro
      )
        return false;
    }

    if (limpa.length === 8) {
      const diaFiltro = Number(limpa.slice(0, 2));
      const mesFiltro = Number(limpa.slice(2, 4));
      const anoFiltro = Number(limpa.slice(4, 8));

      const anoAtual = new Date().getFullYear();
      if (
        p.dia_saida !== diaFiltro ||
        Number(p.mes_saida) !== mesFiltro ||
        anoAtual !== anoFiltro // você não tem ano no banco
      )
        return false;
    }
  }

  return textoOk && mesOk && dataInicioOk && quinzenaOk;
});



  const lucroTotalMes = pedidosFiltrados.reduce(
    (acc, p) => acc + (p.lucratividade_total || 0),
    0
  );

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

  // --------------------------
  // GERAÇÃO DOS DADOS DO GRÁFICO
  // --------------------------
  let labels: string[] = [];
let valores: number[] = [];

if (modoGrafico === "mes") {
  // 🔵 LUCRO POR MÊS
  labels = Array.from(
    new Set(
      pedidosFiltrados
        .map((p) => p.mes_saida)
        .filter((m): m is string => !!m)
    )
  ).sort();

  valores = labels.map((mes) =>
    pedidosFiltrados
      .filter((p) => p.mes_saida === mes)
      .reduce((acc, p) => acc + (p.lucratividade_total || 0), 0)
  );

} else if (modoGrafico === "dia") {
  // 🟢 LUCRO POR DIA
  // Labels ordenados do mais antigo para o mais recente
labels = Array.from(
  new Set(
    pedidosFiltrados
      .filter((p) => p.dia_saida && p.mes_saida)
      .map(
        (p) =>
          `${String(p.dia_saida).padStart(2, "0")}/${String(
            p.mes_saida
          ).padStart(2, "0")}`
      )
  )
)
  .sort((a, b) => {
    const [diaA, mesA] = a.split("/").map(Number);
    const [diaB, mesB] = b.split("/").map(Number);

    // Cria datas fictícias para comparar
    const dataA = new Date(2025, mesA - 1, diaA);
    const dataB = new Date(2025, mesB - 1, diaB);

    return dataA.getTime() - dataB.getTime(); // ORDEM CRESCENTE → mais antigo primeiro
  });

// Somatório dos valores por label
valores = labels.map((label) => {
  const [dia, mes] = label.split("/");

  return pedidosFiltrados
    .filter(
      (p) =>
        String(p.dia_saida).padStart(2, "0") === dia &&
        String(p.mes_saida).padStart(2, "0") === mes
    )
    .reduce((acc, p) => acc + (p.lucratividade_total || 0), 0);
});


} else if (modoGrafico === "ano") {
  // 🟡 LUCRO POR ANO
  const anos = pedidosFiltrados
    .map((p) => {
      const d = formatarDataSaida(p);
      if (!d) return null;
      return d.split("/")[2]; // ano
    })
    .filter((a): a is string => a !== null);

  labels = Array.from(new Set(anos)).sort();

  valores = labels.map((ano) =>
    pedidosFiltrados
      .filter((p) => {
        const d = formatarDataSaida(p);
        if (!d) return false;
        return d.endsWith(ano);
      })
      .reduce((acc, p) => acc + (p.lucratividade_total || 0), 0)
  );
}

  const dataGrafico = {
    labels,
    datasets: [
      {
        label:
          modoGrafico === "mes"
            ? "Lucro por Mês"
            : modoGrafico === "dia"
            ? "Lucro por Dia"
            : "Lucro por Ano",
        data: valores,
        fill: false,
        tension: 0.2,
        borderWidth: 2,
        borderColor: "#a154c7ff",
        pointBackgroundColor: "#a154c7ff",
      },
    ],
  };

  const opcoesGrafico: any = {
    plugins: {
      legend: { labels: { color: "#fff", font: { size: 12 } } },
      title: {
        display: true,
        text:
          modoGrafico === "mes"
            ? "Lucro por Mês"
            : modoGrafico === "dia"
            ? "Lucro por Dia"
            : "Lucro por Ano",
        color: "#fff",
        font: { size: 14, weight: "bold" },
      },
    },
    scales: {
      x: { ticks: { color: "#fff" } },
      y: {
        ticks: {
          color: "#fff",
          callback: (v: any) => formatarValor(v),
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  // -------------------------------
  // EXPORTAR PDF
  // -------------------------------
// -------------------------------
const exportarPDF = () => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "A4",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Relatório de Lucro por Responsável e Loja", 40, 50);

  // AGRUPAR POR RESPONSÁVEL + LOJA
  const lucroGrupo: Record<string, { responsavel: string; loja: string; valor: number }> = {};

  pedidosFiltrados.forEach((p) => {
    const responsavel = p.responsavel || "Sem responsável";
    const loja = p.localidade || "Sem loja";

    const chave = `${responsavel}__${loja}`; // chave única

    if (!lucroGrupo[chave]) {
      lucroGrupo[chave] = {
        responsavel,
        loja,
        valor: 0,
      };
    }

    lucroGrupo[chave].valor += p.lucratividade_total || 0;
  });

  // TRANSFORMAR PARA ARRAY USADO NA TABELA
  const resumoArray = Object.values(lucroGrupo).map((item) => ({
    responsavel: item.responsavel,
    loja: item.loja,
    valor: formatarValor(item.valor),
  }));

  // TABELA
  autoTable(doc, {
    startY: 90,
    head: [["Responsável", "Loja", "Lucro Total"]],
    body: resumoArray.map((r) => [r.responsavel, r.loja, r.valor]),
    theme: "grid",
    styles: { fontSize: 12, halign: "center" },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] }, // CABEÇALHO PRETO
    margin: { left: 40, right: 40 },
  });

  // VALOR TOTAL FINAL
  const posY = (doc as any).lastAutoTable.finalY + 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Lucro Total do Mês: ${formatarValor(lucroTotalMes)}`, 40, posY);

  // SALVAR PDF
  doc.save("relatorio_lucro.pdf");
};

  // ---------------------------------------------------
  // EXPORTAR EXCEL
  // ---------------------------------------------------
  const exportarXLSX = () => {
  const dados = pedidosFiltrados.map((p) => ({
    Descrição: p.descricao || "",
    Responsável: p.responsavel || "",
    Localidade: p.localidade || "",
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
    [], // linha vazia antes da tabela
  ];

  const ws = XLSX.utils.aoa_to_sheet(cabecalho);
  XLSX.utils.sheet_add_json(ws, dados, { origin: -1 });

  // LARGURA DAS COLUNAS (ajuste fino)
  const colunas = [
    { wch: 30 }, // Descrição
    { wch: 20 }, // Responsável
    { wch: 20 }, // Localidade
    { wch: 12 }, // Quantidade
    { wch: 15 }, // Valor Unitário
    { wch: 15 }, // Valor Total
    { wch: 15 }, // Lucro Unitário
    { wch: 15 }, // Lucro Total
    { wch: 12 }, // Margem
  ];
  ws["!cols"] = colunas;

  const totalLinhas = dados.length + cabecalho.length;

  // 🌟 ESTILOS EXATAMENTE COMO O ESTOQUE
  for (let R = 0; R < totalLinhas; R++) {
    for (let C = 0; C < 9; C++) {
      const cell_ref = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cell_ref]) continue;

      const isTitulo = R === 0;
      const isHeaderTabela = R === cabecalho.length - 1;
      const isHeader = isTitulo || isHeaderTabela;

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
          color: { rgb: isTitulo ? "FFFFFF" : isHeader ? "FFFFFF" : "000000" },
        },
        alignment: { vertical: "center", horizontal: "center" },

        fill: isTitulo
          ? { fgColor: { rgb: "000000" } } // preto
          : isHeaderTabela
          ? { fgColor: { rgb: "333333" } } // cinza escuro
          : R % 2 === 1
          ? { fgColor: { rgb: "F5F5F5" } } // alternado
          : { fgColor: { rgb: "FFFFFF" } }, // linha branca
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, "Lucro");

  const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([arrayBuffer], { type: "application/octet-stream" });
  saveAs(blob, "relatorio_lucro.xlsx");
saveAs(blob, "relatorio_lucro.xlsx");
};


  return (
    <div className="lucro-container">
      <h2>Relatório de Lucro</h2>

      <div className="filtros">
        <input
          type="text"
          placeholder="Buscar"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />

      <input
  type="text"
  placeholder="Data"
  value={filtroData}
  onChange={(e) => setFiltroData(e.target.value)}
  maxLength={10}
  className="input-data"
/>


      {/* FILTRO QUINZENAL */}
      <select value={quinzena} onChange={(e) => setQuinzena(e.target.value)}>
        <option value="">Quinzena (todas)</option>
        <option value="1">1ª Quinzena (1–15)</option>
        <option value="2">2ª Quinzena (16–31)</option>
      </select>

        <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}>
          <option value="">Todos os meses</option>
          {Array.from(
            new Set(pedidos.map((p) => p.mes_saida || "").filter((m) => m))
          )
            .sort()
            .map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
        </select>

        <select
          value={modoGrafico}
          onChange={(e) => setModoGrafico(e.target.value as any)}
        >
          <option value="mes">Lucro por Mês</option>
          <option value="dia">Lucro por Dia</option>
          <option value="ano">Lucro por Ano</option>
        </select>

        <button className="btn-exportar pdf" onClick={exportarPDF}>
          📄 PDF
        </button>

        <button className="btn-exportar excel" onClick={exportarXLSX}>
          📊 Excel
        </button>
      </div>

      <div className="valor-total-mes">
        <strong>
          Lucro total: {formatarValor(lucroTotalMes)}
        </strong>
      </div>

      <div
        className="chart-container"
        style={{ marginBottom: 24, maxWidth: 900, height: 300 }}
      >
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
            <td colSpan={8}>TOTAL</td>
            <td>{formatarValor(lucroTotalMes)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
