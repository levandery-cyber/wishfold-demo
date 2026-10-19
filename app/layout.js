import { Bagel_Fat_One, Zen_Maru_Gothic } from 'next/font/google';
import Providers from '@/components/Providers';
import './styles/tokens.css';
import './styles/base.css';
import './styles/stage.css';
import './styles/board.css';
import './styles/hud.css';
import './styles/overlays.css';
import './styles/pages.css';

const display = Bagel_Fat_One({ weight: '400', subsets: ['latin'], variable: '--font-bagel', display: 'swap', adjustFontFallback: false });
const ui = Zen_Maru_Gothic({ weight: ['400', '500', '700', '900'], subsets: ['latin'], variable: '--font-maru', display: 'swap', adjustFontFallback: false });

const DESCRIPTION =
  'A 7x7 cluster-pays slot folded from paper. Cascades, lucky stars, three wishes, a crane that makes wishes come true and a koi pond. Built with Next.js. Virtual credits only.';

const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3300';

export const metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Wishfold: fold a wish, win a lot', template: '%s · Wishfold' },
  description: DESCRIPTION,
  applicationName: 'Wishfold',
  openGraph: { title: 'Wishfold: fold a wish, win a lot', description: DESCRIPTION, type: 'website', siteName: 'Wishfold' },
  twitter: { card: 'summary_large_image', title: 'Wishfold', description: DESCRIPTION },
};

export const viewport = { themeColor: '#26206b', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
