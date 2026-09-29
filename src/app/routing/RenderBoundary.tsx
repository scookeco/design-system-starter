/**
 * A render error boundary: when something inside it throws while rendering (a field registry entry,
 * a page given data it didn't expect), the region shows its fallback instead of the whole app
 * going blank, and the failure is reported through the telemetry sink (src/app/telemetry.ts).
 *
 * RouteView puts one around every routed page, so one broken renderer costs that page, never the
 * shell. The fallback gets `retry`, which renders the region again from scratch; a region that
 * throws again shows the fallback again (and reports again).
 *
 * A page whose code failed to load (a `PageLoadError` from lazyPage) is a different failure with
 * a different fix: retry forgets the failed import, so the page's code is fetched again, and the
 * fallback is told the cause and whether it has happened more than once in a row (then a full
 * reload is the next step: a deploy may have removed the old code). A boundary that unmounts while
 * holding a load failure forgets it too, so coming back to the page loads it afresh.
 *
 * It catches render errors only. Event handlers, effects that fail asynchronously and rejected
 * queries have their own paths (a toast, an error state, a mutation's failure event).
 */
import { Component, Fragment, type ReactNode } from 'react';
import { emit } from '../telemetry';
import { isPageLoadError, type PageLoadError } from './lazyPage';

/** What the fallback is told about the failure. */
export interface RenderFailure {
  /** `load`: the page's code failed to load (a network drop, a deploy). `render`: a renderer threw. */
  cause: 'load' | 'render';
  /** A retry for this same cause failed again: offer the next step (for a load, a full reload), not the same one. */
  repeated: boolean;
}

export interface RenderBoundaryProps {
  /** Where it sits, for the report: a route's path pattern (/records/:id) or a region's name. Never a URL with ids in it. */
  region: string;
  /** What shows in the region's place, with `retry` to render it again, and what failed. */
  fallback: (retry: () => void, failure: RenderFailure) => ReactNode;
  children: ReactNode;
}

type FailureCause = RenderFailure['cause'];

interface RenderBoundaryState {
  /** What failed, while the fallback shows; undefined while the region renders. */
  failed: FailureCause | undefined;
  /** A load failure's error, so retry (or unmounting) can forget it. */
  loadError: PageLoadError | undefined;
  /** The cause the last retry was for: the same cause failing again is `repeated`. */
  retried: FailureCause | undefined;
  /** Bumped by retry, so the region remounts: fresh state, fresh effects. */
  attempt: number;
}

export class RenderBoundary extends Component<RenderBoundaryProps, RenderBoundaryState> {
  override state: RenderBoundaryState = { failed: undefined, loadError: undefined, retried: undefined, attempt: 0 };

  static getDerivedStateFromError(error: unknown): Partial<RenderBoundaryState> {
    return isPageLoadError(error) ? { failed: 'load', loadError: error } : { failed: 'render', loadError: undefined };
  }

  override componentDidCatch(error: unknown) {
    // The error's class, never its message: a message can quote the value that broke it (or a chunk's URL).
    emit({ kind: 'render', phase: 'failure', region: this.props.region, code: error instanceof Error ? error.name : 'unknown' });
  }

  override componentWillUnmount() {
    this.state.loadError?.forget();
  }

  retry = () => {
    this.state.loadError?.forget();
    this.setState(({ failed, attempt }) => ({ failed: undefined, loadError: undefined, retried: failed, attempt: attempt + 1 }));
  };

  override render() {
    const { failed, retried, attempt } = this.state;
    if (failed) return this.props.fallback(this.retry, { cause: failed, repeated: failed === retried });
    return <Fragment key={attempt}>{this.props.children}</Fragment>;
  }
}
