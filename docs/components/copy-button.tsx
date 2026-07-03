'use client';

import { Check, Copy } from 'lucide-react';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';

export function CopyButton({ text }: { text: string }) {
  const [checked, onClick] = useCopyButton(() => {
    navigator.clipboard.writeText(text);
  });

  return (
    <button
      onClick={onClick}
      className="rounded p-2 text-fd-muted-foreground transition-colors hover:bg-fd-muted-foreground/10 hover:text-fd-foreground"
      aria-label="Copy to clipboard"
    >
      {checked ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
    </button>
  );
}
