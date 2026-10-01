// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MediaObject } from '../../src/core/index.js';
import {
  DropZone,
  HiddenFields,
  Icon,
  IconButton,
  Icons,
  ItemErrors,
  ListErrors,
  MediaLibraryAttachment,
  MediaLibraryCollection,
  Thumb,
  Uploader,
} from '../../src/react/index.js';
import type { DropZoneRenderProps } from '../../src/react/index.js';
import { makeFile } from '../helpers.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (globalThis as { mediaLibraryTranslations?: unknown }).mediaLibraryTranslations;
});

const settled = { hasFailed: false, isUploading: false, uploadProgress: 100 };

function mediaObject(uuid: string, overrides: Partial<MediaObject> = {}): MediaObject {
  return {
    attributes: { uuid, name: uuid.toUpperCase(), order: 0, custom_properties: {} },
    upload: settled,
    client_validation_errors: [],
    client_id: `client-${uuid}`,
    ...overrides,
  };
}

describe('DropZone (AC-42)', () => {
  it('reports drag state and validity to its children and calls onDrop once', () => {
    const states: DropZoneRenderProps[] = [];
    const onDrop = vi.fn();
    render(
      <DropZone validationAccept={['image/*']} onDrop={onDrop} aria-label="Drop here">
        {(state) => {
          states.push(state);
          return <span>{JSON.stringify(state)}</span>;
        }}
      </DropZone>,
    );
    const zone = screen.getByRole('button', { name: 'Drop here' });
    expect(states.at(-1)).toEqual({ hasDragObject: false, isDropTarget: false, isValid: true });

    fireEvent.dragEnter(zone, { dataTransfer: { items: [{ kind: 'file', type: 'text/plain' }] } });
    expect(states.at(-1)).toEqual({ hasDragObject: true, isDropTarget: true, isValid: false });

    fireEvent.dragLeave(zone);
    expect(states.at(-1)?.hasDragObject).toBe(false);

    fireEvent.dragEnter(zone, { dataTransfer: { items: [{ kind: 'file', type: 'image/png' }] } });
    expect(states.at(-1)).toEqual({ hasDragObject: true, isDropTarget: true, isValid: true });
    fireEvent.dragOver(zone);
    fireEvent.drop(zone, { dataTransfer: { files: [makeFile('a.png', 'image/png')] } });
    expect(onDrop).toHaveBeenCalledOnce();
    expect(states.at(-1)?.hasDragObject).toBe(false);
  });

  it('treats a non-file drag as invalid and an empty or untyped drag as valid', () => {
    const states: DropZoneRenderProps[] = [];
    render(
      <DropZone onDrop={() => undefined} aria-label="zone">
        {(state) => {
          states.push(state);
          return null;
        }}
      </DropZone>,
    );
    const zone = screen.getByRole('button', { name: 'zone' });
    fireEvent.dragEnter(zone, {
      dataTransfer: { items: [{ kind: 'string', type: 'text/plain' }] },
    });
    expect(states.at(-1)?.isValid).toBe(false);
    fireEvent.dragLeave(zone);
    fireEvent.dragEnter(zone, { dataTransfer: { items: [] } });
    expect(states.at(-1)?.isValid).toBe(true);
    fireEvent.dragLeave(zone);
    fireEvent.dragEnter(zone, { dataTransfer: { items: [{ kind: 'file', type: '' }] } });
    expect(states.at(-1)?.isValid).toBe(true);
  });

  it('keeps the drag state while moving over children and supports keyboard activation', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    const onKeyDown = vi.fn();
    const onClick = vi.fn();
    render(
      <DropZone
        onDrop={() => undefined}
        onActivate={onActivate}
        onKeyDown={onKeyDown}
        onClick={onClick}
        aria-label="zone"
      >
        {({ hasDragObject }) => <span data-testid="child">{String(hasDragObject)}</span>}
      </DropZone>,
    );
    const zone = screen.getByRole('button', { name: 'zone' });
    fireEvent.dragEnter(zone);
    fireEvent.dragEnter(screen.getByTestId('child'));
    fireEvent.dragLeave(screen.getByTestId('child'));
    expect(screen.getByTestId('child').textContent).toBe('true');
    fireEvent.dragLeave(zone);
    expect(screen.getByTestId('child').textContent).toBe('false');

    zone.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    await user.keyboard('a');
    await user.click(zone);
    expect(onActivate).toHaveBeenCalledTimes(3);
    expect(onKeyDown).toHaveBeenCalledTimes(3);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('HiddenFields', () => {
  it('renders settled media only, with zero-based order', () => {
    const { container } = render(
      <HiddenFields
        name="docs"
        mediaState={[
          mediaObject('a', { upload: { ...settled, isUploading: true } }),
          mediaObject('b'),
          mediaObject('c', { upload: { ...settled, hasFailed: true } }),
          mediaObject('d', {
            attributes: {
              uuid: 'd',
              name: 'D',
              order: 9,
              custom_properties: { flag: true, count: 2, list: [1, { x: 1 }, null] },
            },
          }),
        ]}
      />,
    );
    const fields = Array.from(container.querySelectorAll('input')).map((input) => [
      input.name,
      input.value,
    ]);
    expect(fields).toEqual([
      ['docs[b][uuid]', 'b'],
      ['docs[b][name]', 'B'],
      ['docs[b][order]', '0'],
      ['docs[d][uuid]', 'd'],
      ['docs[d][name]', 'D'],
      ['docs[d][order]', '1'],
      ['docs[d][custom_properties][flag]', 'true'],
      ['docs[d][custom_properties][count]', '2'],
      ['docs[d][custom_properties][list][]', '1'],
      ['docs[d][custom_properties][list][]', ''],
    ]);
  });
});

describe('ItemErrors and ListErrors', () => {
  it('render nothing without errors', () => {
    const { container } = render(
      <>
        <ItemErrors objectErrors={[]} />
        <ListErrors invalidMedia={[]} onClear={() => undefined} />
      </>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('announce errors with role alert and offer go back and clear', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onClear = vi.fn();
    (globalThis as { mediaLibraryTranslations?: unknown }).mediaLibraryTranslations = {
      goBack: 'Zurück',
      remove: 'Entfernen',
    };
    render(
      <>
        <ItemErrors objectErrors={['Bad', 'Worse']} onBack={onBack} />
        <ListErrors
          invalidMedia={[
            { file: { name: 'x.txt' }, errors: ['Wrong type'] },
            { errors: ['Plain'] },
          ]}
          topLevelErrors={['Too many']}
          onClear={onClear}
        />
      </>,
    );
    const [item, list] = screen.getAllByRole('alert');
    expect(item?.textContent).toContain('BadWorse');
    expect(list?.textContent).toContain('Too many');
    expect(list?.textContent).toContain('x.txtWrong type');
    expect(list?.textContent).toContain('Plain');
    await user.click(screen.getByRole('button', { name: 'Zurück' }));
    await user.click(screen.getByRole('button', { name: 'Entfernen' }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('hides the clear button when only top-level errors exist', () => {
    render(
      <ListErrors invalidMedia={[]} topLevelErrors={['Required']} onClear={() => undefined} />,
    );
    expect(screen.getByRole('alert').textContent).toBe('Required');
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('Thumb', () => {
  it('shows the preview image or the extension, progress, and replaces files', async () => {
    const user = userEvent.setup();
    const onReplace = vi.fn();
    const { rerender } = render(
      <Thumb
        uploadInfo={settled}
        imgProps={{ src: 'https://cdn.test/a.jpg', alt: 'Cat', extension: 'jpg' }}
        validationRules={{ accept: ['image/*'] }}
        onReplace={onReplace}
      />,
    );
    expect(screen.getByRole('img', { name: 'Cat' }).getAttribute('src')).toBe(
      'https://cdn.test/a.jpg',
    );
    const replace = screen.getByLabelText('Replace Cat');
    expect(replace.getAttribute('accept')).toBe('image/*');
    const file = makeFile('dog.png', 'image/png');
    await user.upload(replace, file);
    expect(onReplace).toHaveBeenCalledWith(file);
    fireEvent.change(replace, { target: { files: [] } });
    expect(onReplace).toHaveBeenCalledOnce();

    rerender(
      <Thumb
        uploadInfo={{ hasFailed: false, isUploading: true, uploadProgress: 140 }}
        imgProps={{ src: undefined, alt: 'Doc', extension: 'pdf' }}
        onReplace={onReplace}
      />,
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('pdf')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });
});

describe('Uploader', () => {
  it('labels its input, uses fileTypeHelpText and forwards drops and changes', async () => {
    const user = userEvent.setup();
    const onDrop = vi.fn();
    const onChange = vi.fn();
    const { container } = render(
      <Uploader
        add={false}
        multiple
        maxItems={1}
        validationRules={{ accept: ['image/png'] }}
        fileTypeHelpText="PNG please"
        uploadInfo={{ hasFailed: false, isUploading: true, uploadProgress: 10 }}
        onDrop={onDrop}
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText('Select or drag max 1 file');
    expect(input.getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getByText('PNG please')).toBeTruthy();
    expect(screen.queryByText('image/png')).toBeNull();
    expect(container.querySelector('.media-library-uploader-add')).toBeNull();
    expect(
      container.querySelector('.media-library-uploader svg.media-library-icon path'),
    ).not.toBeNull();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('10');

    await user.upload(input, makeFile('a.png', 'image/png'));
    expect(onChange).toHaveBeenCalledOnce();

    const zone = screen.getByRole('button');
    fireEvent.dragEnter(zone, { dataTransfer: { items: [{ kind: 'file', type: 'image/gif' }] } });
    expect(zone.querySelector('.media-library-dropzone-invalid')).not.toBeNull();
    expect(zone.textContent).toContain('You must upload a file of type');
    fireEvent.dragLeave(zone);
    fireEvent.dragEnter(zone, { dataTransfer: { items: [{ kind: 'file', type: 'image/png' }] } });
    expect(zone.querySelector('.media-library-dropzone-drag')).not.toBeNull();
    expect(zone.textContent).toContain('Drop file to upload');
    fireEvent.drop(zone, { dataTransfer: { files: [] } });
    expect(onDrop).toHaveBeenCalledOnce();
  });

  it('opens the file picker when the drop zone is clicked', async () => {
    const user = userEvent.setup();
    render(<Uploader multiple={false} onDrop={() => undefined} onChange={() => undefined} />);
    const input = screen.getByLabelText('Select or drag files') as HTMLInputElement;
    const click = vi.spyOn(input, 'click').mockImplementation(() => undefined);
    expect(input.hasAttribute('multiple')).toBe(false);
    expect(input.getAttribute('aria-describedby')).toBeNull();
    await user.click(screen.getByRole('button'));
    expect(click).toHaveBeenCalledOnce();
  });
});

describe('Icons, Icon and IconButton', () => {
  it('draws each icon inline without ids, and Icons renders nothing', () => {
    const { container } = render(
      <>
        <Icons />
        <Icon icon="remove" className="extra" />
        <Icon icon="unknown" />
      </>,
    );
    expect(container.querySelector('symbol, use, [id]')).toBeNull();
    const [icon, unknown] = Array.from(container.querySelectorAll('svg.media-library-icon'));
    expect(icon!.getAttribute('class')).toBe('media-library-icon extra');
    expect(icon!.getAttribute('aria-hidden')).toBe('true');
    expect(icon!.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(icon!.querySelector('path')?.getAttribute('d')).toBe('M18 6 6 18M6 6l12 12');
    expect(unknown!.querySelector('path')).toBeNull();
  });

  it('keeps ids unique when several components share one page', () => {
    const { container } = render(
      <>
        <Icons />
        <Icons />
        <MediaLibraryAttachment name="avatar" />
        <MediaLibraryCollection
          name="images"
          initialValue={[{ uuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'A' }]}
        />
        <MediaLibraryCollection name="files" />
      </>,
    );
    expect(container.querySelectorAll('svg.media-library-icon').length).toBeGreaterThan(0);
    const ids = Array.from(container.querySelectorAll('[id]')).map((element) => element.id);
    expect(ids.filter((id) => id.startsWith('media-library-icon-'))).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names the button through label or aria-label and merges classes', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <>
        <IconButton icon="up" label="Up" handleClass="handle" className="x" onClick={onClick} />
        <IconButton icon="down" aria-label="Down" title="Lower" />
      </>,
    );
    const up = screen.getByRole('button', { name: 'Up' });
    expect(up.className).toBe('media-library-button x handle');
    expect(up.getAttribute('type')).toBe('button');
    expect(up.getAttribute('title')).toBe('Up');
    await user.click(up);
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Down' }).getAttribute('title')).toBe('Lower');
  });
});
