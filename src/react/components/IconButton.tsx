import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../utils.js';
import { Icon } from './Icon.js';

export type IconButtonProps = {
  icon: string;
  className?: string | undefined;
  /** Extra class for the button, e.g. to mark it as a drag handle. */
  handleClass?: string | undefined;
  /** Accessible name; required for a usable button since the icon itself is hidden. */
  label?: string | undefined;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'>;

/** A button showing one icon, named for assistive tech through `label` (or `aria-label`). */
export function IconButton({ icon, className, handleClass, label, ...rest }: IconButtonProps) {
  const name = label ?? rest['aria-label'];
  return (
    <button
      type="button"
      {...rest}
      aria-label={name}
      title={rest.title ?? name}
      className={cx('media-library-button', className, handleClass)}
    >
      <Icon icon={icon} className="media-library-button-icon" />
    </button>
  );
}
