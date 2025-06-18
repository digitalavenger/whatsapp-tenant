// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Next.js font optimization
import './globals.css';
import { FirebaseProvider } from '../../lib/FirebaseContext'; // Correct import path

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WhatsApp Tenant Manager',
  description: 'Property and Tenant Management with WhatsApp Integration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/*
        The <head> content (like title, description) is automatically handled by Next.js
        using the `metadata` export above. Do NOT render <head> directly here.
      */}
      <body>
        {/*
          Place the Tailwind CSS CDN script here, as the very first child of <body>.
          This is a common and robust workaround for CDN scripts in Next.js App Router
          to avoid hydration errors, as it keeps the script within a valid HTML structure
          and outside of the <head> tag that Next.js manages server-side.
        */}
        <script src="https://cdn.tailwindcss.com"></script>

        <FirebaseProvider>
          {children}
        </FirebaseProvider>
      </body>
    </html>
  );
}