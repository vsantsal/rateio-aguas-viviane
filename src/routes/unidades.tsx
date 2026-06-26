import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/use-store";
import { deleteUnidade, listUnidades, saveUnidade } from "@/lib/storage";
import {
  PageHeader, Field, inputClass, btnPrimary, btnGhost, btnDanger, EmptyState, onSubmit,
} from "@/components/ui-bits";

export const Route = createFileRoute("/unidades")({
  head: () => ({
    meta: [
      { title: "Unidades — Águas do Viviane" },
      { name: "description", content: "Cadastro das unidades (apartamentos) do condomínio." },
    ],
  }),
  component: UnidadesPage,
});

function UnidadesPage() {
  const unidades = useStore(listUnidades) ?? [];
  const [nome, setNome] = useState("");
  const [err, setErr] = useState("");

  return (
    <div>
      <PageHeader title="Unidades" subtitle="Apartamentos do Edifício Viviane." />

      <form
        onSubmit={onSubmit(() => {
          const n = nome.trim();
          if (!n) return setErr("Informe o identificador da unidade.");
          if (unidades.some((u) => u.nome.toLowerCase() === n.toLowerCase()))
            return setErr("Unidade já cadastrada.");
          saveUnidade({ nome: n });
          setNome(""); setErr("");
        })}
        className="rounded-xl border border-border bg-card p-5 mb-6 grid sm:grid-cols-[1fr_auto] gap-4"
      >
        <Field label="Nova unidade (ex: 101, 202, Cobertura)">
          <input className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <button className={btnPrimary} type="submit">Adicionar</button>
        </div>
        {err && <p className="text-destructive text-sm sm:col-span-2">{err}</p>}
      </form>

      {unidades.length === 0 ? (
        <EmptyState>Nenhuma unidade cadastrada.</EmptyState>
      ) : (
        <ul className="grid sm:grid-cols-3 gap-3">
          {unidades.map((u) => (
            <li key={u.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
              <span className="font-medium">{u.nome}</span>
              <button
                className={btnDanger}
                onClick={() => { if (confirm(`Excluir unidade ${u.nome}?`)) deleteUnidade(u.id); }}
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground mt-6">
        Dica: o nome da unidade é usado nas leituras. Editar um nome aqui não renomeia leituras já lançadas.
      </p>
    </div>
  );
}
