// Export/Import de backup em JSON — persistência manual do usuário.
import type { Conta, Leitura, Unidade } from "./storage";

export type Backup = {
  app: "aguas-viviane";
  version: 1;
  exportedAt: string; // ISO
  contas: Conta[];
  leituras: Leitura[];
  unidades: Unidade[];
};

const K = {
  contas: "viviane.contas.v1",
  leituras: "viviane.leituras.v2",
  unidades: "viviane.unidades.v2",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function buildBackup(): Backup {
  return {
    app: "aguas-viviane",
    version: 1,
    exportedAt: new Date().toISOString(),
    contas: read<Conta[]>(K.contas, []),
    leituras: read<Leitura[]>(K.leituras, []),
    unidades: read<Unidade[]>(K.unidades, []),
  };
}

export function downloadBackup() {
  const data = buildBackup();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `aguas-viviane-backup-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type ImportMode = "replace" | "merge";
export type ImportResult = {
  contas: number;
  leituras: number;
  unidades: number;
  skipped: { contas: number; leituras: number; unidades: number };
};

function isBackup(x: unknown): x is Backup {
  if (!x || typeof x !== "object") return false;
  const b = x as Partial<Backup>;
  return (
    b.app === "aguas-viviane" &&
    Array.isArray(b.contas) &&
    Array.isArray(b.leituras) &&
    Array.isArray(b.unidades)
  );
}

function write<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("viviane:store-change", { detail: key }));
}

export async function importBackupFromFile(
  file: File,
  mode: ImportMode,
): Promise<ImportResult> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Arquivo não é um JSON válido.");
  }
  if (!isBackup(parsed)) {
    throw new Error("Arquivo não parece um backup do Águas do Viviane.");
  }
  const backup = parsed;

  const skipped = { contas: 0, leituras: 0, unidades: 0 };

  if (mode === "replace") {
    write(K.contas, backup.contas);
    write(K.leituras, backup.leituras);
    write(K.unidades, backup.unidades);
    return {
      contas: backup.contas.length,
      leituras: backup.leituras.length,
      unidades: backup.unidades.length,
      skipped,
    };
  }

  // merge: mantém dados atuais; adiciona somente o que não conflita.
  const curContas = read<Conta[]>(K.contas, []);
  const curLeituras = read<Leitura[]>(K.leituras, []);
  const curUnidades = read<Unidade[]>(K.unidades, []);

  const contaKey = (c: Conta) => c.mesReferencia;
  const leituraKey = (l: Leitura) => `${l.mesReferencia}::${l.unidade}`;
  const unidadeKey = (u: Unidade) => u.nome;

  const contasSet = new Set(curContas.map(contaKey));
  const leiturasSet = new Set(curLeituras.map(leituraKey));
  const unidadesSet = new Set(curUnidades.map(unidadeKey));

  let addedContas = 0;
  let addedLeituras = 0;
  let addedUnidades = 0;

  for (const c of backup.contas) {
    if (contasSet.has(contaKey(c))) skipped.contas++;
    else {
      curContas.push(c);
      contasSet.add(contaKey(c));
      addedContas++;
    }
  }
  for (const l of backup.leituras) {
    if (leiturasSet.has(leituraKey(l))) skipped.leituras++;
    else {
      curLeituras.push(l);
      leiturasSet.add(leituraKey(l));
      addedLeituras++;
    }
  }
  for (const u of backup.unidades) {
    if (unidadesSet.has(unidadeKey(u))) skipped.unidades++;
    else {
      curUnidades.push(u);
      unidadesSet.add(unidadeKey(u));
      addedUnidades++;
    }
  }

  write(K.contas, curContas);
  write(K.leituras, curLeituras);
  write(K.unidades, curUnidades);

  return {
    contas: addedContas,
    leituras: addedLeituras,
    unidades: addedUnidades,
    skipped,
  };
}
