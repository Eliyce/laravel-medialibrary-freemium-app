import { cx } from '../utils.js';

/** SVG path data of the packaged icons, drawn on a 24x24 grid. */
const ICON_PATHS: ReadonlyMap<string, string> = new Map([
  ['add', 'M12 5v14M5 12h14'],
  ['remove', 'M18 6 6 18M6 6l12 12'],
  ['replace', 'M4 4v6h6M20 20v-6h-6M5.6 15a7 7 0 0 0 12.4 2M18.4 9A7 7 0 0 0 6 7'],
  ['download', 'M12 4v12m0 0-5-5m5 5 5-5M4 20h16'],
  ['up', 'M12 19V5m0 0-6 6m6-6 6 6'],
  ['down', 'M12 5v14m0 0-6-6m6 6 6-6'],
  ['drag', 'M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01'],
  ['error', 'M12 8v5m0 3h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z'],
  ['success', 'm5 12 5 5L20 7'],
]);

export interface IconProps {
  icon: string;
  className?: string | undefined;
}

/**
 * Renders one packaged icon inline, so it needs no sprite and adds no ids to the document.
 * Decorative: hidden from assistive tech. An unknown icon renders an empty svg.
 */
export function Icon({ icon, className }: IconProps) {
  const path = ICON_PATHS.get(icon);
  return (
    <svg
      className={cx('media-library-icon', className)}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {path !== undefined && (
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
