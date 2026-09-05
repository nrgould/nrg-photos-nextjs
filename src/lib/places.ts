import { collections, type Photo } from "./photography";
export type TravelPlace = {
  id: string;
  name: string;
  location: string;
  coordinates: [number, number];
  photo: Photo;
};
const travel = collections.find((c) => c.slug === "far-from-here")!;
const find = (title: string) => {
  const photo = travel.photos.find((p) => p.title === title);
  if (!photo) throw new Error(`Missing place photograph: ${title}`);
  return photo;
};
// Geographic reference points for each region, not recorded camera GPS positions.
export const travelPlaces: TravelPlace[] = [
  {
    id: "austria",
    name: "Austria",
    location: "Hallstatt",
    coordinates: [13.65, 47.56],
    photo: find("Scenes from Hallstatt"),
  },
  {
    id: "italy",
    name: "Italy",
    location: "Lago di Braies",
    coordinates: [12.09, 46.69],
    photo: find("Lago di Braies"),
  },
  {
    id: "norway",
    name: "Norway",
    location: "Above the Arctic Circle",
    coordinates: [18.96, 69.65],
    photo: find("Into the Arctic"),
  },
  {
    id: "north-carolina",
    name: "North Carolina",
    location: "Lake James",
    coordinates: [-81.89, 35.75],
    photo: find("Lake James"),
  },
];
