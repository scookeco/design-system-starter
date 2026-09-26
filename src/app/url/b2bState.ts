/**
 * URL state for the inbox and the audit log: what a copied link must reproduce. Every value is
 * validated here and falls back to its default, like the list page's codec.
 *
 *   /inbox?view=archived&item=acme-i004
 *   /admin/audit?actor=acme-p02&action=member.role_changed,member.removed&from=2026-09-01&to=2026-09-25&page=2
 */
import { AUDIT_ACTIONS, type AuditAction } from '../api/admin';
import { INBOX_VIEWS, type InboxView } from '../api/inbox';
import type { UrlCodec } from './useUrlState';

export interface InboxUrlState {
  view: InboxView;
  /** The open item's id, or '' for none. */
  item: string;
}

export const inboxCodec: UrlCodec<InboxUrlState> = {
  parse: (search) => {
    const params = new URLSearchParams(search);
    const view = params.get('view');
    return { view: (INBOX_VIEWS as readonly (string | null)[]).includes(view) ? (view as InboxView) : 'inbox', item: (params.get('item') ?? '').slice(0, 64) };
  },
  serialise: (state) => {
    const params = new URLSearchParams();
    if (state.view !== 'inbox') params.set('view', state.view);
    if (state.item) params.set('item', state.item);
    return params.toString();
  },
};

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface AuditUrlState {
  actor: string;
  actions: readonly AuditAction[];
  /** Calendar dates (ISO), both or neither. The page turns them into instants in the reader's time zone. */
  from: string;
  to: string;
  page: number;
}

export const AUDIT_DEFAULTS: AuditUrlState = { actor: '', actions: [], from: '', to: '', page: 1 };

export const auditCodec: UrlCodec<AuditUrlState> = {
  parse: (search) => {
    const params = new URLSearchParams(search);
    const asked = new Set((params.get('action') ?? '').split(','));
    const from = params.get('from') ?? '';
    const to = params.get('to') ?? '';
    const range = CALENDAR_DATE.test(from) && CALENDAR_DATE.test(to) && from <= to;
    const page = Number(params.get('page') ?? '');
    return {
      actor: (params.get('actor') ?? '').slice(0, 64),
      actions: AUDIT_ACTIONS.filter((a) => asked.has(a)),
      from: range ? from : '',
      to: range ? to : '',
      page: Number.isInteger(page) && page >= 1 ? page : 1,
    };
  },
  serialise: (state) => {
    const params = new URLSearchParams();
    if (state.actor) params.set('actor', state.actor);
    if (state.actions.length > 0) params.set('action', state.actions.join(','));
    if (state.from && state.to) {
      params.set('from', state.from);
      params.set('to', state.to);
    }
    if (state.page !== 1) params.set('page', String(state.page));
    return params.toString().replaceAll('%2C', ',');
  },
};

/** The members page: ?invite=1 opens the invite dialog (the command palette's "Invite member" links here). */
export const membersCodec: UrlCodec<{ invite: boolean }> = {
  parse: (search) => ({ invite: new URLSearchParams(search).get('invite') === '1' }),
  serialise: (state) => (state.invite ? 'invite=1' : ''),
};
