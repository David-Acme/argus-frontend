import { describe, expect, test } from 'bun:test';
import { portraitDataUri } from '../src/shared/libs/portrait-preview';

describe('portraitDataUri', () => {
  test('keeps a server image as an ephemeral data URI without a storage key', () => {
    expect(portraitDataUri({ mimeType: 'image/jpeg', base64: '/9j/' })).toBe(
      'data:image/jpeg;base64,/9j/',
    );
  });

  test('rejects a non-image response before it can reach the detail state', () => {
    expect(portraitDataUri({ mimeType: 'application/json', base64: 'e30=' })).toBeNull();
  });
});
