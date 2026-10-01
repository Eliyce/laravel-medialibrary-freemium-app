// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaLibrary } from '../../src/core/index.js';
import type { AfterUploadResult, MediaValue } from '../../src/core/index.js';
import { MediaLibraryAttachment } from '../../src/react/index.js';
import { createAutoTransport, createManualTransport, flush, makeFile } from '../helpers.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const U = '6f1c0b8e-6a46-4a8b-9c2f-0f8f7f0a1b2c';
const avatar = [{ uuid: U, name: 'Me', file_name: 'me.png', extension: 'png', size: 2048 }];

function item(): HTMLElement {
  const element = document.querySelector<HTMLElement>('.media-library-item');
  if (!element) throw new Error('No media item rendered');
  return element;
}

function hiddenUuidInputs(container: HTMLElement, name: string): HTMLInputElement[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>('input[type="hidden"]')).filter(
    (input) => input.name.startsWith(`${name}[`) && input.name.endsWith('][uuid]'),
  );
}

describe('MediaLibraryAttachment', () => {
  it('accepts every documented prop and hands out the instance (AC-29)', async () => {
    const setMediaLibrary = vi.fn<(library: MediaLibrary) => void>();
    const beforeUpload = vi.fn((file: File) => file);
    const afterUpload = vi.fn((result: AfterUploadResult) => result);
    const onChange = vi.fn((value: MediaValue) => value);
    const onIsReadyToSubmitChange = vi.fn((ready: boolean) => ready);

    render(
      <MediaLibraryAttachment
        name="avatar"
        initialValue={avatar}
        routePrefix="media-library-pro"
        uploadDomain="https://files.example.com"
        validationRules={{ accept: ['image/*'], minSizeInKB: 1, maxSizeInKB: 1024 }}
        validationErrors={{ avatar: 'Required' }}
        errors={{ avatar: 'Ignored' }}
        multiple={false}
        maxItems={1}
        vapor={false}
        vaporSignedStorageUrl="vapor/signed-storage-url"
        maxSizeForPreviewInBytes={1024}
        translations={{ remove: 'Delete' }}
        fileTypeHelpText="Images only"
        setMediaLibrary={setMediaLibrary}
        beforeUpload={beforeUpload}
        afterUpload={afterUpload}
        onChange={onChange}
        onIsReadyToSubmitChange={onIsReadyToSubmitChange}
        editableName={false}
      />,
    );
    await act(flush);

    expect(setMediaLibrary).toHaveBeenCalledWith(expect.any(MediaLibrary));
    const library = setMediaLibrary.mock.calls[0]![0];
    expect(library.config.uploadDomain).toBe('https://files.example.com');
    expect(screen.getByText('Images only')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete Me' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Required');
  });

  it('replaces the single item when another file is picked (AC-30)', async () => {
    const user = userEvent.setup();
    const transport = createAutoTransport();
    const { container } = render(
      <MediaLibraryAttachment name="avatar" initialValue={avatar} fetch={transport} />,
    );
    expect(hiddenUuidInputs(container, 'avatar').map((input) => input.value)).toEqual([U]);

    const input = screen.getByLabelText('Select or drag files');
    expect(input.getAttribute('type')).toBe('file');
    await user.upload(input, makeFile('new.png', 'image/png'));
    await act(flush);

    expect(transport).toHaveBeenCalledOnce();
    const uuids = hiddenUuidInputs(container, 'avatar');
    expect(uuids).toHaveLength(1);
    expect(uuids[0]?.value).not.toBe(U);
    expect(document.querySelectorAll('.media-library-item')).toHaveLength(1);
    expect(screen.getByText('new')).toBeTruthy();
  });

  it('shows the max-items help text and reports overflow in the list errors (AC-31)', async () => {
    const user = userEvent.setup();
    const transport = createAutoTransport();
    render(<MediaLibraryAttachment name="files" multiple maxItems={2} fetch={transport} />);

    expect(screen.getByText('Select or drag max 2 files')).toBeTruthy();
    const input = screen.getByLabelText('Select or drag max 2 files');
    await user.upload(input, [makeFile('a.png', 'image/png'), makeFile('b.png', 'image/png')]);
    await act(flush);
    expect(screen.queryByRole('alert')).toBeNull();

    await user.upload(input, makeFile('c.png', 'image/png'));
    await act(flush);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('media-library-listerrors');
    expect(alert.textContent).toContain('c.png');
    expect(alert.textContent).toContain('Select or drag max 2 files');
    expect(transport).toHaveBeenCalledTimes(2);

    await user.click(within(alert).getByRole('button', { name: 'Remove' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows Inertia `errors` per item and prefers validationErrors (AC-36)', () => {
    const { rerender } = render(
      <MediaLibraryAttachment
        name="avatar"
        initialValue={avatar}
        errors={{ [`avatar.${U}`]: 'Too big' }}
      />,
    );
    expect(within(item()).getByRole('alert').textContent).toContain('Too big');

    rerender(
      <MediaLibraryAttachment
        name="avatar"
        initialValue={avatar}
        errors={{ [`avatar.${U}`]: 'Too big' }}
        validationErrors={{ [`avatar.${U}`]: ['Wrong type'] }}
      />,
    );
    const alert = within(item()).getByRole('alert');
    expect(alert.textContent).toContain('Wrong type');
    expect(alert.textContent).not.toContain('Too big');

    fireEvent.click(within(alert).getByRole('button', { name: 'Go back' }));
    expect(within(item()).queryByRole('alert')).toBeNull();
  });

  it('is accessible: labelled input, keyboard drop zone, progressbar and alerts (AC-41)', async () => {
    const user = userEvent.setup();
    const { transport, pending } = createManualTransport();
    render(
      <MediaLibraryAttachment
        name="avatar"
        fetch={transport}
        validationRules={{ accept: ['image/*'] }}
      />,
    );

    const input = screen.getByLabelText('Select or drag files') as HTMLInputElement;
    const click = vi.spyOn(input, 'click').mockImplementation(() => undefined);
    const dropZone = screen.getByRole('button', { name: /Select or drag files/ });
    expect(dropZone.getAttribute('tabindex')).toBe('0');
    dropZone.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(click).toHaveBeenCalledTimes(2);
    expect(input.getAttribute('accept')).toBe('image/*');
    expect(screen.getByText('any image')).toBeTruthy();

    await user.upload(input, makeFile('cat.png', 'image/png'));
    await act(flush);
    act(() => pending[0]!.request.onProgress?.(42));
    const progress = screen.getByRole('progressbar');
    expect(progress.getAttribute('aria-valuenow')).toBe('42');
    expect(progress.getAttribute('aria-label')).toBe('Uploading cat');

    await act(async () => {
      pending[0]!.respond({ status: 422, body: { errors: { file: ['The file is too big.'] } } });
      await flush();
    });
    expect(screen.queryByRole('progressbar')).toBeNull();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('The file is too big.');

    await user.click(within(alert).getByRole('button', { name: 'Go back' }));
    expect(document.querySelector('.media-library-item')).toBeNull();
  });

  it('renders an editable name, removes items and replaces through the thumb', async () => {
    const user = userEvent.setup();
    const transport = createAutoTransport();
    const onChange = vi.fn();
    render(
      <MediaLibraryAttachment
        name="avatar"
        initialValue={avatar}
        editableName
        fetch={transport}
        onChange={onChange}
      />,
    );
    const name = screen.getByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'You');
    expect(onChange).toHaveBeenLastCalledWith({ [U]: expect.objectContaining({ name: 'You' }) });

    await user.upload(screen.getByLabelText('Replace You'), makeFile('other.jpg', 'image/jpeg'));
    await act(flush);
    expect(transport).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'other');

    await user.click(screen.getByRole('button', { name: 'Remove other' }));
    expect(document.querySelector('.media-library-item')).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith({});
  });
});
