import type { Metadata, Viewport } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeRegistry } from '@/components/ThemeRegistry';
import { QueryProvider } from '@/components/QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'placeholder_client_id';

export const metadata: Metadata = {
  title: {
    default: 'Respondia - Automação WhatsApp com IA',
    template: '%s | Respondia',
  },
  description: 'Plataforma de automação WhatsApp com inteligência artificial. Secretária IA, CRM, campanhas e muito mais.',
  keywords: ['whatsapp', 'automação', 'chatbot', 'ia', 'crm', 'campanhas'],
  authors: [{ name: 'Respondia' }],
  openGraph: {
    title: 'Respondia - Automação WhatsApp com IA',
    description: 'Plataforma de automação WhatsApp com inteligência artificial.',
    type: 'website',
    locale: 'pt_BR',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#00a884',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <AppRouterCacheProvider options={{ key: 'mui' }}>
          <QueryProvider>
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <AuthProvider>
                <ThemeRegistry>
                  {children}
                </ThemeRegistry>
              </AuthProvider>
            </GoogleOAuthProvider>
          </QueryProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
