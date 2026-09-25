// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Badge,
  Button,
  Checkbox,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TextField,
} from '../../src/index';

afterEach(cleanup);

describe('Button', () => {
  it('defaults to type="button" and exposes variant and size as data attributes', () => {
    render(<Button variant="danger" size="lg">Delete</Button>);
    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.dataset.variant).toBe('danger');
    expect(button.dataset.size).toBe('lg');
  });

  it('keeps its accessible name while loading and blocks activation without losing focus', () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.hasAttribute('disabled')).toBe(false);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('forwards the UNSAFE_ escape hatch, and only that', () => {
    render(
      <Button UNSAFE_className="legacy-hook" UNSAFE_style={{ order: 1 }}>
        Go
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button.className).toBe('button legacy-hook');
    expect(button.style.order).toBe('1');
  });
});

describe('TextField', () => {
  it('links label, description and error to the input', () => {
    render(<TextField label="Email" description="Work address" error="Enter a valid email" />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const described = (input.getAttribute('aria-describedby') ?? '').split(' ').map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(['Work address', 'Enter a valid email']);
  });
});

describe('Checkbox', () => {
  it('is named by its label and toggles', () => {
    render(<Checkbox label="Include drafts" />);
    const box = screen.getByRole('checkbox', { name: 'Include drafts' });
    expect(box.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(box);
    expect(box.getAttribute('aria-checked')).toBe('true');
  });
});

describe('Badge', () => {
  it('always renders its text, so status is never colour alone', () => {
    render(<Badge tone="danger">Overdue</Badge>);
    expect(screen.getByText('Overdue')).toBeTruthy();
  });
});

describe('Table', () => {
  it('is a named, focusable region with aria-sort on the sorted header only', () => {
    const onSort = vi.fn();
    render(
      <Table caption="Invoices">
        <TableHead>
          <TableRow>
            <TableHeaderCell sort="ascending" onSort={onSort}>
              Name
            </TableHeaderCell>
            <TableHeaderCell numeric>Amount</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell rowHeader>Alpha</TableCell>
            <TableCell numeric>10</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole('region', { name: 'Invoices' }).tabIndex).toBe(0);
    const [name, amount] = screen.getAllByRole('columnheader');
    expect(name?.getAttribute('aria-sort')).toBe('ascending');
    expect(amount?.hasAttribute('aria-sort')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSort).toHaveBeenCalledOnce();
    expect(screen.getByRole('rowheader', { name: 'Alpha' })).toBeTruthy();
  });
});

describe('layout primitives', () => {
  it('map token names to token references, never raw values', () => {
    render(
      <Stack gap="xl" as="section" aria-label="Group">
        <span>child</span>
      </Stack>,
    );
    const section = screen.getByRole('region', { name: 'Group' });
    expect(section.style.getPropertyValue('--stack-gap')).toBe('var(--space-gap-xl)');
  });
});
