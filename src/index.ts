/**
 * Public entry point of the design system. Consumers import from here only;
 * deep imports into components/, primitives/ or layouts/ are blocked by lint.
 *
 * The stylesheet import comes first so the cascade layer order is declared
 * before any component stylesheet joins a layer.
 */
import './styles/index.css';

export * from './primitives';
export * from './components';
export * from './layouts';
export { vars } from './tokens/tokens';
export type { GapToken, InsetToken, ContentWidthToken, SidebarWidthToken, GridItemToken, ScrollRegionToken } from './tokens/tokens';
export type { EscapeHatch } from './internal/closed-api';
