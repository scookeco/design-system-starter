/**
 * A render error boundary: when something inside it throws while rendering (a field registry entry,
 * a page given data it didn't expect), the region shows its fallback instead of the whole app
 * going blank, and the failure is reported through the telemetry sink (src/app/telemetry.ts).
 *
 * RouteView puts one around every routed page, so one broken renderer costs that page, never the
 * shell. The fallback gets `retry`, which renders the region again from scratch; a region that
 * throws again shows the fallback again (and reports again).
 *
 * It catches render errors only. Event handlers, effects that fail asynchronously and rejected
 * queries have their own paths (a toast, an error state, a mutation's failure event).
 */
import { Component, Fragment, type ReactNode } from 'react';
import { emit } from '../telemetry';

export interface RenderBoundaryProps {
  /** Where it sits, for the report: a route's path pattern (/records/:id) or a region's name. Never a URL with ids in it. */
  region: string;
  /** What shows in the region's place, with `retry` to render it again. */
  fallback: (retry: () => void) => ReactNode;
  children: ReactNode;
}

interface RenderBoundaryState {
  failed: boolean;
  /** Bumped by retry, so the region remounts: fresh state, fresh effects. */
  attempt: number;
}

export class RenderBoundary extends Component<RenderBoundaryProps, RenderBoundaryState> {
  override state: RenderBoundaryState = { failed: false, attempt: 0 };

  static getDerivedStateFromError(): Partial<RenderBoundaryState> {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    // The error's class, never its message: a message can quote the value that broke it.
    emit({ kind: 'render', phase: 'failure', region: this.props.region, code: error instanceof Error ? error.name : 'unknown' });
  }

  retry = () => this.setState(({ attempt }) => ({ failed: false, attempt: attempt + 1 }));

  override render() {
    if (this.state.failed) return this.props.fallback(this.retry);
    return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
  }
}
