// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ValueItemInput } from '../../src/core/index.js';
import { MediaLibraryCollection } from '../../src/react/index.js';
import type { MediaLibraryViewProps } from '../../src/react/index.js';
import { createAutoTransport, flush, makeFile } from '../helpers.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const items: ValueItemInput[] = [
  { uuid: A, name: 'A', extension: 'png' },
  { uuid: B, name: 'B', extension: 'png' },
  { uuid: C, name: 'C', extension: 'pdf' },
];

function renderedNames(): string[] {
  return Array.from(document.querySelectorAll('.media-library-item .media-library-name')).map(
    (element) => element.textContent ?? '',
  );
}

function hiddenOrders(container: HTMLElement): Array<[string, string]> {
  return Array.from(
    container.querySelectorAll<HTMLInputElement>('input[type="hidden"][name$="[order]"]'),
  ).map((input) => [input.name.slice('images['.length, input.name.indexOf(']')), input.value]);
}

function itemFor(name: string): HTMLElement {
  const element = Array.from(document.querySelectorAll<HTMLElement>('.media-library-item')).find(
    (candidate) => candidate.querySelector('.media-library-name')?.textContent === name,
  );
  if (!element) throw new Error(`No item named ${name}`);
  return element;
}

describe('MediaLibraryCollection', () => {
  it('reorders with the keyboard move buttons and by dragging the handle (AC-32)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <MediaLibraryCollection name="images" initialValue={items} onChange={onChange} />,
    );
    expect(renderedNames()).toEqual(['A', 'B', 'C']);

    screen.getByRole('button', { name: 'Move down A' }).focus();
    await user.keyboard('{Enter}');
    expect(renderedNames()).toEqual(['B', 'A', 'C']);
    expect(hiddenOrders(container)).toEqual([
      [B, '0'],
      [A, '1'],
      [C, '2'],
    ]);
    expect(Object.keys(onChange.mock.lastCall![0])).toEqual([B, A, C]);
    expect(onChange.mock.lastCall![0][B].order).toBe(0);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Move down A' }));

    const handle = itemFor('C').querySelector('.media-library-drag-handle')!;
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(handle, { dataTransfer });
    fireEvent.dragOver(itemFor('B'), { dataTransfer });
    expect(itemFor('B').className).toContain('media-library-item-drop-target');
    fireEvent.drop(itemFor('B'), { dataTransfer });

    expect(renderedNames()).toEqual(['C', 'B', 'A']);
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'C');
    expect(Object.keys(onChange.mock.lastCall![0])).toEqual([C, B, A]);
    expect(document.querySelector('.media-library-item-drop-target')).toBeNull();
  });

  it('disables the move buttons at the ends and ignores drops without a drag', async () => {
    render(<MediaLibraryCollection name="images" initialValue={items} />);
    expect(screen.getByRole('button', { name: 'Move up A' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Move down C' })).toHaveProperty('disabled', true);

    fireEvent.dragOver(itemFor('A'));
    fireEvent.drop(itemFor('A'));
    const handle = itemFor('A').querySelector('.media-library-drag-handle')!;
    fireEvent.dragStart(handle);
    fireEvent.drop(itemFor('A'));
    fireEvent.dragStart(handle);
    fireEvent.dragEnd(handle);
    fireEvent.drop(itemFor('C'));
    expect(renderedNames()).toEqual(['A', 'B', 'C']);
  });

  it('renders no drag handles or move buttons when not sortable (AC-33)', () => {
    render(<MediaLibraryCollection name="images" initialValue={items} sortable={false} />);
    expect(document.querySelectorAll('.media-library-item')).toHaveLength(3);
    expect(document.querySelectorAll('.media-library-drag-handle')).toHaveLength(0);
    expect(document.querySelectorAll('[draggable="true"]')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /Move (up|down)/ })).toBeNull();
  });

  it('renders custom fieldsView and propertiesView (AC-34)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const fieldsView = vi.fn(
      ({
        media,
        getCustomPropertyInputProps,
        getCustomPropertyInputErrors,
      }: MediaLibraryViewProps) => (
        <>
          <label>
            Alt for {media.attributes.name}
            <input {...getCustomPropertyInputProps(media, 'alt')} />
          </label>
          <span>{getCustomPropertyInputErrors(media, 'alt').join(' ')}</span>
        </>
      ),
    );
    const propertiesView = ({ media }: MediaLibraryViewProps) => (
      <span data-testid="details">Details of {media.attributes.name}</span>
    );
    render(
      <MediaLibraryCollection
        name="images"
        initialValue={[items[0]!]}
        fieldsView={fieldsView}
        propertiesView={propertiesView}
        onChange={onChange}
        validationErrors={{ [`images.${A}.custom_properties.alt`]: 'Alt is required' }}
      />,
    );

    const helpers = fieldsView.mock.calls[0]![0];
    expect(Object.keys(helpers).sort()).toEqual(
      [
        'media',
        'getNameInputProps',
        'getNameInputErrors',
        'getCustomPropertyInputProps',
        'getCustomPropertyInputErrors',
      ].sort(),
    );
    expect(screen.getByText(/Alt is required/)).toBeTruthy();

    await user.type(screen.getByLabelText('Alt for A'), 'A cat');
    expect(onChange.mock.lastCall![0][A].custom_properties.alt).toBe('A cat');

    const details = screen.getByTestId('details');
    expect(details.closest('.media-library-properties')).not.toBeNull();
    expect(details.closest('.media-library-fields')).toBeNull();
    expect(screen.queryByLabelText('Name')).toBeNull();
  });

  it('shows an editable name input by default (AC-35)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MediaLibraryCollection
        name="images"
        initialValue={[items[0]!]}
        onChange={onChange}
        validationErrors={{ [`images.${A}.name`]: 'Name is too long' }}
      />,
    );
    const input = screen.getByLabelText('Name');
    expect(input.closest('.media-library-fields')).not.toBeNull();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('Name is too long');

    await user.clear(input);
    await user.type(input, 'Kitten');
    expect(onChange.mock.lastCall![0][A].name).toBe('Kitten');
  });

  it('writes hidden fields for a traditional submit (AC-37)', () => {
    const { container } = render(
      <form>
        <MediaLibraryCollection
          name="images"
          initialValue={[
            {
              uuid: A,
              name: 'Cat',
              order: 0,
              custom_properties: { alt: 'A cat', tags: ['a', 'b'], empty: null, nested: { x: 1 } },
            },
          ]}
        />
      </form>,
    );
    const form = container.querySelector('form')!;
    const data = new FormData(form);
    expect(data.get(`images[${A}][uuid]`)).toBe(A);
    expect(data.get(`images[${A}][name]`)).toBe('Cat');
    expect(data.get(`images[${A}][order]`)).toBe('0');
    expect(data.get(`images[${A}][custom_properties][alt]`)).toBe('A cat');
    expect(data.getAll(`images[${A}][custom_properties][tags][]`)).toEqual(['a', 'b']);
    expect(data.get(`images[${A}][custom_properties][empty]`)).toBe('');
    expect(data.has(`images[${A}][custom_properties][nested]`)).toBe(false);
  });

  it('keeps bracket hidden-field names and maps dot error keys for a bracketed name', () => {
    const { container } = render(
      <form>
        <MediaLibraryCollection
          name="post[images]"
          initialValue={[{ uuid: A, name: 'Cat' }]}
          validationErrors={{
            'post.images': 'Too many images',
            [`post.images.${A}.name`]: 'Name is too long',
          }}
        />
      </form>,
    );
    const data = new FormData(container.querySelector('form')!);
    expect(data.get(`post[images][${A}][uuid]`)).toBe(A);
    expect(data.get(`post[images][${A}][name]`)).toBe('Cat');
    expect(screen.getByText('Too many images')).toBeTruthy();
    expect(within(itemFor('Cat')).getByText('Name is too long')).toBeTruthy();
  });

  it('adds files, shows upload state and leaves uploading items out of the hidden fields', async () => {
    const user = userEvent.setup();
    const transport = createAutoTransport();
    const setMediaLibrary = vi.fn();
    const { container } = render(
      <MediaLibraryCollection
        name="images"
        fetch={transport}
        maxItems={3}
        setMediaLibrary={setMediaLibrary}
        editableName
      />,
    );
    expect(container.querySelector('.media-library-empty')).not.toBeNull();
    await user.upload(screen.getByLabelText('Select or drag max 3 files'), [
      makeFile('one.png', 'image/png'),
      makeFile('two.pdf', 'application/pdf'),
    ]);
    await act(flush);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(screen.getAllByLabelText('Name')).toHaveLength(2);
    expect(within(itemOf(container, 0)).getByText('1 KB · png')).toBeTruthy();
    expect(hiddenOrders(container)).toHaveLength(2);
    expect(setMediaLibrary).toHaveBeenCalledOnce();
  });
});

