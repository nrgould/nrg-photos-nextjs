import list from "@/data/bucket-list.json";
import countryLabels from "@/data/country-labels.json";

export type BucketPlace = {
  id: string;
  name: string;
  /** Representative area point in [longitude, latitude], not a travel claim. */
  coordinates: [number, number];
};

/** Places Nicholas has not photographed yet. A country without coordinates takes its Natural Earth label point. */
export const bucketList: BucketPlace[] = list.map((entry) => {
  const coordinates =
    "coordinates" in entry
      ? entry.coordinates
      : countryLabels.features.find(
          (feature) => feature.properties.name === entry.name,
        )?.geometry.coordinates;
  if (!coordinates) throw new Error(`No map point for ${entry.name}`);
  return { ...entry, coordinates: coordinates as [number, number] };
});
