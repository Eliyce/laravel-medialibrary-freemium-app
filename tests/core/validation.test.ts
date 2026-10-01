import { describe, expect, it } from 'vitest';
import { describeAccept, resolveTranslations, validateFile } from '../../src/core/index.js';
import { makeFile } from '../helpers.js';

const t = resolveTranslations();
const KB = 1024;

describe('validateFile', () => {
  it('matches exact mime types and wildcards (AC-3)', () => {
    const rules = { accept: ['image/*', 'application/pdf'] };
    expect(validateFile(makeFile('a.png', 'image/png'), rules, t)).toEqual([]);
    expect(validateFile(makeFile('a.pdf', 'application/pdf'), rules, t)).toEqual([]);
    expect(validateFile(makeFile('a.PDF', 'APPLICATION/PDF'), rules, t)).toEqual([]);

    const errors = validateFile(makeFile('a.txt', 'text/plain'), rules, t);
    expect(errors).toEqual([`${t.fileTypeNotAllowed} any image, application/pdf`]);
  });

  it('matches extension entries against the file name, case-insensitively', () => {
    const rules = { accept: ['.pdf', '.TAR.GZ'] };
    expect(validateFile(makeFile('report.pdf', 'application/pdf'), rules, t)).toEqual([]);
    expect(validateFile(makeFile('REPORT.PDF', ''), rules, t)).toEqual([]);
    expect(validateFile(makeFile('backup.tar.gz', 'application/gzip'), rules, t)).toEqual([]);
    expect(validateFile(makeFile('notes.txt', 'text/plain'), rules, t)).toEqual([
      `${t.fileTypeNotAllowed} .pdf, .TAR.GZ`,
    ]);
    expect(validateFile(makeFile('pdf', ''), rules, t)).toHaveLength(1);
    expect(validateFile(makeFile('a.pdf', 'application/pdf'), { accept: ['.'] }, t)).toHaveLength(
      1,
    );
  });

  it('infers the mime type from the extension when the browser reports none', () => {
    const rules = { accept: ['image/*', 'application/pdf'] };
    expect(validateFile(makeFile('photo.HEIC', ''), rules, t)).toEqual([]);
    expect(validateFile(makeFile('scan.pdf', ''), rules, t)).toEqual([]);
    expect(validateFile(makeFile('data.csv', ''), rules, t)).toHaveLength(1);
    expect(validateFile(makeFile('archive.unknownext', ''), rules, t)).toHaveLength(1);
    expect(validateFile(makeFile('constructor', ''), rules, t)).toHaveLength(1);
    expect(validateFile(makeFile('clip.mov', ''), { accept: ['video/quicktime'] }, t)).toEqual([]);
  });

  it('rejects a file without a type when accept is set, and accepts anything without accept', () => {
    expect(validateFile(makeFile('blob', ''), { accept: ['image/*'] }, t)).toHaveLength(1);
    expect(validateFile(makeFile('blob', ''), {}, t)).toEqual([]);
    expect(validateFile(makeFile('blob', ''), { accept: [] }, t)).toEqual([]);
    expect(validateFile(makeFile('a.bin', 'x/y'), { accept: ['*/*'] }, t)).toEqual([]);
  });

  it('treats min and max size as inclusive bounds in KB (AC-4)', () => {
    const rules = { minSizeInKB: 10, maxSizeInKB: 100 };
    expect(validateFile(makeFile('5.png', 'image/png', 5 * KB), rules, t)).toEqual([
      `${t.tooSmall} 10 KB`,
    ]);
    expect(validateFile(makeFile('10.png', 'image/png', 10 * KB), rules, t)).toEqual([]);
    expect(validateFile(makeFile('100.png', 'image/png', 100 * KB), rules, t)).toEqual([]);
    expect(validateFile(makeFile('101.png', 'image/png', 100 * KB + 1), rules, t)).toEqual([
      `${t.tooLarge} 100 KB`,
    ]);
    expect(validateFile(makeFile('200.png', 'image/png', 200 * KB), rules, t)).toEqual([
      `${t.tooLarge} 100 KB`,
    ]);
  });

  it('reports every failing rule and uses the default translations when none are passed', () => {
    const errors = validateFile(makeFile('a.txt', 'text/plain', 0), {
      accept: ['image/png'],
      minSizeInKB: 1,
    });
    expect(errors).toEqual([
      'You must upload a file of type image/png',
      'File too small, min 1 KB',
    ]);
  });

  it('accepts file-like objects and rejects anything else', () => {
    expect(
      validateFile({ name: 'x.png', size: 1, type: 'image/png' }, { accept: ['image/*'] }),
    ).toEqual([]);
    expect(() => validateFile(null as never)).toThrow(TypeError);
    expect(() => validateFile({ name: 'x' } as never)).toThrow(TypeError);
    expect(() => validateFile(makeFile('a', 'b'), null as never)).toThrow(TypeError);
  });
});

describe('describeAccept', () => {
  it('names image and video wildcards in words', () => {
    expect(describeAccept(['image/*', 'video/*', ' application/pdf '], t)).toBe(
      'any image, any video, application/pdf',
    );
  });
});
