import type { Rateio } from "./rateio";
import { fmtBRL, fmtNum } from "./rateio";

function csvEscape(v: string): string {
  if (/[";\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportRateioCSV(r: Rateio) {
  const sep = ";"; // pt-BR Excel friendly
  const header = [
    "Unidade",
    "Leitura anterior (m³)",
    "Leitura atual (m³)",
    "Consumo (m³)",
    "Parte comum (m³)",
    "% do total",
    "Valor a pagar (R$)",
    "Ajuste (R$)",
  ];
  const rows = r.linhas.map((l) => [
    l.unidade,
    l.leituraAnterior === null ? "" : fmtNum(l.leituraAnterior, 3),
    fmtNum(l.leituraAtual, 3),
    fmtNum(l.consumoPrivado, 3),
    fmtNum(l.parteComum, 3),
    fmtNum(l.percentual * 100) + "%",
    fmtNum(l.valorRateado),
    l.ajuste === 0 ? "" : fmtNum(l.ajuste),
  ]);
  const meta: string[][] = [
    [`Rateio ${r.mesReferencia}`],
    [
      "Valor faturado",
      r.conta ? fmtBRL(r.conta.valorFaturado) : "",
    ],
    [
      "Volume faturado (m³)",
      r.conta ? fmtNum(r.conta.volumeFaturado, 3) : "",
    ],
    ["Consumo medido (m³)", fmtNum(r.somaConsumoPrivado, 3)],
    ["Atribuído às áreas comuns (m³)", fmtNum(r.consumoComum, 3)],
    [],
  ];
  const lines = [
    ...meta,
    header,
    ...rows,
    [
      "Total",
      "",
      "",
      fmtNum(r.somaConsumoPrivado, 3),
      fmtNum(r.consumoComum, 3),
      "100%",
      fmtNum(r.somaRateada),
      "",
    ],
  ]
    .map((row) => row.map((c) => csvEscape(String(c ?? ""))).join(sep))
    .join("\n");
  // BOM para Excel pt-BR reconhecer UTF-8
  const blob = new Blob(["\uFEFF" + lines], { type: "text/csv;charset=utf-8" });
  download(blob, `rateio-${r.mesReferencia}.csv`);
}

export async function exportRateioPDF(r: Rateio) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Rateio de água — ${r.mesReferencia}`, 14, 18);
  doc.setFontSize(10);
  const meta: string[] = [];
  if (r.conta) {
    meta.push(`Valor faturado: ${fmtBRL(r.conta.valorFaturado)}`);
    meta.push(`Volume faturado: ${fmtNum(r.conta.volumeFaturado, 3)} m³`);
  }
  meta.push(`Consumo medido: ${fmtNum(r.somaConsumoPrivado, 3)} m³`);
  meta.push(`Áreas comuns: ${fmtNum(r.consumoComum, 3)} m³`);
  doc.text(meta, 14, 26);

  autoTable(doc, {
    startY: 26 + meta.length * 5 + 4,
    head: [[
      "Unidade",
      "Leitura ant.",
      "Leitura atual",
      "Consumo (m³)",
      "Parte comum (m³)",
      "% total",
      "Valor a pagar",
      "Ajuste",
    ]],
    body: [
      ...r.linhas.map((l) => [
        l.unidade,
        l.leituraAnterior === null ? "—" : fmtNum(l.leituraAnterior, 3),
        fmtNum(l.leituraAtual, 3),
        fmtNum(l.consumoPrivado, 3),
        l.parteComum > 0 ? fmtNum(l.parteComum, 3) : "—",
        fmtNum(l.percentual * 100) + "%",
        fmtBRL(l.valorRateado),
        l.ajuste === 0 ? "—" : (l.ajuste > 0 ? "+" : "") + fmtBRL(l.ajuste),
      ]),
      [
        "Total",
        "",
        "",
        fmtNum(r.somaConsumoPrivado, 3),
        fmtNum(r.consumoComum, 3),
        "100%",
        fmtBRL(r.somaRateada),
        "",
      ],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [40, 60, 100] },
  });

  doc.setFontSize(8);
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY ?? 60;
  doc.text(
    "Arredondamento matemático em centavos. Centavos residuais atribuídos às unidades de maior consumo.",
    14,
    finalY + 8,
  );

  doc.save(`rateio-${r.mesReferencia}.pdf`);
}
