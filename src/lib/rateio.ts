import type { Conta, Leitura } from "./storage";

export type LinhaRateio = {
  unidade: string;
  volumeConsumido: number;
  percentual: number; // 0..1
  valorRateado: number; // R$ in centavos-aware number (2 decimals)
  ajuste: number; // centavos de ajuste aplicados
};

export type Rateio = {
  mesReferencia: string;
  conta: Conta | null;
  totalConsumido: number;
  diferenca: number; // volumeFaturado - somaConsumido (m³)
  linhas: LinhaRateio[];
  somaRateada: number;
};

/** Half-up rounding to 2 decimals, working in centavos to avoid FP drift. */
function roundHalfUpCents(n: number): number {
  // n is in centavos (can be fractional). Banker's-free HALF_UP.
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  return sign * Math.floor(abs + 0.5);
}

/**
 * Rateio proporcional ao consumo medido, com arredondamento HALF UP em centavos.
 * Se a soma dos valores arredondados divergir do valorFaturado, distribui a
 * diferença (em centavos) começando pelas unidades de maior consumo,
 * garantindo que a soma final iguale exatamente a fatura.
 */
export function calcularRateio(
  mesReferencia: string,
  conta: Conta | null,
  leituras: Leitura[],
): Rateio {
  const doMes = leituras.filter((l) => l.mesReferencia === mesReferencia);
  const totalConsumido = doMes.reduce((s, l) => s + (l.volumeConsumido || 0), 0);

  if (!conta || totalConsumido <= 0) {
    return {
      mesReferencia,
      conta,
      totalConsumido,
      diferenca: conta ? conta.volumeFaturado - totalConsumido : 0,
      linhas: doMes.map((l) => ({
        unidade: l.unidade,
        volumeConsumido: l.volumeConsumido,
        percentual: 0,
        valorRateado: 0,
        ajuste: 0,
      })),
      somaRateada: 0,
    };
  }

  const totalCentavos = roundHalfUpCents(conta.valorFaturado * 100);

  // Valor bruto em centavos por unidade (sem arredondar ainda)
  const bruto = doMes.map((l) => ({
    leitura: l,
    centavosExatos: (l.volumeConsumido / totalConsumido) * totalCentavos,
  }));

  const linhas: LinhaRateio[] = bruto.map((b) => ({
    unidade: b.leitura.unidade,
    volumeConsumido: b.leitura.volumeConsumido,
    percentual: b.leitura.volumeConsumido / totalConsumido,
    valorRateado: roundHalfUpCents(b.centavosExatos),
    ajuste: 0,
  }));

  let somaCent = linhas.reduce((s, l) => s + l.valorRateado, 0);
  let diff = totalCentavos - somaCent; // centavos a distribuir (+/-)

  if (diff !== 0) {
    // Ordena por maior consumo (desempate: maior parte fracional)
    const ordem = linhas
      .map((l, i) => ({
        i,
        consumo: l.volumeConsumido,
        frac: bruto[i].centavosExatos - Math.floor(bruto[i].centavosExatos),
      }))
      .sort((a, b) => b.consumo - a.consumo || b.frac - a.frac);

    const step = diff > 0 ? 1 : -1;
    let idx = 0;
    while (diff !== 0) {
      const target = ordem[idx % ordem.length];
      linhas[target.i].valorRateado += step;
      linhas[target.i].ajuste += step;
      diff -= step;
      idx++;
    }
  }

  // converte centavos -> R$
  const linhasReais = linhas.map((l) => ({
    ...l,
    valorRateado: l.valorRateado / 100,
    ajuste: l.ajuste / 100,
  }));

  return {
    mesReferencia,
    conta,
    totalConsumido,
    diferenca: conta.volumeFaturado - totalConsumido,
    linhas: linhasReais,
    somaRateada: linhasReais.reduce((s, l) => s + l.valorRateado, 0),
  };
}

export const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtNum = (n: number, d = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
