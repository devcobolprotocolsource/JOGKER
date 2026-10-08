export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const destination = index + direction;
  if (index < 0 || destination < 0 || index >= items.length || destination >= items.length)
    return items;
  const reordered = [...items];
  [reordered[index], reordered[destination]] = [reordered[destination]!, reordered[index]!];
  return reordered;
}
