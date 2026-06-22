function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function formatStockWithUnit(value?: number | null, unit?: string | null): string {
  const amount = Number(value ?? 0);
  const normalizedUnit = (unit || "unidad").trim().toLowerCase();
  const absAmount = Math.abs(amount);

  if (["gr", "g", "gramo", "gramos"].includes(normalizedUnit)) {
    if (absAmount >= 1000) return `${formatAmount(amount / 1000)} kg`;
    return `${formatAmount(amount)} gr`;
  }

  if (["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(normalizedUnit)) {
    if (absAmount > 0 && absAmount < 1) return `${formatAmount(amount * 1000)} gr`;
    return `${formatAmount(amount)} kg`;
  }

  if (["litro", "litros", "l"].includes(normalizedUnit)) {
    if (absAmount > 0 && absAmount < 1) return `${formatAmount(amount * 1000)} ml`;
    const label = absAmount === 1 ? "litro" : "litros";
    return `${formatAmount(amount)} ${label}`;
  }

  if (["ml", "mililitro", "mililitros"].includes(normalizedUnit)) {
    if (absAmount >= 1000) {
      const litros = amount / 1000;
      const label = Math.abs(litros) === 1 ? "litro" : "litros";
      return `${formatAmount(litros)} ${label}`;
    }
    return `${formatAmount(amount)} ml`;
  }

  const label = normalizedUnit === "unidad" && absAmount !== 1 ? "unidades" : (unit || "unidad");
  return `${formatAmount(amount)} ${label}`;
}
