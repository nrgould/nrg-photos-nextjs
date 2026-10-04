import { Fraunces, Hanken_Grotesk } from "next/font/google";
import PlacesExplorer from "@/components/PlacesExplorer";
const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-explorer-display",
});
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-explorer-sans",
});
export const metadata = {
  title: "Places & presets",
  alternates: { canonical: "/explore" },
};
export default function ExplorePage() {
  return (
    <main id="main" className={`explorer ${display.variable} ${sans.variable}`}>
      <PlacesExplorer />
    </main>
  );
}
