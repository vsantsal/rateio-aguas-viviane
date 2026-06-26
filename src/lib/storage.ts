// Local-only persistence layer (localStorage). No backend.
export type Conta = {
  id: string;
  mesReferencia: string; // YYYY-MM
  volumeFaturado: number; // m³
  valorFaturado: number; // R$
};

export type Leitura = {
  id: string;
  mesReferencia: string; // YYYY-MM
  unidade: string;
  volumeConsumido: number; // m³
};

export type Unidade = { id: string; nome: string };

const K = {
  contas: "viviane.contas.v1",
  leituras: "viviane.leituras.v1",
  unidades: "viviane.unidades.v1",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("viviane:store-change", { detail: key }));
}

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`) as string;

// ------------------- Unidades -------------------
const DEFAULT_UNIDADES: Unidade[] = [
  { id: uid(), nome: "101" },
  { id: uid(), nome: "102" },
  { id: uid(), nome: "201" },
  { id: uid(), nome: "202" },
  { id: uid(), nome: "301" },
];

export function listUnidades(): Unidade[] {
  const arr = read<Unidade[]>(K.unidades, []);
  if (arr.length === 0) {
    write(K.unidades, DEFAULT_UNIDADES);
    return DEFAULT_UNIDADES;
  }
  return arr;
}
export function saveUnidade(u: Omit<Unidade, "id"> & { id?: string }): Unidade {
  const all = listUnidades();
  if (u.id) {
    const i = all.findIndex((x) => x.id === u.id);
    if (i >= 0) all[i] = { ...all[i], ...u } as Unidade;
  } else {
    all.push({ id: uid(), nome: u.nome });
  }
  write(K.unidades, all);
  return all[all.length - 1];
}
export function deleteUnidade(id: string) {
  write(
    K.unidades,
    listUnidades().filter((u) => u.id !== id),
  );
}

// ------------------- Contas -------------------
export function listContas(): Conta[] {
  return read<Conta[]>(K.contas, []).sort((a, b) =>
    b.mesReferencia.localeCompare(a.mesReferencia),
  );
}
export function saveConta(c: Omit<Conta, "id"> & { id?: string }): Conta {
  const all = read<Conta[]>(K.contas, []);
  if (c.id) {
    const i = all.findIndex((x) => x.id === c.id);
    if (i >= 0) all[i] = { ...all[i], ...c } as Conta;
  } else {
    all.push({ ...c, id: uid() } as Conta);
  }
  write(K.contas, all);
  return all[all.length - 1];
}
export function deleteConta(id: string) {
  write(
    K.contas,
    read<Conta[]>(K.contas, []).filter((c) => c.id !== id),
  );
}

// ------------------- Leituras -------------------
export function listLeituras(): Leitura[] {
  return read<Leitura[]>(K.leituras, []).sort(
    (a, b) =>
      b.mesReferencia.localeCompare(a.mesReferencia) ||
      a.unidade.localeCompare(b.unidade),
  );
}
export function saveLeitura(l: Omit<Leitura, "id"> & { id?: string }): Leitura {
  const all = read<Leitura[]>(K.leituras, []);
  if (l.id) {
    const i = all.findIndex((x) => x.id === l.id);
    if (i >= 0) all[i] = { ...all[i], ...l } as Leitura;
  } else {
    all.push({ ...l, id: uid() } as Leitura);
  }
  write(K.leituras, all);
  return all[all.length - 1];
}
export function deleteLeitura(id: string) {
  write(
    K.leituras,
    read<Leitura[]>(K.leituras, []).filter((l) => l.id !== id),
  );
}

// Subscribe to store changes for reactive UI
export function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("viviane:store-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("viviane:store-change", handler);
    window.removeEventListener("storage", handler);
  };
}
