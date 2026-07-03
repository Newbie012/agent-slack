import Link from 'next/link';

export const metadata = {
  title: 'Support',
  description: 'Support information for agent-slack.',
};

export default function SupportPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <article className="mx-auto max-w-3xl">
        <h1>Support</h1>
        <p>
          For bugs, setup help, and feature requests, open an issue on GitHub.
        </p>
        <p>
          <Link href="https://github.com/Newbie012/agent-slack/issues">
            github.com/Newbie012/agent-slack/issues
          </Link>
        </p>
      </article>
    </main>
  );
}
