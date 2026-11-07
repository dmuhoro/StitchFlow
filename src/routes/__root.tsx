/// <reference types="vite/client" />
import type { ReactNode } from 'react';
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import appCss from '../index.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'StitchFlow | Atelier Operating System' },
      {
        name: 'description',
        content:
          'Bespoke tailoring workflow for African ateliers: lookbooks, fitting bookings, production tracking and measurement cards.',
      },
      { property: 'og:title', content: 'StitchFlow | Atelier Operating System' },
      {
        property: 'og:description',
        content: 'Lookbooks, fitting bookings, production stages and African measurement cards.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: () => <Outlet />,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-[#FAF6F0] text-[#1A1715] antialiased selection:bg-[#D4A347]/25 selection:text-[#8C6D2D]">
        {children}
        <Scripts />
      </body>
    </html>
  );
}