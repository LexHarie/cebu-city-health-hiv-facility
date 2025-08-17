import type { Metadata } from 'next';
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
        {children}
      </body>
    </html>
  );
}