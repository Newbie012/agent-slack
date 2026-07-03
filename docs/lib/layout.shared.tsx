import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-2.5 font-medium">
          <Image src="/logo.png" alt="Agent Slack logo" width={28} height={28} />
          <span className="text-fd-foreground">agent-slack</span>
        </div>
      ),
      transparentMode: 'top',
    },
    githubUrl: 'https://github.com/Newbie012/agent-slack',
    links: [],
  };
}
