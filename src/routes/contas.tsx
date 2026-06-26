import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/use-store";
import { deleteConta, listContas, saveConta, type Conta } from "@/lib/storage";
import { fmtBRL, fmtNum } from "@/lib/rateio";
import {
  PageHeader, Field, inputClass, btnPrimary, btnGhost, btnDanger, EmptyState, onSubmit, todayYM,
} from "@/components/ui-bits";

export const Route = createFileRoute("/contas")({
  head: () => ({
    meta: [
      { title: "Contas de água — Águas do Viviane" },
      { name: "description", content: "Cadastro de contas mensais emitidas pela concessionária." },
    ],
  }),
  component: ContasPage,
});

function ContasPage() {
  const contas = useStore(listContas) ?? [];
  const [editing, setEditing] = useState<Conta | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <PageHeader
        title="Contas da concessionária"
        subtitle="Uma conta por mês de referência."
        action={
          <button className={btnPrimary} onClick={() => { setEditing(null); setShowForm(true); }}>
            + Nova conta
          </button>
        }
      />

      {showForm && (
        <ContaForm
          conta={editing}
          onClose={() => setShowForm(false)}
        />
      )}

      {contas.length === 0 ? (
        <EmptyState>Nenhuma conta cadastrada ainda.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left">
              <tr>
                <Th>Mês referência</Th>
                <Th className="text-right">Volume faturado (m³)</Th>
                <Th className="text-right">Valor faturado</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {contas.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <Td className="font-medium">{c.mesReferencia}</Td>
                  <Td className="text-right">{fmtNum(c.volumeFaturado)}</Td>
                  <Td className="text-right">{fmtBRL(c.valorFaturado)}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <button className={btnGhost} onClick={() => { setEditing(c); setShowForm(true); }}>Editar</button>{" "}
                    <button className={btnDanger} onClick={() => { if (confirm("Excluir conta?")) deleteConta(c.id); }}>Excluir</button>
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

function ContaForm({ conta, onClose }: { conta: Conta | null; onClose: () => void }) {
  const [mes, setMes] = useState(conta?.mesReferencia ?? todayYM());
  const [vol, setVol] = useState(String(conta?.volumeFaturado ?? ""));
  const [val, setVal] = useState(String(conta?.valorFaturado ?? ""));
  const [err, setErr] = useState("");

  return (
    <form
      onSubmit={onSubmit(() => {
        const volN = Number(vol.replace(",", "."));
        const valN = Number(val.replace(",", "."));
        if (!/^\d{4}-\d{2}$/.test(mes)) return setErr("Mês inválido (AAAA-MM).");
        if (!isFinite(volN) || volN < 0) return setErr("Volume inválido.");
        if (!isFinite(valN) || valN < 0) return setErr("Valor inválido.");
        saveConta({ id: conta?.id, mesReferencia: mes, volumeFaturado: volN, valorFaturado: valN });
        onClose();
      })}
      className="rounded-xl border border-border bg-card p-5 mb-6 grid sm:grid-cols-4 gap-4"
    >
      <Field label="Mês de referência">
        <input type="month" className={inputClass} value={mes} onChange={(e) => setMes(e.target.value)} required />
      </Field>
      <Field label="Volume faturado (m³)">
        <input className={inputClass} inputMode="decimal" value={vol} onChange={(e) => setVol(e.target.value)} required />
      </Field>
      <Field label="Valor faturado (R$)">
        <input className={inputClass} inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} required />
      </Field>
      <div className="flex items-end gap-2">
        <button type="submit" className={btnPrimary}>{conta ? "Salvar" : "Adicionar"}</button>
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
