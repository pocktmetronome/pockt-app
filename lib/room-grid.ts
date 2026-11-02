export type SectionRow<T> = {
  items: T[];
  centered: boolean;
};

/** Two-column rows. A leftover odd item stays the same width and centers. */
export function sectionRows<T>(ids: readonly T[], columns = 2): SectionRow<T>[] {
  const width = Math.max(1, Math.floor(columns));
  const rows: SectionRow<T>[] = [];
  for (let i = 0; i < ids.length; i += width) {
    const items = ids.slice(i, i + width);
    rows.push({
      items: [...items],
      centered: items.length > 0 && items.length < width,
    });
  }
  return rows;
}

export function isCenteredOddRow<T>(row: SectionRow<T>, columns = 2): boolean {
  return row.centered && row.items.length > 0 && row.items.length < columns;
}
