import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/use-store";
import { listContas, listLeituras } from "@/lib/storage";
import { calcularRateio, fmtBRL, fmtNum } from "@/lib/rateio";
import { exportRateioCSV, exportRateioPDF } from "@/lib/rateio-export";
import { PageHeader, Field, inputClass, btnPrimary, btnGhost, EmptyState } from "@/components/ui-bits";

export const Route = createFileRoute("/rateio")({
  head: () => ({
    meta: [
      { title: "Rateio — Águas do Viviane" },
      { name: "description", content: "Rateio proporcional do valor da fatura por unidade." },
    ],
  }),
  component: RateioPage,
});

function RateioPage() {
  const contas = useStore(listContas) ?? [];
  const leituras = useStore(listLeituras) ?? [];

  const meses = useMemo(() => {
    const s = new Set<string>();
    contas.forEach((c) => s.add(c.mesReferencia));
    leituras.forEach((l) => s.add(l.mesReferencia));
    return Array.from(s).sort((a, b) => b.localeCompare(a));
  }, [contas, leituras]);

  const [mes, setMes] = useState(meses[0] ?? "");
  const mesAtual = mes || meses[0] || "";

  const conta = contas.find((c) => c.mesReferencia === mesAtual) ?? null;
  const rateio = mesAtual ? calcularRateio(mesAtual, conta, leituras) : null;

  return (
    <div>
      <PageHeader title="Relatório de rateio" subtitle="Proporcional ao consumo medido, com arredondamento matemático fechando o valor da fatura." />

      {meses.length === 0 ? (
        <EmptyState>Cadastre contas e leituras para gerar o relatório.</EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div className="max-w-xs flex-1 min-w-[180px]">
              <Field label="Mês de referência">
                <select className={inputClass} value={mesAtual} onChange={(e) => setMes(e.target.value)}>
                  {meses.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
            </div>
            {rateio && rateio.linhas.length > 0 && (
              <div className="flex gap-2">
                <button className={btnGhost} onClick={() => exportRateioCSV(rateio)}>Exportar CSV</button>
                <button className={btnPrimary} onClick={() => exportRateioPDF(rateio)}>Exportar PDF</button>
              </div>
            )}
          </div>

          {!conta && (
            <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-4 mb-6 text-sm">
              Sem conta cadastrada para {mesAtual}. Cadastre a fatura para calcular o rateio.
            </div>
          )}

          {rateio && (
            <>
              <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <Summary label="Valor faturado" value={conta ? fmtBRL(conta.valorFaturado) : "—"} />
                <Summary label="Volume faturado" value={conta ? `${fmtNum(conta.volumeFaturado, 3)} m³` : "—"} />
                <Summary
                  label="Consumo medido das unidades"
                  value={`${fmtNum(rateio.somaConsumoPrivado, 3)} m³`}
                  hint={rateio.mesAnterior ? `Atual − ref. ${rateio.mesAnterior}` : undefined}
                />
                <Summary
                  label="Atribuído às áreas comuns"
                  value={`${fmtNum(rateio.consumoComum, 3)} m³`}
                  hint={
                    rateio.consumoComum > 0
                      ? `Dividido por ${rateio.linhas.length} unidade(s).`
                      : rateio.diferenca < 0
                        ? "Consumo medido excede a fatura — sem parte comum."
                        : undefined
                  }
                />
              </section>

              {rateio.linhas.length === 0 ? (
                <EmptyState>Nenhuma leitura para {mesAtual}.</EmptyState>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-surface text-left">
                      <tr>
                        <Th>Unidade</Th>
                        <Th className="text-right">Leitura anterior</Th>
                        <Th className="text-right">Leitura atual</Th>
                        <Th className="text-right">Consumo (m³)</Th>
                        <Th className="text-right">Parte comum (m³)</Th>
                        <Th className="text-right">% do total</Th>
                        <Th className="text-right">Valor a pagar</Th>
                        <Th className="text-right">Ajuste</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rateio.linhas.map((l) => (
                        <tr key={l.unidade} className="border-t border-border">
                          <Td className="font-medium">{l.unidade}</Td>
                          <Td className="text-right text-muted-foreground">
                            {l.leituraAnterior === null ? "—" : fmtNum(l.leituraAnterior)}
                          </Td>
                          <Td className="text-right">{fmtNum(l.leituraAtual)}</Td>
                          <Td className="text-right">{fmtNum(l.consumoPrivado)}</Td>
                          <Td className="text-right text-muted-foreground">
                            {l.parteComum > 0 ? fmtNum(l.parteComum) : "—"}
                          </Td>
                          <Td className="text-right">{fmtNum(l.percentual * 100)}%</Td>
                          <Td className="text-right font-medium">{fmtBRL(l.valorRateado)}</Td>
                          <Td className="text-right text-muted-foreground">
                            {l.ajuste === 0 ? "—" : (l.ajuste > 0 ? "+" : "") + fmtBRL(l.ajuste)}
                          </Td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-border bg-surface/60 font-semibold">
                        <Td>Total</Td>
                        <Td />
                        <Td />
                        <Td className="text-right">{fmtNum(rateio.somaConsumoPrivado)}</Td>
                        <Td className="text-right">{fmtNum(rateio.consumoComum)}</Td>
                        <Td className="text-right">100%</Td>
                        <Td className="text-right">{fmtBRL(rateio.somaRateada)}</Td>
                        <Td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-4">
                Arredondamento HALF UP em centavos. Centavos residuais (para fechar exatamente o valor da fatura)
                são atribuídos primeiro às unidades de maior consumo.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Summary({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-display font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

const Th = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <th className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground ${className}`}>{children}</th>
);
const Td = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-3 ${className}`}>{children}</td>
);
