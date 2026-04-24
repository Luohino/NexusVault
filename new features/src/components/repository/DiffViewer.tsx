type DiffLine = {
  type: 'same' | 'added' | 'removed';
  oldNumber?: number;
  newNumber?: number;
  text: string;
};

const buildDiff = (before = '', after = ''): DiffLine[] => {
  const oldLines = before.split('\n');
  const newLines = after.split('\n');
  const rows = oldLines.length + 1;
  const cols = newLines.length + 1;
  const table = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = oldLines.length - 1; i >= 0; i--) {
    for (let j = newLines.length - 1; j >= 0; j--) {
      table[i][j] = oldLines[i] === newLines[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const diff: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let oldNumber = 1;
  let newNumber = 1;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diff.push({ type: 'same', oldNumber: oldNumber++, newNumber: newNumber++, text: oldLines[i++] });
      j++;
    } else if (j < newLines.length && (i === oldLines.length || table[i][j + 1] >= table[i + 1][j])) {
      diff.push({ type: 'added', newNumber: newNumber++, text: newLines[j++] });
    } else if (i < oldLines.length) {
      diff.push({ type: 'removed', oldNumber: oldNumber++, text: oldLines[i++] });
    }
  }

  return diff;
};

export const DiffViewer = ({ before = '', after = '' }: { before?: string | null; after?: string | null }) => {
  const lines = buildDiff(before || '', after || '');

  return (
    <div className="overflow-auto bg-[#050505] text-xs font-mono">
      {lines.map((line, index) => (
        <div
          key={index}
          className={`grid grid-cols-[52px_52px_28px_minmax(0,1fr)] border-b border-black/40 ${
            line.type === 'added'
              ? 'bg-emerald-950/35 text-emerald-200'
              : line.type === 'removed'
                ? 'bg-red-950/35 text-red-200'
                : 'text-zinc-400'
          }`}
        >
          <span className="px-3 py-1 text-right text-zinc-600 border-r border-black">{line.oldNumber || ''}</span>
          <span className="px-3 py-1 text-right text-zinc-600 border-r border-black">{line.newNumber || ''}</span>
          <span className="px-2 py-1 text-center font-black">
            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
          </span>
          <pre className="px-3 py-1 whitespace-pre-wrap break-words">{line.text || ' '}</pre>
        </div>
      ))}
    </div>
  );
};
