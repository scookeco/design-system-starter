import { useState, type ComponentPropsWithRef } from 'react';
import { cx, type Closed } from '../../internal/closed-api';
import './Avatar.css';

export type AvatarSize = 'sm' | 'md' | 'lg';

export type AvatarProps = Closed<Omit<ComponentPropsWithRef<'span'>, 'children' | 'role'>> & {
  /** The person's name: the accessible name, and the source of the initials fallback. Required. */
  name: string;
  /** Photo URL. Falls back to initials when absent or when it fails to load. */
  src?: string;
  size?: AvatarSize;
  /** Hide from assistive tech when the name is already visible beside the avatar. */
  decorative?: boolean;
};

/** Up to two initials: first and last word. Code-point safe. */
export const initialsOf = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ? Array.from(words[0])[0] : '';
  const last = words.length > 1 ? Array.from(words[words.length - 1] ?? '')[0] : '';
  return `${first ?? ''}${last ?? ''}`.toLocaleUpperCase();
};

export function Avatar({ name, src, size = 'md', decorative = false, UNSAFE_className, UNSAFE_style, ...rest }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>();
  const showImage = Boolean(src) && failedSrc !== src;
  return (
    <span
      {...rest}
      className={cx('avatar', UNSAFE_className)}
      style={UNSAFE_style}
      data-size={size}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
    >
      {showImage ? (
        <img className="avatar__image" src={src} alt="" onError={() => setFailedSrc(src)} />
      ) : (
        <span className="avatar__initials" aria-hidden="true">
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}
