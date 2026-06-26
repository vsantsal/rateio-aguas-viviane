import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/use-store";
import {
  deleteLeitura, listLeituras, listUnidades, saveLeitura, type Leitura,
} from "@/lib/storage";
import { fmtNum } from "@/lib/rateio";
import {
  PageHeader, Field, inputClass, btnPrimary, btnGhost, btnDanger, EmptyState, onSubmit, todayYM,
} from "@/components/ui-bits";

export const Route = createFileRoute("/leituras")({
  head: () => ({
    meta: [
      { title: "Leituras dos hidrômetros — Águas do Viviane" },
      { name: "description", content: "Consumo de água medido em cada unidade." },
    ],
  }),
  component: LeiturasPage,
});

function LeiturasPage() {
  const leituras = useStore(listLeituras) ?? [];
  const unidades = useStore(listUnidades) ?? [];
  const [editing, setEditing] = useState<Leitura | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <PageHeader
        title="Leituras dos hidrômetros"
        subtitle="Volume consumido (m³) por unidade em cada mês."
        action={
          <button className={btnPrimary} onClick={() => { setEditing(null); setShowForm(true); }} disabled={unidades.length === 0}>
            + Nova leitura
          </button>
        }
      />

      {unidades.length === 0 && (
        <EmptyState>Cadastre ao menos uma unidade antes de lançar leituras.</EmptyState>
      )}

      {showForm && (
        <LeituraForm leitura={editing} onClose={() => setShowForm(false)} />
      )}

      {leituras.length === 0 ? (
        unidades.length > 0 && <EmptyState>Nenhuma leitura cadastrada.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left">
              <tr>
                <Th>Mês</Th>
                <Th>Unidade</Th>
                <Th className="text-right">Leitura atual (m³)</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {leituras.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <Td className="font-medium">{l.mesReferencia}</Td>
                  <Td>{l.unidade}</Td>
                  <Td className="text-right">{fmtNum(l.leituraAtual)}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <button className={btnGhost} onClick={() => { setEditing(l); setShowForm(true); }}>Editar</button>{" "}
                    <button className={btnDanger} onClick={() => { if (confirm("Excluir leitura?")) deleteLeitura(l.id); }}>Excluir</button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LeituraForm({ leitura, onClose }: { leitura: Leitura | null; onClose: () => void }) {
  const unidades = useStore(listUnidades) ?? [];
  const [mes, setMes] = useState(leitura?.mesReferencia ?? todayYM());
  const [unidade, setUnidade] = useState(leitura?.unidade ?? unidades[0]?.nome ?? "");
  const [vol, setVol] = useState(String(leitura?.volumeConsumido ?? ""));
  const [err, setErr] = useState("");

  return (
    <form
      onSubmit={onSubmit(() => {
        const volN = Number(vol.replace(",", "."));
        if (!/^\d{4}-\d{2}$/.test(mes)) return setErr("Mês inválido.");
        if (!unidade) return setErr("Selecione uma unidade.");
        if (!isFinite(volN) || volN < 0) return setErr("Volume inválido.");
        saveLeitura({ id: leitura?.id, mesReferencia: mes, unidade, volumeConsumido: volN });
        onClose();
      })}
      className="rounded-xl border border-border bg-card p-5 mb-6 grid sm:grid-cols-4 gap-4"
    >
      <Field label="Mês de referência">
        <input type="month" className={inputClass} value={mes} onChange={(e) => setMes(e.target.value)} required />
      </Field>
      <Field label="Unidade">
        <select className={inputClass} value={unidade} onChange={(e) => setUnidade(e.target.value)}>
          {unidades.map((u) => (
            <option key={u.id} value={u.nome}>{u.nome}</option>
          ))}
        </select>
      </Field>
      <Field label="Volume consumido (m³)">
        <input className={inputClass} inputMode="decimal" value={vol} onChange={(e) => setVol(e.target.value)} required />
      </Field>
      <div className="flex items-end gap-2">
        <button type="submit" className={btnPrimary}>{leitura ? "Salvar" : "Adicionar"}</button>
        <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
      </div>
      {err && <p className="text-destructive text-sm sm:col-span-4">{err}</p>}
    </form>
  );
}

const Th = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <th className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground ${className}`}>{children}</th>
);
const Td = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-3 ${className}`}>{children}</td>
);
