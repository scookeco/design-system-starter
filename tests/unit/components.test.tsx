// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AppShell,
  Avatar,
  Badge,
  Banner,
  Breadcrumbs,
  Button,
  Checkbox,
  EmptyState,
  Nav,
  NavTabs,
  PageLayout,
  RadioGroup,
  Select,
  Skeleton,
  Spinner,
  Switch,
  Textarea,
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

describe('Nav', () => {
  it('is a labelled landmark that marks the current page with aria-current, and names its groups', () => {
    render(
      <Nav
        label="Settings"
        current="/settings/profile"
        sections={[{ label: 'Personal', items: [{ label: 'Profile', href: '/settings/profile' }, { label: 'Alerts', href: '/settings/alerts' }] }]}
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Personal' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Profile' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Alerts' }).hasAttribute('aria-current')).toBe(false);
  });

  it('hands plain clicks to onNavigate', () => {
    const onNavigate = vi.fn();
    render(<Nav label="Main" onNavigate={onNavigate} sections={[{ items: [{ label: 'Home', href: '/home' }] }]} />);
    fireEvent.click(screen.getByRole('link', { name: 'Home' }));
    expect(onNavigate).toHaveBeenCalledWith('/home');
  });
});

describe('Breadcrumbs', () => {
  it('links every ancestor and marks the current page as plain text', () => {
    render(<Breadcrumbs items={[{ label: 'Records', href: '/records' }]} current="Hardware lease" />);
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(trail.querySelector('[aria-current="page"]')?.textContent).toBe('Hardware lease');
    expect(screen.getByRole('link', { name: 'Records' }).getAttribute('href')).toBe('/records');
  });
});

describe('Avatar', () => {
  it('is an image named by the person, showing initials, and falls back to initials when the photo fails', () => {
    render(<Avatar name="Sam de la Rivera" src="/missing.png" />);
    const avatar = screen.getByRole('img', { name: 'Sam de la Rivera' });
    const photo = avatar.querySelector('img');
    expect(photo).toBeTruthy();
    fireEvent.error(photo as HTMLImageElement);
    expect(avatar.textContent).toBe('SR');
  });

  it('is hidden from assistive tech when decorative', () => {
    render(<Avatar name="Sam Rivera" decorative />);
    expect(screen.queryByRole('img')).toBeNull();
  });
});

describe('AppShell', () => {
  it('renders the landmarks, a skip link first, and a main that takes focus', () => {
    render(
      <AppShell brand="Acme" nav={<Nav label="Main" sections={[{ items: [{ label: 'Home', href: '/home' }] }]} />}>
        <p>Page</p>
      </AppShell>,
    );
    const main = screen.getByRole('main');
    expect(main.textContent).toBe('Page');
    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeTruthy();
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(document.querySelector('a, button')).toBe(skip);
    fireEvent.click(skip);
    expect(document.activeElement).toBe(main);
  });

  it('toggles the collapsed sidebar, moves focus into it on open, and returns focus on Escape', () => {
    render(
      <AppShell brand="Acme" nav={<Nav label="Main" sections={[{ items: [{ label: 'Home', href: '/home' }] }]} />}>
        <p>Page</p>
      </AppShell>,
    );
    const toggle = screen.getByRole('button', { name: 'Menu' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(toggle.getAttribute('aria-controls') ?? '')).toBeTruthy();
    const home = screen.getByRole('link', { name: 'Home' });
    expect(document.activeElement).toBe(home);
    fireEvent.keyDown(home, { key: 'Escape' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });
});

describe('Banner', () => {
  it.each([
    ['danger', 'alert'],
    ['warning', 'alert'],
    ['info', 'status'],
    ['success', 'status'],
  ] as const)('announces a %s banner as role=%s, with an icon beside the text', (tone, role) => {
    render(<Banner tone={tone}>Sync is failing.</Banner>);
    const banner = screen.getByRole(role);
    expect(banner.textContent).toBe('Sync is failing.');
    expect(banner.querySelector('svg')).toBeTruthy();
  });

  it('drops the live role when focus will carry it instead, and dismisses by name', () => {
    const onDismiss = vi.fn();
    render(
      <Banner tone="danger" announce={false} onDismiss={onDismiss}>
        Fix 2 fields.
      </Banner>,
    );
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe('EmptyState', () => {
  it('exposes its reason and titles the region with a heading', () => {
    render(<EmptyState reason="no-results" title="No records match" headingLevel={3} />);
    const heading = screen.getByRole('heading', { level: 3, name: 'No records match' });
    expect(heading.closest('[data-reason]')?.getAttribute('data-reason')).toBe('no-results');
  });
});

describe('Spinner', () => {
  it('is a named status when standalone and decorative otherwise', () => {
    render(<Spinner label="Loading records" />);
    expect(screen.getByRole('status').textContent).toBe('Loading records');
    cleanup();
    const { container } = render(<Spinner />);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('inside a loading Button stays decorative, so the name is the label', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('Skeleton', () => {
  it('is hidden from assistive tech in every shape', () => {
    const { container } = render(
      <>
        <Skeleton lines={2} />
        <Skeleton shape="block" />
        <table>
          <tbody>
            <Skeleton shape="table-row" columns={3} />
          </tbody>
        </table>
      </>,
    );
    const shapes = container.querySelectorAll('.skeleton');
    expect(shapes).toHaveLength(3);
    shapes.forEach((shape) => expect(shape.getAttribute('aria-hidden')).toBe('true'));
    expect(container.querySelectorAll('tr.skeleton td')).toHaveLength(3);
  });
});

describe('Field-based controls', () => {
  it('take a consumer id for error-summary links, and wire errors with aria-invalid and aria-describedby', () => {
    render(
      <>
        <TextField id="name" label="Name" error="Enter a name." />
        <Textarea id="notes" label="Notes" error="Too long." />
        <Select id="owner" label="Owner" options={[{ value: 'a', label: 'A' }]} error="Choose one." />
        <RadioGroup id="renewal" label="Renewal" options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} error="Choose one." />
      </>,
    );
    for (const [id, message] of [
      ['name', 'Enter a name.'],
      ['notes', 'Too long.'],
      ['owner', 'Choose one.'],
    ] as const) {
      const control = document.getElementById(id);
      expect(control?.getAttribute('aria-invalid'), id).toBe('true');
      expect(document.getElementById(control?.getAttribute('aria-describedby') ?? '')?.textContent).toBe(message);
    }
    const group = screen.getByRole('radiogroup', { name: 'Renewal' });
    expect(group.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById('renewal')).toBe(screen.getByRole('radio', { name: 'A' }));
  });
});

describe('Switch', () => {
  it('is a named switch that toggles', () => {
    render(<Switch label="Weekly digest" description="Every Monday." />);
    const control = screen.getByRole('switch', { name: 'Weekly digest' });
    expect(control.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(control);
    expect(control.getAttribute('aria-checked')).toBe('true');
    expect(document.getElementById(control.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Every Monday.');
  });
});

describe('PageLayout', () => {
  it('names the aside landmark and adds no landmark around the nav slot', () => {
    render(
      <PageLayout nav={<Nav label="Settings" sections={[{ items: [{ label: 'Profile', href: '/p' }] }]} />} aside={<p>Owner</p>} asideLabel="Properties">
        <p>Main</p>
      </PageLayout>,
    );
    expect(screen.getByRole('complementary', { name: 'Properties' }).textContent).toBe('Owner');
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(screen.queryByRole('main')).toBeNull();
  });
});

describe('NavTabs', () => {
  it('is a labelled nav of links with aria-current on the current section, not a tablist', () => {
    const onNavigate = vi.fn();
    render(
      <NavTabs
        label="Record sections"
        current="/r/1/files"
        onNavigate={onNavigate}
        items={[
          { label: 'Overview', href: '/r/1' },
          { label: 'Files', href: '/r/1/files' },
        ]}
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Record sections' })).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByRole('link', { name: 'Files' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Overview' }).hasAttribute('aria-current')).toBe(false);
    fireEvent.click(screen.getByRole('link', { name: 'Overview' }));
    expect(onNavigate).toHaveBeenCalledWith('/r/1');
  });
});
