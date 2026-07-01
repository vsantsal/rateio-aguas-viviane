import { useRef, useState } from "react";
import {
  downloadBackup,
  importBackupFromFile,
  type ImportMode,
  type ImportResult,
} from "@/lib/backup";
import { btnGhost, btnPrimary } from "@/components/ui-bits";

export function BackupPanel() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [err, setErr] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setErr("");
    setResult(null);
    if (
      mode === "replace" &&
      !confirm(
        "Substituir apagará todos os dados atuais (contas, leituras e unidades) e usará somente o que estiver no arquivo. Continuar?",
      )
    ) {
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setBusy(true);
    try {
      const r = await importBackupFromFile(file, mode);
      setResult(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao importar backup.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <h2 className="text-xl font-display">Backup em JSON</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Os dados ficam salvos apenas neste navegador. Exporte um arquivo para
        guardar em outro lugar (Drive, e-mail) ou usar em outro dispositivo.
      </p>

      <div className="flex flex-wrap gap-2 items-center">
        <button className={btnPrimary} onClick={() => downloadBackup()}>
          Exportar backup
        </button>
        <button
          className={btnGhost}
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? "Importando..." : "Importar backup"}
        </button>
        <label className="text-sm text-muted-foreground ml-2 flex items-center gap-2">
          <span>Modo:</span>
          <select
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as ImportMode)}
          >
            <option value="merge">Mesclar (mantém atuais)</option>
            <option value="replace">Substituir tudo</option>
          </select>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>

      {err && <p className="text-destructive text-sm mt-3">{err}</p>}
      {result && (
        <div className="text-sm text-muted-foreground mt-3 space-y-1">
          <p>
            Importado — contas: <strong>{result.contas}</strong>, leituras:{" "}
            <strong>{result.leituras}</strong>, unidades:{" "}
            <strong>{result.unidades}</strong>.
          </p>
          {(result.skipped.contas > 0 ||
            result.skipped.leituras > 0 ||
            result.skipped.unidades > 0) && (
            <p>
              Ignorados por já existirem — contas: {result.skipped.contas},
              leituras: {result.skipped.leituras}, unidades:{" "}
              {result.skipped.unidades}.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
