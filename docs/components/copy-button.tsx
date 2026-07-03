'use client';

import { Check, Copy } from 'lucide-react';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';

export function CopyButton({
  text,
  label,
  copiedLabel = 'Copied',
  className = 'rounded p-2 text-fd-muted-foreground transition-colors hover:bg-fd-muted-foreground/10 hover:text-fd-foreground',
  iconClassName = 'h-5 w-5',
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  iconClassName?: string;
}) {
  const [checked, onClick] = useCopyButton(() => {
    navigator.clipboard.writeText(text);
  });

  return (
    <button
      onClick={onClick}
      className={className}
      aria-label="Copy to clipboard"
    >
      {checked ? (
        <Check className={iconClassName} />
      ) : (
        <Copy className={iconClassName} />
      )}
      {label ? <span>{checked ? copiedLabel : label}</span> : null}
    </button>
  );
}
