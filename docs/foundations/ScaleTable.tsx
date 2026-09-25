import type { CSSProperties, ReactNode } from 'react';
import { Stack, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text } from '../../src/index';
import { scaleGroup, type VarEntry } from './tokens';

/**
 * One token group as a table: name, resolved value, a live preview painted with the
 * token's var(), and its "use for" note from the token source.
 */
export function ScaleTable({
  caption,
  entries,
  preview,
}: {
  caption: string;
  entries: VarEntry[];
  preview?: (ref: string, path: string) => ReactNode;
}) {
  const { note, rows } = scaleGroup(entries);
  return (
    <Stack gap="xs">
      {note ? <Text tone="muted">{note}</Text> : null}
      <Table caption={caption}>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Token</TableHeaderCell>
            <TableHeaderCell>Value</TableHeaderCell>
            {preview ? <TableHeaderCell>Preview</TableHeaderCell> : null}
            {rows.some((r) => r.note) ? <TableHeaderCell>Use for</TableHeaderCell> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.path}>
              <TableCell rowHeader>
                <code>{row.ref.slice(4, -1)}</code>
              </TableCell>
              <TableCell>
                <code>{row.value}</code>
              </TableCell>
              {preview ? <TableCell>{preview(row.ref, row.path)}</TableCell> : null}
              {rows.some((r) => r.note) ? <TableCell>{row.note}</TableCell> : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}

/** Pass a token reference to docs.css as a custom property. */
export const docsVar = (name: `--docs-${string}`, ref: string) => ({ [name]: ref }) as CSSProperties;
