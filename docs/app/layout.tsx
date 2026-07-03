import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Geist, Geist_Mono } from 'next/font/google';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(
    (() => {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.VERCEL_URL ??
        'http://localhost:8000';
      return siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
    })(),
  ),
  title: {
    default: 'agent-slack',
    template: '%s | agent-slack',
  },
  description:
    'A command-line tool that gives agents structured Slack context through JSON, NDJSON, and a safe Slack Web API escape hatch.',
  openGraph: {
    type: 'website',
    siteName: 'agent-slack',
    images: '/og',
  },
  twitter: {
    card: 'summary_large_image',
    images: '/og',
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen antialiased">
        <RootProvider
          theme={{
            defaultTheme: 'dark',
            attribute: 'class',
            enableSystem: true,
          }}
        >
          {children}
        </RootProvider>
        <Analytics />
      </body>
    </html>
  );
}
