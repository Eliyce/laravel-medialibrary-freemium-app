// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MediaLibraryAttachment, MediaLibraryCollection } from '../../src/react/index.js';
import { createManualTransport, flush, makeFile } from '../helpers.js';
import pkg from '../../package.json' with { type: 'json' };

afterEach(cleanup);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const exportsMap = pkg.exports as Record<string, unknown>;
const stylesheetPath = resolve(root, String(exportsMap['./styles.css']));
const css = readFileSync(stylesheetPath, 'utf8');
const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

function selectorClasses(): Set<string> {
  const classes = new Set<string>();
  for (const [, selector] of cssWithoutComments.matchAll(/([^{}]+)\{/g)) {
    for (const [, name] of (selector ?? '').matchAll(/\.([A-Za-z0-9_-]+)/g)) {
      if (name) classes.add(name);
    }
  }
  return classes;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sourceFiles(join(directory, entry.name))
      : entry.name.endsWith('.tsx')
        ? [join(directory, entry.name)]
        : [],
  );
}

describe('styles/media-pro.css (AC-43)', () => {
  const classes = selectorClasses();

  it('is the file the ./styles.css export points to, and is Tailwind @apply source', () => {
    expect(exportsMap['./styles.css']).toBe('./styles/media-pro.css');
    expect(css.trim().length).toBeGreaterThan(0);
    expect(cssWithoutComments).toMatch(/@apply\s+[a-z]/);
    expect(classes.size).toBeGreaterThan(20);
  });

  it('only defines media-library classes', () => {
    for (const name of classes) {
      expect(name === 'media-library' || name.startsWith('media-library-'), name).toBe(true);
    }
  });

  it('lays out .media-library with the errors, items and uploader grid areas', () => {
    const rule = /\.media-library\s*\{([^}]*)\}/.exec(cssWithoutComments)?.[1] ?? '';
    const areas = /grid-template-areas:([^;]*);/.exec(rule)?.[1] ?? '';
    expect(areas).toContain("'errors'");
    expect(areas).toContain("'items'");
    expect(areas).toContain("'uploader'");
    expect(rule).toMatch(/@apply[^;]*\bgrid\b/);
    for (const area of ['errors', 'items', 'uploader']) {
      expect(cssWithoutComments).toContain(`grid-area: ${area};`);
    }
  });

  it('uses no hard-coded colours or custom theme functions', () => {
    expect(cssWithoutComments).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(cssWithoutComments).not.toMatch(/\b(rgb|hsl)a?\(/);
    expect(cssWithoutComments).not.toMatch(/theme\(/);
  });

  it('has a rule for every class name in the React sources', () => {
    const used = new Set<string>();
    for (const file of sourceFiles(join(root, 'src/react'))) {
      const source = readFileSync(file, 'utf8');
      for (const [, name] of source.matchAll(/["'](media-library(?:-[a-z]+)*)["']/g)) {
        if (name) used.add(name);
      }
    }
    expect(used.size).toBeGreaterThan(20);
    const missing = [...used].filter((name) => !classes.has(name));
    expect(missing).toEqual([]);
  });

  it('has a rule for every class the components render', async () => {
    const { transport, pending } = createManualTransport();
    const initialValue = [
      { uuid: 'a', name: 'A', extension: 'png', size: 2048, preview_url: '/a.jpg' },
      { uuid: 'b', name: 'B', extension: 'pdf' },
    ];
    const { container } = render(
      <>
        <MediaLibraryAttachment
          name="avatar"
          initialValue={initialValue.slice(0, 1)}
          editableName
          validationErrors={{ avatar: 'Top', 'avatar.a': 'Item', 'avatar.a.name': 'Name' }}
        />
        <MediaLibraryAttachment name="empty" multiple maxItems={2} />
        <MediaLibraryCollection
          name="images"
          initialValue={initialValue}
          fetch={transport}
          validationRules={{ accept: ['image/*'] }}
        />
      </>,
    );
    const collection = container.querySelector('.media-library-collection')!;
    const input = collection.querySelector<HTMLInputElement>('.media-library-uploader input')!;
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [makeFile('c.png', 'image/png'), makeFile('d.txt', 'text/plain')] },
      });
      await flush();
    });
    act(() => pending[0]!.request.onProgress?.(50));

    const rendered = new Set<string>();
    const collect = () =>
      container.querySelectorAll('[class]').forEach((element) => {
        element
          .getAttribute('class')
          ?.split(/\s+/)
          .forEach((name) => name && rendered.add(name));
      });
    collect();

    const zone = collection.querySelector('.media-library-dropzone')!;
    fireEvent.dragEnter(zone, { dataTransfer: { items: [{ kind: 'file', type: 'text/plain' }] } });
    collect();
    fireEvent.dragLeave(zone);
    fireEvent.dragEnter(zone, { dataTransfer: { items: [{ kind: 'file', type: 'image/png' }] } });
    collect();
    const [first, second] = collection.querySelectorAll('.media-library-item');
    fireEvent.dragStart(first!.querySelector('.media-library-drag-handle')!);
    fireEvent.dragOver(second!);
    collect();

    expect(rendered.has('media-library-progress')).toBe(true);
    expect(rendered.has('media-library-item-drop-target')).toBe(true);
    expect(rendered.has('media-library-dropzone-invalid')).toBe(true);
    const missing = [...rendered].filter((name) => !classes.has(name));
    expect(missing).toEqual([]);
  });
});
