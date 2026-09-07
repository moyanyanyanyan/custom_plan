const paths = {
  flask: 'M9 3h6M10 3v7l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3M8 15h8',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  drop: 'M12 3C10 7 5 11 5 15a7 7 0 0 0 14 0c0-4-5-8-7-12zM9 15a3 3 0 0 0 3 3',
  book: 'M12 5v15M12 5C9 3 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-6-1-9 1z',
  clock: 'M12 8v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
  arrow: 'm9 5 7 7-7 7',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  minus: 'M5 12h14',
  power: 'M12 2v9M6 5a9 9 0 1 0 12 0',
  slime: 'M3 17c0-7 3-12 9-12s9 5 9 12c0 3-4 3-5 2-2 2-6 2-8 0-2 1-5 1-5-2zM9 12h.01M15 12h.01',
};

/** 统一线条能让占位图标与后续角色美术保持清晰的信息层级。 */
export function Icon({ name, size = 22 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"
    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[name]} />
  </svg>;
}
