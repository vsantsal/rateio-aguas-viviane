import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/use-store";
import { listContas, listLeituras, listUnidades } from "@/lib/storage";
import { calcularRateio, fmtBRL } from "@/lib/rateio";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Águas do Viviane — Início" },
      { name: "description", content: "Painel de contas e leituras de água do condomínio." },
    ],
  }),
  component: Home,
});

function Home() {
  const contas = useStore(listContas);
  const leituras = useStore(listLeituras);
  const unidades = useStore(listUnidades);
  const ultima = contas?.[0];
  const rateio = ultima ? calcularRateio(ultima.mesReferencia, ultima, leituras ?? []) : null;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-accent-foreground/70 font-medium uppercase tracking-wider">
          Condomínio Edifício Viviane
        </p>
        <h1 className="text-4xl md:text-5xl font-display font-semibold mt-2">
          Rateio justo de água, sem planilhas.
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Cadastre as contas da concessionária e as leituras dos hidrômetros de cada unidade.
          O rateio é calculado proporcionalmente ao consumo, com arredondamento HALF UP e ajuste
          automático para fechar exatamente o valor da fatura.
        </p>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <Stat label="Unidades" value={String(unidades?.length ?? 0)} to="/unidades" />
        <Stat label="Contas registradas" value={String(contas?.length ?? 0)} to="/contas" />
        <Stat label="Leituras" value={String(leituras?.length ?? 0)} to="/leituras" />
      </section>

      {rateio && ultima ? (
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-display">Último rateio</h2>
              <p className="text-sm text-muted-foreground">
                Referência {ultima.mesReferencia} · Fatura {fmtBRL(ultima.valorFaturado)}
              </p>
            </div>
            <Link
              to="/rateio"
              className="text-sm text-primary hover:underline"
            >
              Ver detalhes →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {rateio.linhas.map((l) => (
              <div key={l.unidade} className="rounded-lg bg-surface px-3 py-2">
                <div className="text-xs text-muted-foreground">Unid. {l.unidade}</div>
                <div className="font-medium">{fmtBRL(l.valorRateado)}</div>
              </div>
            ))}
            {rateio.linhas.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full">
                Cadastre leituras deste mês para gerar o rateio.
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">
            Comece cadastrando uma{" "}
            <Link to="/contas" className="text-primary hover:underline">conta</Link> e as{" "}
            <Link to="/leituras" className="text-primary hover:underline">leituras</Link> do mês.
          </p>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, to }: { label: string; value: string; to: string }) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
    >
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-3xl font-display font-semibold mt-1">{value}</div>
    </Link>
  );
}
