import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'HIV Prevention & Care Management System',
  description: 'Comprehensive HIV care management platform for healthcare facilities',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body data-theme="light">
        {/* Initialize theme before hydration */}
        <Script id="init-theme" strategy="beforeInteractive">
          {`
            (function(){
              try {
                var saved = localStorage.getItem('theme') || 'light';
                document.body.setAttribute('data-theme', saved);
              } catch (_) {}
            })();
          `}
        </Script>
        {/* Chart.js via CDN for client-side charts */}
        <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
