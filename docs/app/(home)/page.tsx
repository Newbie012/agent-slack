import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { CopyButton } from '@/components/copy-button';

export default function HomePage() {
  return (
    <main className="home-page min-h-screen">
      <section className="border-b border-fd-border px-6 py-18 md:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="home-subtle mb-7 text-sm font-medium">
            Agent-readable Slack
          </div>

          <h1 className="max-w-3xl text-3xl font-medium text-fd-foreground md:text-4xl">
            Read Slack from the terminal, inside Slack&apos;s boundary.
          </h1>

          <p className="home-muted mt-6 max-w-3xl text-base leading-7">
            Agent Slack gives operators authenticated Slack reads and gives
            agents structured context they can parse. Read threads, channel
            history, users, files, search results, and raw Web API responses
            without scraping the Slack UI.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/docs/quick-start" className="btn-primary">
              Run the first read
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/docs/reference/output-contract"
              className="btn-secondary"
            >
              View output shapes
            </Link>
          </div>

          <CopyButton
            text={setupPrompt}
            label="Copy setup prompt for your agent"
            copiedLabel="Copied setup prompt"
            className="home-subtle mt-8 inline-flex items-center gap-2 font-mono text-base transition-colors hover:text-fd-foreground"
            iconClassName="h-4 w-4"
          />
        </div>
      </section>

      <GuideSection
        title="What it gives you"
        description="A small set of Slack reads, wrapped for terminal use and agent handoff."
        items={capabilityRoutes}
      />

      <GuideSection
        title="Read like an operator"
        description="Start with a bounded Slack object, keep the payload structured, and stop when the agent has enough context."
        items={operatorRoutes}
      />

      <GuideSection
        title="Common jobs"
        description="These routes match the ways agents usually ask for Slack: a thread, a channel window, a search result, a file, or a lower-level API call."
        items={jobRoutes}
      />

      <section className="border-b border-fd-border px-6 py-14">
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <div>
            <h2 className="text-xl font-medium text-fd-foreground">
              A repeatable read
            </h2>
            <p className="home-muted mt-4 text-[0.9375rem] leading-6">
              Connect a profile, inspect what it can see, then read the Slack
              object your agent needs. Use JSON when one response should stay
              together and NDJSON when each item should move through a pipeline.
            </p>
          </div>
          <DynamicCodeBlock lang="bash" code={quickStart} />
        </div>
      </section>

      <GuideSection
        title="Trust boundaries"
        description="The docs keep auth, scopes, token storage, rate limits, stderr diagnostics, and write gates visible."
        items={boundaryRoutes}
      />

      <section className="px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-xl font-medium text-fd-foreground">
            Slack remains the source of truth.
          </h2>
          <p className="home-muted mt-4 max-w-3xl text-[0.9375rem] leading-6">
            Agent Slack only returns data allowed by the active token, scopes,
            workspace membership, Slack plan, and admin policy. If Slack denies
            a read, the CLI returns a structured error with the recovery path.
          </p>
          <div className="mt-6">
            <Link
              href="/docs/reference/troubleshooting"
              className="text-sm font-medium text-fd-foreground underline underline-offset-4"
            >
              Read troubleshooting
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-fd-border px-6 py-8">
        <div className="home-subtle mx-auto flex max-w-4xl flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>agent-slack</span>
          <span>
            Independent project. Slack is a trademark of Slack Technologies, LLC.
          </span>
        </div>
      </footer>
    </main>
  );
}

