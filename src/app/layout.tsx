import type { Metadata } from "next";
import { connection } from "next/server";
import {
  Cormorant_Garamond,
  DM_Sans,
  Fraunces,
  Hanken_Grotesk,
} from "next/font/google";
import { CommerceCartProvider } from "@/components/CommerceCartProvider";
import { CommerceProviders } from "@/components/CommerceProviders";
import { getAccountPublicConfiguration } from "@/lib/server/commerce-runtime";
import { photoUrl } from "@/lib/photography";
import { site } from "@/lib/site";
import { seoLaunchMetadata } from "@/lib/seo-config";
import { Analytics } from "@vercel/analytics/next";
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
        url: photoUrl("/photos/hallstatt-2.webp"),
        width: 2400,
        height: 1600,
        alt: "Hallstatt across the lake, photographed by Nicholas Gould",
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
            __html: `try{const t=localStorage.getItem('photography-theme');if(t==='dark'||t==='light')document.documentElement.dataset.photoTheme=t}catch{}for(const e of['contextmenu','dragstart'])document.addEventListener(e,v=>{if(v.target instanceof HTMLImageElement)v.preventDefault()})`,
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <CommerceProviders account={account}>
          <CommerceCartProvider>{children}</CommerceCartProvider>
        </CommerceProviders>
        <Analytics />
      </body>
    </html>
  );
}
