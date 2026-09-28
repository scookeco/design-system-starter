import type { IconDefinition } from './icons';
import './Icon.css';

/*
 * Draws one icon from the system set (./icons.ts). Icons are decorative (aria-hidden): meaning
 * always comes from adjacent text or an accessible name on the control. It takes the icon as a
 * value, never a name, so a component bundles only the icons it passes here.
 */
export interface IconProps {
  icon: IconDefinition;
  size?: 'sm' | 'md';
}

export function Icon({ icon, size = 'sm' }: IconProps) {
  return (
    <svg className="icon" data-size={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d={icon.path} />
    </svg>
  );
}
