// Helpers para entrada de números no formato brasileiro.
// Aceita "." como separador de milhar e "," como separador decimal.
// Também tolera entrada "limpa" com ponto decimal.
export function parseBR(input: string): number {
  if (input == null) return NaN;
  const s = String(input).trim();
  if (!s) return NaN;
  const hasComma = s.includes(",");
  // Se houver vírgula, "." é separador de milhar e "," é decimal.
  // Sem vírgula, "." pode ser decimal (entrada simples).
  const normalized = hasComma ? s.replace(/\./g, "").replace(",", ".") : s;
  return Number(normalized);
}

export function isValidBRNumber(input: string): boolean {
  const n = parseBR(input);
  return Number.isFinite(n);
}
