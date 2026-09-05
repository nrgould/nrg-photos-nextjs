import { allPhotos, type Photo } from "./photography";
export type TravelPlace = {
  id: string;
  name: string;
  location: string;
  coordinates: [number, number];
  photos: Photo[];
};
const find = (title: string) => {
  const photo = allPhotos.find((p) => p.title === title);
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
    photos: [find("Scenes from Hallstatt"), find("Still water, Hallstatt")],
  },
  {
    id: "italy",
    name: "Italy",
    location: "Lago di Braies",
    coordinates: [12.09, 46.69],
    photos: [
      find("Lago di Braies"),
      find("Seceda"),
      find("Santa Magdalena"),
      find("Cadini di Misurina"),
    ],
  },
  {
    id: "norway",
    name: "Norway",
    location: "Above the Arctic Circle",
    coordinates: [18.96, 69.65],
    photos: [
      find("Into the Arctic"),
      find("Out in the elements"),
      find("Emily, Lofoten"),
    ],
  },
  {
    id: "north-carolina",
    name: "North Carolina",
    location: "Lake James",
    coordinates: [-81.89, 35.75],
    photos: [find("Lake James"), find("A new chapter")],
  },
];
