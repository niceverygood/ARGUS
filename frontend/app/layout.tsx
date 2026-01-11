import type { Metadata } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { Providers } from './providers';
import { ClientLayout } from './client-layout';

export const metadata: Metadata = {
  title: 'ARGUS SKY | 공항 위협 인텔리전스',
  description: '실시간 공항 보안 위협 모니터링 플랫폼 - AI 기반 OSINT 수집·분석',
  keywords: ['공항', '보안', '위협', '인텔리전스', 'OSINT', 'AI'],
  authors: [{ name: '바틀 주식회사' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="bg-argus-dark-bg text-argus-dark-text antialiased">
        <Providers>
          <ClientLayout>
            {children}
          </ClientLayout>
        </Providers>
      </body>
    </html>
  );
}

