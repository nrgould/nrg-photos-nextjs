import type { Metadata } from "next";
import { connection } from "next/server";
import {
  Cormorant_Garamond,
  DM_Sans,
  Fraunces,
  Hanken_Grotesk,
} from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CommerceCartProvider } from "@/components/CommerceCartProvider";
import { CommerceProviders } from "@/components/CommerceProviders";
import { getAccountPublicConfiguration } from "@/lib/server/commerce-runtime";
import { site } from "@/lib/site";
import { seoLaunchMetadata } from "@/lib/seo-config";
import "./globals.css";
const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});
const explorerDisplay = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
  variable: "--font-explorer-display",
  display: "swap",
  preload: false,
});
const explorerSans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-explorer-sans",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Nicholas Gould | Photography",
    template: "%s | Nicholas Gould",
  },
  description: site.description,
  openGraph: {
    title: "Nicholas Gould | Photography",
    description: site.description,
    type: "website",
    siteName: "Nicholas Gould Photography",
    images: [
      {
        url: "/photos/hallstatt-1.webp",
        width: 2400,
        height: 1600,
        alt: "Hallstatt through the trees, photographed by Nicholas Gould",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  ...seoLaunchMetadata(),
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const account = getAccountPublicConfiguration();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${serif.variable} ${sans.variable} ${explorerDisplay.variable} ${explorerSans.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('photography-theme');if(t==='dark'||t==='light')document.documentElement.dataset.photoTheme=t}catch{}`,
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <CommerceProviders publishableKey={account?.publishableKey ?? null}>
          <CommerceCartProvider>
            <Header />
            {children}
            <Footer />
          </CommerceCartProvider>
        </CommerceProviders>
      </body>
    </html>
  );
}
