import type { Metadata } from "next";
import { connection } from "next/server";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { site } from "@/lib/site";
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
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${serif.variable} ${sans.variable}`}
    >
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
