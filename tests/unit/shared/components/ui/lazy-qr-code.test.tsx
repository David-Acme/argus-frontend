import { describe, expect, test } from 'bun:test';
import { render, waitFor } from '@testing-library/react';
import { LazyQrCode } from '@/shared/components/ui/lazy-qr-code';
import { QrCode } from '@/shared/components/ui/qr-code';

const rects = (root: HTMLElement) => root.querySelectorAll('rect').length;

describe('LazyQrCode', () => {
  test('holds its square with the background until the encoder arrives, then draws the code', async () => {
    const drawn = render(<QrCode value="argus://pair/1234" size={120} />);
    const modules = rects(drawn.container);
    drawn.unmount();
    expect(modules).toBeGreaterThan(1);
    const { container } = render(<LazyQrCode value="argus://pair/1234" size={120} />);
    expect(rects(container)).toBe(1);
    await waitFor(() => expect(rects(container)).toBe(modules));
  });
});
