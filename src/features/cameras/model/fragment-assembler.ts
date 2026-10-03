const BOX_HEADER_BYTES = 8;
const LARGE_BOX_HEADER_BYTES = 16;
const MAX_FRAGMENT_BYTES = 64 * 1024 * 1024;

type BoxSpan = {
  type: string;
  end: number;
};

export class FragmentAssembler {
  private buffer: Uint8Array<ArrayBuffer> = new Uint8Array(0);

  reset(): void {
    this.buffer = new Uint8Array(0);
  }

  pendingBytes(): number {
    return this.buffer.byteLength;
  }

  push(chunk: Uint8Array): Uint8Array<ArrayBuffer>[] {
    this.append(chunk);
    const fragments: Uint8Array<ArrayBuffer>[] = [];
    let offset = 0;
    while (offset < this.buffer.byteLength) {
      const first = this.spanAt(offset);
      if (first === 'incomplete') break;
      if (first === 'corrupt') {
        this.reset();
        return fragments;
      }
      if (first.type !== 'moof') {
        offset = first.end;
        continue;
      }
      const second = this.spanAt(first.end);
      if (second === 'incomplete') break;
      if (second === 'corrupt') {
        this.reset();
        return fragments;
      }
      if (second.type !== 'mdat') {
        offset = first.end;
        continue;
      }
      fragments.push(this.buffer.slice(offset, second.end));
      offset = second.end;
    }
    this.buffer = offset === 0 ? this.buffer : this.buffer.slice(offset);
    return fragments;
  }

  private append(chunk: Uint8Array): void {
    if (this.buffer.byteLength === 0) {
      this.buffer = chunk.slice();
      return;
    }
    const next = new Uint8Array(this.buffer.byteLength + chunk.byteLength);
    next.set(this.buffer, 0);
    next.set(chunk, this.buffer.byteLength);
    this.buffer = next;
  }

  private spanAt(offset: number): BoxSpan | 'incomplete' | 'corrupt' {
    const available = this.buffer.byteLength - offset;
    if (available < BOX_HEADER_BYTES) return 'incomplete';
    const view = new DataView(this.buffer.buffer, this.buffer.byteOffset + offset, available);
    const compact = view.getUint32(0);
    let size = compact;
    let header = BOX_HEADER_BYTES;
    if (compact === 1) {
      if (available < LARGE_BOX_HEADER_BYTES) return 'incomplete';
      size = Number(view.getBigUint64(8));
      header = LARGE_BOX_HEADER_BYTES;
    }
    if (size < header || size > MAX_FRAGMENT_BYTES) return 'corrupt';
    if (available < size) return 'incomplete';
    const type = String.fromCharCode(
      view.getUint8(4),
      view.getUint8(5),
      view.getUint8(6),
      view.getUint8(7),
    );
    return { type, end: offset + size };
  }
}
