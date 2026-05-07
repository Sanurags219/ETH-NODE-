import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export async function generateMetadata(): Promise<Metadata> {
  const appUrl = process.env.APP_URL || 'https://ais-dev-2fjddueltatghjthiwmn7j-615601803900.asia-southeast1.run.app';
  
  return {
    title: 'EtherNode Explorer',
    description: 'Real-time blockchain node dashboard',
    other: {
      'fc:miniapp': JSON.stringify({
        version: 'next',
        imageUrl: `${appUrl}/hero.png`,
        button: {
          title: 'Launch Explorer',
          action: {
            type: 'launch_miniapp',
            name: 'EtherNode Explorer',
            url: appUrl,
            splashImageUrl: `${appUrl}/splash.png`,
            splashBackgroundColor: '#05070A',
          },
        },
      }),
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body suppressHydrationWarning className="bg-[#05070A] text-[#E2E8F0] font-sans antialiased overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
