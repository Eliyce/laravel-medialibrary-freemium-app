export interface ProgressBarProps {
  progress: number;
  label: string;
}

/** Upload progress, exposed to assistive tech as a progressbar with `aria-valuenow`. */
export function ProgressBar({ progress, label }: ProgressBarProps) {
  const value = Math.min(100, Math.max(0, Math.round(progress)));
  return (
    <div
      className="media-library-progress-wrap"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span className="media-library-progress" style={{ width: `${value}%` }} />
    </div>
  );
}
