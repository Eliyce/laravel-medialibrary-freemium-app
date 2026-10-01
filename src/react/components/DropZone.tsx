import { useRef, useState } from 'react';
import type { DragEvent, HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { validateFile } from '../../core/index.js';
import { cx } from '../utils.js';

export interface DropZoneRenderProps {
  /** Something is being dragged over the zone. */
  hasDragObject: boolean;
  /** The zone is the current drop target. */
  isDropTarget: boolean;
  /** Every dragged file matches `validationAccept` (unknown types count as valid). */
  isValid: boolean;
}

export type DropZoneProps = {
  validationAccept?: string[] | undefined;
  children: (props: DropZoneRenderProps) => ReactNode;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  /** Called when the zone is clicked or activated with Enter or Space (open the file picker). */
  onActivate?: (() => void) | undefined;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onDrop'>;

const IDLE: DropZoneRenderProps = { hasDragObject: false, isDropTarget: false, isValid: true };

function isAccepted(type: string, accept: string[] | undefined): boolean {
  if (!accept || accept.length === 0 || type === '') return true;
  return validateFile({ name: '', size: 0, type }, { accept }).length === 0;
}

function dragIsValid(event: DragEvent<HTMLDivElement>, accept: string[] | undefined): boolean {
  const items = Array.from(event.dataTransfer?.items ?? []);
  if (items.length === 0) return true;
  const files = items.filter((item) => item.kind === 'file');
  if (files.length === 0) return false;
  return files.every((item) => isAccepted(item.type, accept));
}

/** A keyboard-operable drop target (`role="button"`) that reports the drag state to children. */
export function DropZone({
  validationAccept,
  children,
  onDrop,
  onActivate,
  className,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onClick,
  onKeyDown,
  ...rest
}: DropZoneProps) {
  const [drag, setDrag] = useState<DropZoneRenderProps>(IDLE);
  const depth = useRef(0);

  const handleDragEnter = (event: DragEvent<HTMLDivElement>): void => {
    onDragEnter?.(event);
    event.preventDefault();
    depth.current += 1;
    setDrag({
      hasDragObject: true,
      isDropTarget: true,
      isValid: dragIsValid(event, validationAccept),
    });
  };
  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    onDragOver?.(event);
    event.preventDefault();
  };
  const handleDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    onDragLeave?.(event);
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDrag(IDLE);
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    depth.current = 0;
    setDrag(IDLE);
    onDrop(event);
  };
  const handleClick = (event: MouseEvent<HTMLDivElement>): void => {
    onClick?.(event);
    onActivate?.();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      {...rest}
      className={cx('media-library-dropzone', className)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {children(drag)}
    </div>
  );
}
