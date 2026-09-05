export function parseRangePercent(range: string): [number, number] {
  const numbers =
    range.match(/[\d.]+/g)?.map(Number).filter((value) => Number.isFinite(value)) ?? [];
  if (numbers.length >= 2) return [numbers[0], numbers[1]];
  if (numbers.length === 1) return [numbers[0], numbers[0]];
  return [7, 10];
}

export function parseNumberRange(text: string, fallback: [number, number]): [number, number] {
  const numbers =
    text.match(/[\d.]+/g)?.map(Number).filter((value) => Number.isFinite(value)) ?? [];
  if (numbers.length >= 2) return [numbers[0], numbers[1]];
  if (numbers.length === 1) return [numbers[0], numbers[0]];
  return fallback;
}

export function formatRange(min: number, max: number, suffix: string): string {
  const format = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
  return min === max ? `${format(min)} ${suffix}` : `${format(min)}-${format(max)} ${suffix}`;
}
