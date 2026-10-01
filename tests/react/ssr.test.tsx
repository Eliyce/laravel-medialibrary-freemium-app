import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  MediaLibraryAttachment,
  MediaLibraryCollection,
  useMediaLibrary,
} from '../../src/react/index.js';

const initialValue = [
  { uuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Cat', preview_url: '/cat.jpg' },
  { uuid: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Doc', extension: 'pdf' },
];

describe('server rendering (AC-38)', () => {
  it('runs without window or document', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });

  it('renders the Attachment and the Collection to HTML', () => {
    const html = renderToString(
      <form>
        <MediaLibraryAttachment
          name="avatar"
          initialValue={initialValue.slice(0, 1)}
          editableName
        />
        <MediaLibraryCollection
          name="images"
          initialValue={initialValue}
          validationErrors={{ images: 'Too many' }}
        />
      </form>,
    );
    expect(html).toContain('class="media-library media-library-single"');
    expect(html).toContain('media-library-collection');
    expect(html).toContain('src="/cat.jpg"');
    expect(html).toContain('name="images[bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb][order]" value="1"');
    expect(html).toContain('Too many');
  });

  it('renders a custom component built on the hook', () => {
    function Custom() {
      const { state, getImgProps } = useMediaLibrary({
        name: 'images',
        initialMedia: initialValue,
      });
      return (
        <ul>
          {state.media.map((object) => (
            <li key={object.client_id}>{getImgProps(object).alt}</li>
          ))}
        </ul>
      );
    }
    expect(renderToString(<Custom />)).toBe('<ul><li>Cat</li><li>Doc</li></ul>');
  });
});