function GuideSection({
  title,
  kicker,
  description,
  items,
}: {
  title: string;
  kicker?: string;
  description?: string;
  items: readonly GuideItem[];
}) {
  return (
    <section className="border-b border-fd-border px-6 py-14">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-xl font-medium text-fd-foreground">
              {title}
            </h2>
            {kicker ? (
              <span className="home-subtle text-sm">{kicker}</span>
            ) : null}
          </div>
          {description ? (
            <p className="home-muted mt-4 max-w-3xl text-[0.9375rem] leading-6">
              {description}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-md border border-fd-border p-3.5 transition-colors hover:border-fd-muted-foreground/60 hover:bg-fd-muted/40"
            >
              <h3 className="text-[0.9375rem] font-medium text-fd-foreground">
                {item.title}
              </h3>
              <p className="home-muted mt-2 text-[0.9375rem] leading-6">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

interface GuideItem {
  title: string;
  description: string;
  href: string;
}

const setupPrompt = `Use agent-slack when you need Slack context.

Install it:
npm install -g @eliya-oss/agent-slack

Start with:
agent-slack auth login
agent-slack auth status --json

Read Slack through structured JSON or NDJSON. Keep data on stdout, diagnostics on stderr, and respect Slack scopes and channel permissions.`;

const quickStart = `agent-slack auth login
agent-slack auth status --json
agent-slack thread get --channel C123 --ts 1710000000.000100 --include users,permalinks --json
agent-slack conversation context C123 --since 24h --include users,threads --format ndjson`;

const capabilityRoutes = [
  {
    title: 'Authenticated reads',
    description: 'Use official Slack auth and the permissions your workspace grants.',
    href: '/docs/authentication',
  },
  {
    title: 'Structured output',
    description: 'Return JSON envelopes for inspection or NDJSON for pipelines.',
    href: '/docs/reference/output-contract',
  },
  {
    title: 'Conversation context',
    description: 'Read channels, threads, messages, users, files, and search results.',
    href: '/docs/guides/reading-slack-context',
  },
  {
    title: 'Terminal-first workflow',
    description: 'Keep data on stdout, diagnostics on stderr, and errors parseable.',
    href: '/docs/reference/commands',
  },
] satisfies readonly GuideItem[];

const operatorRoutes = [
  {
    title: 'Start with scope',
    description:
      'Pick the channel, thread, user, time window, or query before pulling data.',
    href: '/docs/guides/reading-slack-context',
  },
  {
    title: 'Follow the thread',
    description: 'Expand replies when the answer depends on order, ownership, or handoff.',
    href: '/docs/guides/reading-slack-context#threads-and-messages',
  },
  {
    title: 'Resolve names',
    description: 'Turn Slack IDs into users and channels before summarizing or routing.',
    href: '/docs/guides/reading-slack-context#users',
  },
  {
    title: 'Preserve shape',
    description: 'Keep Slack objects structured so another agent can parse them safely.',
    href: '/docs/reference/output-contract',
  },
] satisfies readonly GuideItem[];

const jobRoutes = [
  {
    title: 'Inspect a thread',
    description: 'Pull a conversation and replies for incidents, decisions, or open asks.',
    href: '/docs/quick-start',
  },
  {
    title: 'Build a channel window',
    description: 'Read visible history around a time range for a bounded summary.',
    href: '/docs/guides/reading-slack-context#conversations',
  },
  {
    title: 'Search before reading',
    description: 'Find likely channels and timestamps before fetching full context.',
    href: '/docs/guides/reading-slack-context#search',
  },
  {
    title: 'Fetch a file',
    description: 'Inspect metadata and download file content when the token allows it.',
    href: '/docs/guides/reading-slack-context#files',
  },
  {
    title: 'Raw Web API',
    description: 'Call uncommon Slack methods before a first-class wrapper exists.',
    href: '/docs/reference/web-api',
  },
  {
    title: 'Agent recipes',
    description: 'Copy command sequences for summaries, incidents, and handoff.',
    href: '/docs/recipes/agent-workflows',
  },
] satisfies readonly GuideItem[];

const boundaryRoutes = [
  {
    title: 'Profiles and scopes',
    description: 'Inspect what the active profile can read before an agent uses it.',
    href: '/docs/authentication#profiles',
  },
  {
    title: 'Headless auth',
    description: 'Print or write OAuth URLs and hand approval back to a human operator.',
    href: '/docs/recipes/headless-auth',
  },
  {
    title: 'Permission failures',
    description:
      'Recover from missing scopes, inaccessible channels, bad payloads, and rate limits.',
    href: '/docs/reference/troubleshooting',
  },
  {
    title: 'Write gates',
    description: 'Keep unsafe Web API methods behind explicit operator opt-in.',
    href: '/docs/reference/web-api#unsafe-methods',
  },
] satisfies readonly GuideItem[];
