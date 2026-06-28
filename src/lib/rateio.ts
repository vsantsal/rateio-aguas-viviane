import type { Conta, Leitura } from "./storage";

export type LinhaRateio = {
  unidade: string;
  leituraAnterior: number | null;
  leituraAtual: number;
  consumoPrivado: number; // m³
  parteComum: number; // m³ atribuída desta unidade às áreas comuns
  volumeAtribuido: number; // consumoPrivado + parteComum
  percentual: number; // 0..1 sobre volumeAtribuido total
  valorRateado: number; // R$
  ajuste: number; // R$ centavos de ajuste
};

export type Rateio = {
  mesReferencia: string;
  mesAnterior: string | null;
  conta: Conta | null;
  somaConsumoPrivado: number;
  consumoComum: number; // m³ atribuídos a áreas comuns (>=0)
  diferenca: number; // volumeFaturado - somaConsumoPrivado (m³, pode ser negativo)
  linhas: LinhaRateio[];
  somaRateada: number;
};

function roundHalfUpCents(n: number): number {
  const sign = n < 0 ? -1 : 1;
  return sign * Math.floor(Math.abs(n) + 0.5);
}

/** "AAAA-MM" → "AAAA-MM" do mês anterior. */
function previousMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Para cada unidade com leitura no mês selecionado, busca a leitura mais
 * recente anterior a esse mês (mesmo que não seja o mês imediatamente
 * anterior) e calcula o consumo. Se não existir leitura anterior, assume 0.
 */
function consumosDoMes(mes: string, leituras: Leitura[]) {
  const atuais = leituras.filter((l) => l.mesReferencia === mes);
  return atuais.map((l) => {
    const anteriores = leituras
      .filter((x) => x.unidade === l.unidade && x.mesReferencia < mes)
      .sort((a, b) => b.mesReferencia.localeCompare(a.mesReferencia));
    const ant = anteriores[0];
    const consumo = Math.max(0, l.leituraAtual - (ant?.leituraAtual ?? 0));
    return {
      unidade: l.unidade,
      leituraAtual: l.leituraAtual,
      leituraAnterior: ant ? ant.leituraAtual : null,
      consumoPrivado: consumo,
    };
  });
}

export function calcularRateio(
  mesReferencia: string,
  conta: Conta | null,
  leituras: Leitura[],
): Rateio {
  const base = consumosDoMes(mesReferencia, leituras);
  const somaConsumoPrivado = base.reduce((s, b) => s + b.consumoPrivado, 0);

  if (!conta || base.length === 0) {
    return {
      mesReferencia,
      mesAnterior: previousMonth(mesReferencia),
      conta,
      somaConsumoPrivado,
      consumoComum: 0,
      diferenca: conta ? conta.volumeFaturado - somaConsumoPrivado : 0,
      linhas: base.map((b) => ({
        unidade: b.unidade,
        leituraAnterior: b.leituraAnterior,
        leituraAtual: b.leituraAtual,
        consumoPrivado: b.consumoPrivado,
        parteComum: 0,
        volumeAtribuido: b.consumoPrivado,
        percentual: 0,
        valorRateado: 0,
        ajuste: 0,
      })),
      somaRateada: 0,
    };
  }

  // Áreas comuns: excedente do volume faturado sobre o consumo medido,
  // dividido igualmente entre TODAS as unidades com leitura no mês.
  const consumoComum = Math.max(0, conta.volumeFaturado - somaConsumoPrivado);
  const parteComumPorUnidade = consumoComum / base.length;

  const enriquecidas = base.map((b) => {
    const volumeAtribuido = b.consumoPrivado + parteComumPorUnidade;
    return { ...b, parteComum: parteComumPorUnidade, volumeAtribuido };
  });

  const totalAtribuido = enriquecidas.reduce((s, e) => s + e.volumeAtribuido, 0);
  const totalCentavos = roundHalfUpCents(conta.valorFaturado * 100);

  const bruto = enriquecidas.map((e) => ({
    ...e,
    centavosExatos:
      totalAtribuido > 0 ? (e.volumeAtribuido / totalAtribuido) * totalCentavos : 0,
  }));

  const linhas: LinhaRateio[] = bruto.map((b) => ({
    unidade: b.unidade,
    leituraAnterior: b.leituraAnterior,
    leituraAtual: b.leituraAtual,
    consumoPrivado: b.consumoPrivado,
    parteComum: b.parteComum,
    volumeAtribuido: b.volumeAtribuido,
    percentual: totalAtribuido > 0 ? b.volumeAtribuido / totalAtribuido : 0,
    valorRateado: roundHalfUpCents(b.centavosExatos),
    ajuste: 0,
  }));

  let diff = totalCentavos - linhas.reduce((s, l) => s + l.valorRateado, 0);

  if (diff !== 0 && linhas.length > 0) {
    // Diferença positiva: acrescenta ao menor valor.
    // Diferença negativa: subtrai do maior valor.
    // Aplicado centavo a centavo, re-selecionando após cada ajuste para
    // distribuir resíduos maiores que 1 centavo de forma equilibrada.
    const step = diff > 0 ? 1 : -1;
    while (diff !== 0) {
      let alvo = 0;
      for (let i = 1; i < linhas.length; i++) {
        if (step > 0) {
          if (linhas[i].valorRateado < linhas[alvo].valorRateado) alvo = i;
        } else {
          if (linhas[i].valorRateado > linhas[alvo].valorRateado) alvo = i;
        }
      }
      linhas[alvo].valorRateado += step;
      linhas[alvo].ajuste += step;
      diff -= step;
    }
  }

  const linhasReais = linhas.map((l) => ({
    ...l,
    valorRateado: l.valorRateado / 100,
    ajuste: l.ajuste / 100,
  }));

  return {
    mesReferencia,
    mesAnterior: previousMonth(mesReferencia),
    conta,
    somaConsumoPrivado,
    consumoComum,
    diferenca: conta.volumeFaturado - somaConsumoPrivado,
    linhas: linhasReais,
    somaRateada: linhasReais.reduce((s, l) => s + l.valorRateado, 0),
  };
}

export const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtNum = (n: number, d = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
