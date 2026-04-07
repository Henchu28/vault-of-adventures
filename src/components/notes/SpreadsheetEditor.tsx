import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';

interface SpreadsheetEditorProps {
  content: string;
  onChange: (csv: string) => void;
  editable?: boolean;
}

const ROWS = 20;
const COLS = 10;

function parseCSV(csv: string): string[][] {
  if (!csv) {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(''));
  }
  const rows = csv.split('\n').map(r => r.split('\t'));
  // Pad to minimum size
  while (rows.length < ROWS) rows.push(Array(COLS).fill(''));
  return rows.map(r => {
    while (r.length < COLS) r.push('');
    return r;
  });
}

function toCSV(data: string[][]): string {
  return data.map(r => r.join('\t')).join('\n');
}

const colLabel = (i: number) => String.fromCharCode(65 + i);

export function SpreadsheetEditor({ content, onChange, editable = true }: SpreadsheetEditorProps) {
  const [data, setData] = useState<string[][]>(() => parseCSV(content));

  useEffect(() => {
    setData(parseCSV(content));
  }, [content]);

  const handleCellChange = useCallback((row: number, col: number, value: string) => {
    setData(prev => {
      const next = prev.map(r => [...r]);
      next[row][col] = value;
      onChange(toCSV(next));
      return next;
    });
  }, [onChange]);

  return (
    <div className="border border-border rounded-lg overflow-auto max-h-[500px]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky top-0 bg-muted border border-border w-10 text-xs text-muted-foreground">#</th>
            {Array.from({ length: COLS }, (_, i) => (
              <th key={i} className="sticky top-0 bg-muted border border-border px-2 py-1 text-xs font-medium text-muted-foreground min-w-[100px]">
                {colLabel(i)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri}>
              <td className="bg-muted border border-border text-center text-xs text-muted-foreground py-1">{ri + 1}</td>
              {row.map((cell, ci) => (
                <td key={ci} className="border border-border p-0">
                  <Input
                    value={cell}
                    onChange={e => handleCellChange(ri, ci, e.target.value)}
                    disabled={!editable}
                    className="border-0 rounded-none h-7 text-xs bg-transparent focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
