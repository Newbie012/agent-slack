import Link from 'next/link';

export const metadata = {
  title: 'Privacy',
  description: 'Privacy details for agent-slack and its Slack OAuth relay.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <article className="mx-auto max-w-3xl">
        <h1>Privacy</h1>
        <p>
          agent-slack is a local CLI. Slack tokens are stored on your machine
          and are not sent to this relay.
        </p>

        <h2>OAuth relay</h2>
        <p>
          This site receives Slack OAuth callback parameters and immediately
          forwards them to the local CLI callback on your machine.
        </p>

        <h2>Stored data</h2>
        <p>
          The relay does not store Slack messages, files, tokens, workspace
          data, or user data.
        </p>

        <h2>Slack access</h2>
        <p>
          The CLI can access only the Slack data allowed by your approved
          scopes, workspace policy, and channel membership.
        </p>

        <h2>Contact</h2>
        <p>
          For questions, use{' '}
          <Link href="https://github.com/Newbie012/agent-slack/issues">
            GitHub Issues
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
