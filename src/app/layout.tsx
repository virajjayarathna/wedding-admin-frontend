import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Wedding Admin', template: '%s | Wedding Admin' },
  description: 'Wedding Invitation Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Same families the guest site loads. The admin chrome itself doesn't
            use them — they're here so the Style tab's live invitation preview
            renders in the couple's actual typefaces rather than a fallback. */}
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Montserrat:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Great+Vibes&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a1e29',
              color: '#f0f0f0',
              border: '1px solid #ffffff20',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#000' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
