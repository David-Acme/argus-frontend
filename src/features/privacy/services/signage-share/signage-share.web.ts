import type { SignageShareInput, SignageShareOutcome } from '@/features/privacy/model/signage';
import { signageHtml, signageText } from '@/features/privacy/model/signage';

export const SIGNAGE_SHARE_ACTION: 'share' | 'print' = 'print';

const PRINT_SETTLE_MS = 1000;

function printFrame(html: string): boolean {
  if (typeof document === 'undefined') return false;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.srcdoc = html;
  document.body.appendChild(frame);
  const remove = () => setTimeout(() => frame.remove(), PRINT_SETTLE_MS);
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      remove();
    }
  };
  return true;
}

async function copy(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || navigator.clipboard == null) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareSignage({ signage, language }: SignageShareInput): Promise<SignageShareOutcome> {
  try {
    if (printFrame(signageHtml(signage, language))) return 'printed';
  } catch {
    return (await copy(signageText(signage))) ? 'copied' : 'failed';
  }
  return (await copy(signageText(signage))) ? 'copied' : 'failed';
}
