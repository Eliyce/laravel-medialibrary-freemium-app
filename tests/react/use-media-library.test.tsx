// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaLibrary } from '../../src/core/index.js';
import type { ValueItemInput } from '../../src/core/index.js';
import { useMediaLibrary } from '../../src/react/index.js';
import type { UseMediaLibraryParams } from '../../src/react/index.js';
import { createAutoTransport, createManualTransport, flush, makeFile } from '../helpers.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const initialMedia: ValueItemInput[] = [
  { uuid: 'u-1', name: 'One', preview_url: 'https://cdn.test/1.jpg', extension: 'jpg' },
  { uuid: 'u-2', name: 'Two', custom_properties: { alt: 'Second' } },
];

const MEMBERS = [
  'mediaLibrary',
  'state',
  'isReadyToSubmit',
  'hasUploadsInProgress',
  'getImgProps',
  'getNameInputProps',
  'getNameInputErrors',
  'getCustomPropertyInputProps',
  'getCustomPropertyInputErrors',
  'getFileInputProps',
  'getDropZoneProps',
  'addFile',
  'removeMedia',
  'setOrder',
  'setProperty',
  'setCustomProperty',
  'replaceMedia',
  'getErrors',
  'clearObjectErrors',
  'clearInvalidMedia',
];

describe('useMediaLibrary', () => {
  it('returns the full hook surface and treats initialMedia like initialValue (AC-27)', () => {
    const { result } = renderHook(() => useMediaLibrary({ name: 'images', initialMedia }));
    const viaInitialValue = new MediaLibrary({ name: 'images', initialValue: initialMedia });

    expect(Object.keys(result.current).sort()).toEqual([...MEMBERS].sort());
    expect(result.current.mediaLibrary).toBeInstanceOf(MediaLibrary);
    expect(result.current.mediaLibrary.getValue()).toEqual(viaInitialValue.getValue());
    expect(result.current.state.media.map((object) => object.attributes)).toEqual(
      viaInitialValue.getState().media.map((object) => object.attributes),
    );
    expect(result.current.isReadyToSubmit).toBe(true);
    expect(result.current.hasUploadsInProgress).toBe(false);
  });

  it('keeps one instance across renders, follows validationErrors and destroys on unmount (AC-28)', () => {
    const destroy = vi.spyOn(MediaLibrary.prototype, 'destroy');
    const { result, rerender, unmount } = renderHook(
      (props: UseMediaLibraryParams) => useMediaLibrary(props),
      { initialProps: { name: 'images', initialMedia } as UseMediaLibraryParams },
    );
    const first = result.current.mediaLibrary;

    rerender({ name: 'images', initialMedia, validationErrors: { 'images.u-1': 'Too big' } });
    expect(result.current.mediaLibrary).toBe(first);
    expect(result.current.getErrors(result.current.state.media[0]!)).toEqual(['Too big']);

    rerender({ name: 'images', initialMedia, validationErrors: { 'images.u-2.name': ['Name!'] } });
    expect(result.current.mediaLibrary).toBe(first);
    expect(result.current.getErrors(result.current.state.media[0]!)).toEqual([]);
    expect(result.current.getNameInputErrors(result.current.state.media[1]!)).toEqual(['Name!']);

    expect(destroy).not.toHaveBeenCalled();
    unmount();
    expect(destroy).toHaveBeenCalledOnce();
    expect(first.isDestroyed).toBe(true);
  });

  it('recovers from the StrictMode effect double-run with a live instance', () => {
    let library: MediaLibrary | undefined;
    function Probe() {
      library = useMediaLibrary({ name: 'images', initialMedia }).mediaLibrary;
      return null;
    }
    render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    );
    expect(library?.isDestroyed).toBe(false);
    expect(library?.getState().media).toHaveLength(2);
  });

  it('builds input props that write back to the library', () => {
    const { result } = renderHook(() =>
      useMediaLibrary({
        name: 'images',
        initialMedia,
        validationErrors: { 'images.u-2.custom_properties.alt': 'Alt!' },
      }),
    );
    const [one, two] = result.current.state.media as [never, never];

    expect(result.current.getImgProps(one)).toEqual({
      src: 'https://cdn.test/1.jpg',
      alt: 'One',
      extension: 'jpg',
    });
    expect(result.current.getImgProps(two)).toEqual({
      src: undefined,
      alt: 'Two',
      extension: undefined,
    });

    const nameProps = result.current.getNameInputProps(one);
    expect(nameProps.value).toBe('One');
    expect(nameProps['aria-invalid']).toBe(false);
    act(() => nameProps.onChange({ target: { value: 'Uno' } } as never));
    expect(result.current.mediaLibrary.getValue()['u-1']?.name).toBe('Uno');

    const altProps = result.current.getCustomPropertyInputProps(two, 'alt');
    expect(altProps.value).toBe('Second');
    expect(altProps['aria-invalid']).toBe(true);
    expect(result.current.getCustomPropertyInputErrors(two, 'alt')).toEqual(['Alt!']);
    expect(result.current.getCustomPropertyInputProps(two, 'missing').value).toBe('');
    act(() => altProps.onChange({ target: { value: 'Zwei' } } as never));
    expect(result.current.mediaLibrary.getValue()['u-2']?.custom_properties.alt).toBe('Zwei');
  });

  it('adds files from the file input and drop zone, and replaces through an item', async () => {
    const transport = createAutoTransport();
    const { result } = renderHook(() =>
      useMediaLibrary({
        name: 'images',
        fetch: transport,
        validationRules: { accept: ['image/png', 'image/jpeg'] },
      }),
    );
    const inputProps = result.current.getFileInputProps();
    expect(inputProps).toMatchObject({
      type: 'file',
      multiple: true,
      accept: 'image/png,image/jpeg',
    });

    const target = { files: [makeFile('a.png', 'image/png')], value: 'C:\\fakepath\\a.png' };
    await act(async () => {
      inputProps.onChange({ target } as never);
      await flush();
    });
    expect(target.value).toBe('');
    await act(async () => {
      result.current.getDropZoneProps().onDrop({
        dataTransfer: { files: [makeFile('b.png', 'image/png')] },
      } as never);
      await flush();
    });
    expect(result.current.state.media.map((object) => object.attributes.file_name)).toEqual([
      'a.png',
      'b.png',
    ]);

    const first = result.current.state.media[0]!;
    expect(result.current.getFileInputProps(first).multiple).toBe(false);
    await act(async () => {
      result.current.getFileInputProps(first).onChange({
        target: { files: [makeFile('c.png', 'image/png')], value: '' },
      } as never);
      result.current.getDropZoneProps(first).onDrop({ dataTransfer: { files: [] } } as never);
      await flush();
    });
    expect(result.current.state.media[0]?.attributes.file_name).toBe('c.png');
    expect(result.current.state.media[0]?.client_id).toBe(first.client_id);
  });

  it('reports uploads in progress and readiness, and calls the latest callbacks', async () => {
    const { transport, pending } = createManualTransport();
    const first = vi.fn();
    const latest = vi.fn();
    const { result, rerender } = renderHook(
      (props: UseMediaLibraryParams) => useMediaLibrary(props),
      { initialProps: { name: 'images', fetch: transport, onChange: first } },
    );
    rerender({ name: 'images', fetch: transport, onChange: latest });

    await act(async () => {
      result.current.addFile(makeFile('a.png', 'image/png'));
      await flush();
    });
    expect(result.current.hasUploadsInProgress).toBe(true);
    expect(result.current.isReadyToSubmit).toBe(false);

    await act(async () => {
      pending[0]!.succeed();
      await flush();
    });
    expect(result.current.hasUploadsInProgress).toBe(false);
    expect(result.current.isReadyToSubmit).toBe(true);
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledOnce();

    const object = result.current.state.media[0]!;
    act(() => {
      result.current.setCustomProperty(object, 'alt', 'x');
      result.current.setProperty(object, 'attributes.name', 'n');
      result.current.setOrder([object.attributes.uuid]);
    });
    expect(result.current.mediaLibrary.getValue()[object.attributes.uuid]).toMatchObject({
      name: 'n',
      custom_properties: { alt: 'x' },
    });
    act(() => result.current.clearObjectErrors(object));
    act(() => result.current.clearInvalidMedia());
    act(() => result.current.removeMedia(object));
    expect(result.current.state.media).toEqual([]);
  });
});