describe('MediaLibraryCollection item actions', () => {
  it('moves up, replaces, clears errors and removes items', async () => {
    const user = userEvent.setup();
    const transport = createAutoTransport();
    const onChange = vi.fn();
    render(
      <MediaLibraryCollection
        name="images"
        initialValue={items}
        fetch={transport}
        onChange={onChange}
        validationErrors={{ [`images.${B}`]: 'Broken' }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Move up C' }));
    expect(renderedNames()).toEqual(['A', 'C', 'B']);

    const alert = within(itemFor('B')).getByRole('alert');
    expect(alert.textContent).toContain('Broken');
    await user.click(within(alert).getByRole('button', { name: 'Go back' }));
    expect(within(itemFor('B')).queryByRole('alert')).toBeNull();

    await user.upload(screen.getByLabelText('Replace A'), makeFile('fresh.png', 'image/png'));
    await act(flush);
    expect(transport).toHaveBeenCalledOnce();
    expect(renderedNames()).toEqual(['fresh', 'C', 'B']);

    await user.click(screen.getByRole('button', { name: 'Remove C' }));
    expect(renderedNames()).toEqual(['fresh', 'B']);
    expect(Object.keys(onChange.mock.lastCall![0])).toHaveLength(2);
  });

  it('removes a failed upload through Go back', async () => {
    const user = userEvent.setup();
    render(
      <MediaLibraryCollection
        name="images"
        beforeUpload={() => {
          throw new Error('Not today');
        }}
      />,
    );
    await user.upload(
      screen.getByLabelText('Select or drag files'),
      makeFile('a.png', 'image/png'),
    );
    await act(flush);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Not today');
    await user.click(within(alert).getByRole('button', { name: 'Go back' }));
    expect(document.querySelector('.media-library-item')).toBeNull();
  });
});

function itemOf(container: HTMLElement, index: number): HTMLElement {
  const element = container.querySelectorAll<HTMLElement>('.media-library-item')[index];
  if (!element) throw new Error(`No item ${index}`);
  return element;
}
