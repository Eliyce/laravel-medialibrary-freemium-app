import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import * as reactEntry from '../src/react/index.js';
import pkg from '../package.json' with { type: 'json' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = (file: string): string => readFileSync(resolve(root, 'dist', file), 'utf8');

const REACT_EXPORTS = [
  'MediaLibraryAttachment',
  'MediaLibraryCollection',
  'useMediaLibrary',
  'DropZone',
  'HiddenFields',
  'ItemErrors',
  'ListErrors',
  'Thumb',
  'Uploader',
  'Icons',
  'Icon',
  'IconButton',
];
const CORE_EXPORTS = [
  'MediaLibrary',
  'defaultTranslations',
  'translate',
  'normalizeValue',
  'mapValidationErrors',
  'validateFile',
  'getCsrfHeaders',
  'generateUuid',
];

interface Probe {
  names: Record<string, string[]>;
  resolved: Record<string, string>;
  version: string;
  sharedClass: boolean;
  globals: string[];
}

/** Runs a script in a plain Node process (no DOM), resolving the package by self-reference. */
function probe(kind: 'esm' | 'cjs'): Probe {
  const specifiers = [
    '@eliyce/laravel-medialibrary-freemium-app',
    '@eliyce/laravel-medialibrary-freemium-app/core',
    '@eliyce/laravel-medialibrary-freemium-app/react',
  ];
  const esm = `
    const names = {}, resolved = {}, modules = {};
    for (const s of ${JSON.stringify(specifiers)}) {
      modules[s] = await import(s);
      names[s] = Object.keys(modules[s]).sort();
      resolved[s] = import.meta.resolve(s);
    }
    resolved.css = import.meta.resolve('@eliyce/laravel-medialibrary-freemium-app/styles.css');
    const sharedClass = modules['@eliyce/laravel-medialibrary-freemium-app'].MediaLibrary === modules['@eliyce/laravel-medialibrary-freemium-app/core'].MediaLibrary;
    console.log(JSON.stringify({ names, resolved, version: modules['@eliyce/laravel-medialibrary-freemium-app'].VERSION, sharedClass,
      globals: [typeof window, typeof document] }));`;
  const cjs = `
    const names = {}, resolved = {}, modules = {};
    for (const s of ${JSON.stringify(specifiers)}) {
      modules[s] = require(s);
      names[s] = Object.keys(modules[s]).sort();
      resolved[s] = require.resolve(s);
    }
    resolved.css = require.resolve('@eliyce/laravel-medialibrary-freemium-app/styles.css');
    const sharedClass = modules['@eliyce/laravel-medialibrary-freemium-app'].MediaLibrary === modules['@eliyce/laravel-medialibrary-freemium-app/core'].MediaLibrary;
    console.log(JSON.stringify({ names, resolved, version: modules['@eliyce/laravel-medialibrary-freemium-app'].VERSION, sharedClass,
      globals: [typeof window, typeof document] }));`;
  const args = kind === 'esm' ? ['--input-type=module', '-e', esm] : ['-e', cjs];
  return JSON.parse(execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8' })) as Probe;
}

function relative(url: string): string {
  const path = url.startsWith('file:') ? fileURLToPath(url) : url;
  return path.slice(root.length + 1);
}

beforeAll(() => {
  execFileSync('npm', ['run', 'build', '--silent'], { cwd: root, stdio: 'pipe' });
}, 120_000);

describe('built package', () => {
  it.each(['esm', 'cjs'] as const)(
    'resolves and loads every entry through its exports with %s (AC-65)',
    (kind) => {
      const result = probe(kind);
      const ext = kind === 'esm' ? 'js' : 'cjs';
      expect(result.globals).toEqual(['undefined', 'undefined']);
      expect(relative(result.resolved['@eliyce/laravel-medialibrary-freemium-app']!)).toBe(
        `dist/index.${ext}`,
      );
      expect(relative(result.resolved['@eliyce/laravel-medialibrary-freemium-app/core']!)).toBe(
        `dist/core.${ext}`,
      );
      expect(relative(result.resolved['@eliyce/laravel-medialibrary-freemium-app/react']!)).toBe(
        `dist/react.${ext}`,
      );
      expect(relative(result.resolved.css!)).toBe('styles/media-pro.css');

      expect(result.version).toBe(pkg.version);
      expect(result.sharedClass).toBe(true);
      for (const name of CORE_EXPORTS) {
        expect(result.names['@eliyce/laravel-medialibrary-freemium-app']).toContain(name);
        expect(result.names['@eliyce/laravel-medialibrary-freemium-app/core']).toContain(name);
      }
      expect(result.names['@eliyce/laravel-medialibrary-freemium-app']).toContain('VERSION');
      expect(result.names['@eliyce/laravel-medialibrary-freemium-app/react']).toEqual(
        expect.arrayContaining(REACT_EXPORTS),
      );
      expect(result.names['@eliyce/laravel-medialibrary-freemium-app/react']).not.toContain(
        'default',
      );
    },
  );

  it('ships ESM and CJS declarations for every JS entry (AC-65)', () => {
    for (const entry of ['index', 'core', 'react']) {
      for (const file of [`${entry}.js`, `${entry}.cjs`, `${entry}.d.ts`, `${entry}.d.cts`]) {
        expect(existsSync(resolve(root, 'dist', file)), file).toBe(true);
      }
    }
    expect(pkg.exports['./react'].import.types).toBe('./dist/react.d.ts');
    expect(pkg.exports['./react'].require.types).toBe('./dist/react.d.cts');
  });

  it('keeps react out of the core and "use client" off the core outputs (AC-26)', () => {
    for (const file of ['core.js', 'core.cjs', 'index.js', 'index.cjs']) {
      const code = dist(file);
      expect(code, file).not.toMatch(/from\s+["']react|require\(["']react/);
      expect(code.trimStart().startsWith('"use client"'), file).toBe(false);
      expect(code, file).not.toContain('use client');
    }
  });

  it('marks the react outputs as client modules that reuse the core build (AC-39)', () => {
    const esm = dist('react.js');
    const cjs = dist('react.cjs');
    expect(esm.startsWith('"use client";')).toBe(true);
    expect(cjs.startsWith('"use client";')).toBe(true);

    expect(esm).toMatch(/from\s+"\.\/core\.js"/);
    expect(cjs).toContain('require("./core.cjs")');
    for (const code of [esm, cjs]) {
      expect(code).not.toMatch(/var MediaLibrary = class|class MediaLibrary/);
      expect(code).toMatch(/["']react["']/);
      expect(code).toMatch(/["']react\/jsx-runtime["']/);
      expect(code).not.toMatch(/["']react-dom/);
      expect(code).not.toContain('__CLIENT_INTERNALS');
    }
  });

  it('exposes the React API from the source entry (AC-40)', () => {
    expect(Object.keys(reactEntry).sort()).toEqual([...REACT_EXPORTS].sort());
  });

  it('inlines only the package.json version into the built entries (AC-70, INV-13)', () => {
    const literal = JSON.stringify(pkg.version);
    expect(dist('index.js')).toContain(literal);
    expect(dist('index.cjs')).toContain(literal);

    const leaked = ['devDependencies', '@changesets/cli', 'peerDependenciesMeta', pkg.description];
    for (const entry of ['index', 'core', 'react']) {
      for (const file of [`${entry}.js`, `${entry}.cjs`, `${entry}.d.ts`, `${entry}.d.cts`]) {
        const code = dist(file);
        for (const text of leaked) expect(code, `${file}: ${text}`).not.toContain(text);
      }
    }

    for (const file of ['index.d.ts', 'index.d.cts']) {
      const types = dist(file);
      expect(types, file).toMatch(/declare const VERSION: string;/);
      expect(types, file).not.toContain('package.json');
    }
  });

  it('packs only the build, styles and docs, including the licence (AC-66, AC-71)', () => {
    // --ignore-scripts: beforeAll already built, and `prepare` would print the build log into the JSON.
    const output = execFileSync(
      'npm',
      ['pack', '--dry-run', '--json', '--silent', '--ignore-scripts'],
      {
        cwd: root,
        encoding: 'utf8',
      },
    );
    const [report] = JSON.parse(output) as Array<{ files: Array<{ path: string }> }>;
    const files = report!.files.map((file) => file.path);

    expect(files).toEqual(
      expect.arrayContaining(['package.json', 'styles/media-pro.css', 'LICENSE', 'README.md']),
    );
    for (const file of files) {
      expect(
        /^(package\.json|README\.md|LICENSE|CHANGELOG\.md)$/.test(file) ||
          file.startsWith('dist/') ||
          file.startsWith('styles/'),
        file,
      ).toBe(true);
    }
    expect(files.filter((file) => /^(laravel|src|tests|\.paqad)\//.test(file))).toEqual([]);
    expect(files).not.toContain('composer.json');
  });

  it('declares no runtime dependencies and optional react peers (AC-66)', () => {
    const manifest = pkg as typeof pkg & { dependencies?: Record<string, string> };
    expect(manifest.dependencies).toBeUndefined();
    expect(manifest.peerDependencies).toEqual({ react: '>=18', 'react-dom': '>=18' });
    expect(manifest.peerDependenciesMeta).toEqual({
      react: { optional: true },
      'react-dom': { optional: true },
    });
    expect(manifest.files).toEqual(['dist', 'styles']);
    expect(manifest.sideEffects).toEqual(['**/*.css']);
  });

  it('builds dist/ when installed from git (AC-121)', () => {
    expect(pkg.scripts.prepare).toBe('npm run build');
  });

  it('licenses both packages under MIT to Eliyce (AC-71)', () => {
    const licence = readFileSync(resolve(root, 'LICENSE'), 'utf8');
    expect(licence.startsWith('MIT License\n')).toBe(true);
    expect(licence).toContain('Copyright (c) 2026 Eliyce');
    expect(licence).toContain('Permission is hereby granted, free of charge');
    expect(licence).toContain('THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND');

    expect(pkg.license).toBe('MIT');
    expect(pkg.author).toBe('Eliyce <haider@eliyce.com>');

    const composer = JSON.parse(readFileSync(resolve(root, 'composer.json'), 'utf8')) as {
      license: string;
      authors: Array<{ name: string; email?: string }>;
    };
    expect(composer.license).toBe('MIT');
    expect(composer.authors).toContainEqual({ name: 'Eliyce', email: 'haider@eliyce.com' });
  });
});
