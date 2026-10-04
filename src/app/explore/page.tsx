import PlacesExplorer from "@/components/PlacesExplorer";
export const metadata = {
  title: "Photographs on the map",
  alternates: { canonical: "/explore" },
};
export default function ExplorePage() {
  return (
    <main id="main" className="explorer">
      <PlacesExplorer />
    </main>
  );
}
