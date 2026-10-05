import manifest from "./photo-manifest.json";
export type Photo = {
  src: string;
  title: string;
  alt: string;
  width: number;
  height: number;
  collection: string;
  /** Shoot month as YYYY-MM, from the library folder; absent when unknown. */
  taken?: string;
};
// A photo's `src` is its id; the file lives in the public "photos" Storage bucket.
export function photoUrl(src: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${src.replace(/^\/photos\//, "")}`;
}

export function takenLabel(taken?: string) {
  if (!taken) return null;
  const [year, month] = taken.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
export type Collection = {
  slug: string;
  title: string;
  category: string;
  description: string;
  cover: Photo;
  photos: Photo[];
};
function photo(
  file: string,
  title: string,
  alt: string,
  collection: string,
): Photo {
  const item = manifest.find((p) => p.src === `/photos/${file}.webp`);
  if (!item) throw new Error(`Missing original photograph: ${file}`);
  return {
    src: item.src,
    width: item.width,
    height: item.height,
    title,
    alt,
    collection,
    taken: item.taken,
  };
}
const green = [
  [
    "R6II7301-Edit-2",
    "A window into green",
    "A white window framed by dense green ivy",
  ],
  [
    "R6II1927",
    "Roses in the light",
    "Soft pink roses growing through a sunlit green hedge",
  ],
  [
    "R6II3357",
    "Through the trees",
    "Sunlight falling across a wooden path through the forest",
  ],
  [
    "R6II4326",
    "Standing still",
    "A solitary tree in a meadow beneath the mountains",
  ],
  [
    "R6II3233",
    "Among the wildflowers",
    "White wildflowers scattered across a green meadow",
  ],
  [
    "R6II2153",
    "The garden",
    "A green garden and summer house surrounded by flowering plants",
  ],
  [
    "R6II1344",
    "Under glass",
    "A glass conservatory beyond a garden of red flowers",
  ],
].map(([file, title, alt]) => photo(file, title, alt, "a-study-in-green"));
const travel = [
  [
    "hallstatt-1",
    "Scenes from Hallstatt",
    "Hallstatt and its church beside the lake, framed by green leaves in soft mountain light",
  ],
  [
    "3_landscape_lago_di_braies",
    "Lago di Braies",
    "A wooden boathouse beside a turquoise lake reflecting the Dolomites",
  ],
  [
    "landscape_dolomites_seceda",
    "Seceda",
    "A sharp green ridge beneath the peaks of Seceda in the Dolomites",
  ],
  [
    "landscape_dolomites_santa_magdalena",
    "Santa Magdalena",
    "An alpine village in a green valley beneath pink-lit mountain peaks",
  ],
  [
    "landscape_sailboat_in_a_blizzard",
    "Into the Arctic",
    "A red boat on dark Arctic water beneath snow-covered mountains",
  ],
  [
    "landscape_bavarian_alps_sunset_in_grainau",
    "Moments from Bavaria",
    "Golden evening light on mountains above a Bavarian village",
  ],
  [
    "landscape_dolomites_cadini_di_misurina",
    "Cadini di Misurina",
    "Pale jagged Dolomite peaks rising above a green ridge",
  ],
  [
    "hallstatt-2",
    "Still water, Hallstatt",
    "The calm lake at Hallstatt stretching between forested mountains",
  ],
  [
    "landscape_lake_james",
    "Lake James",
    "Lake James and its wooded islands under a cloudy sky",
  ],
  [
    "landscape_amsterdam_canal",
    "Along the canal",
    "Amsterdam canal houses reflected in water, with flowers in the foreground",
  ],
  [
    "landscape_copenhagen_corner",
    "A Copenhagen corner",
    "Sunlight and shadow on the corner of an ornate Copenhagen building",
  ],
  [
    "bavarian-tree",
    "A tree in Bavaria",
    "A solitary tree on a vivid green hillside under a cloudy sky",
  ],
].map(([file, title, alt]) => photo(file, title, alt, "far-from-here"));
const lifestyle = [
  [
    "2_lifestyle_hiking_on_a_beach_sunset_fjallraven",
    "The long way home",
    "A woman with a backpack walking along a beach at sunset",
  ],
  [
    "2_product_lifestyle_ravens_brew_ferns",
    "Raven’s Brew, in the ferns",
    "Raven’s Brew coffee photographed among dark green ferns",
  ],
  [
    "lifestyle_woman_hiking_with_smartwool_socks",
    "Smartwool, on the trail",
    "Hiking boots and blue Smartwool socks on a woodland trail",
  ],
  [
    "4_lifestyle_product_aileen_wearing_helly_hansen_jacket_lofoten_islands_norway",
    "Out in the elements",
    "A woman in a blue jacket sitting on a rock in the Lofoten Islands",
  ],
  [
    "product_lifestyle_eight_angles7",
    "Eight Angles",
    "A close-up of a sculptural dark plate and tableware",
  ],
  [
    "product_lifestyle_ravens_brew_hero",
    "Raven’s Brew",
    "Three bags of Raven’s Brew coffee photographed outdoors",
  ],
  [
    "lifestyle_product_food_from_copenhagen",
    "At the table",
    "Danish open sandwiches arranged on a wooden board",
  ],
  [
    "lifestyle_smartwool_jacket",
    "Made for outside",
    "Detail of a blue Smartwool jacket photographed in the woods",
  ],
].map(([file, title, alt]) => photo(file, title, alt, "everyday-stories"));
const people = [
  [
    "portrait_girl_posing_with_cherry_blossoms_1",
    "In bloom",
    "A woman in a floral dress beneath pink cherry blossoms",
  ],
  [
    "3_portrait_couple_holding_eachother_sunset",
    "Together, at dusk",
    "A couple embracing beside the water in warm evening light",
  ],
  [
    "portrait_lifestyle_emilie_copenhagen_sunset",
    "Emilie, Copenhagen",
    "A woman in a tan coat on a Copenhagen street in the evening",
  ],
  [
    "portrait_thomas_stockholm_street_sunset",
    "Thomas, Stockholm",
    "A man in a green sweater on a cobbled Stockholm street",
  ],
  [
    "lifestyle_portrait_emily_wearing_satila_beanie_lofoten_islands_norway",
    "Emily, Lofoten",
    "A smiling woman in a knit beanie beside the water in Lofoten",
  ],
  [
    "2_portrait_couple_dancing_at_sunset",
    "One more dance",
    "A couple dancing together on a boardwalk at sunset",
  ],
  [
    "portrait_lifestyle_aileen_in_snow_sunset_in_sweden",
    "Winter light",
    "A woman in winter clothing in a snowy Swedish landscape at sunset",
  ],
  [
    "portrait_ncsu_grad_photo_4",
    "A new chapter",
    "A graduate in a red cap and gown at North Carolina State University",
  ],
  [
    "portrait_erica_sitting_copenhagen_canal",
    "Erica, by the canal",
    "A woman sitting beside a Copenhagen canal",
  ],
  [
    "portrait_horse_ab",
    "Good company",
    "A woman in a red dress standing with her horse",
  ],
  [
    "2_portrait_black_dress",
    "Afternoon light",
    "A woman in a black dress on a path with warm light behind her",
  ],
  [
    "portrait_couple",
    "Just the two of us",
    "A couple together beside a railing in a garden",
  ],
].map(([file, title, alt]) => photo(file, title, alt, "people-and-places"));
export const collections: Collection[] = [
  {
    slug: "a-study-in-green",
    title: "A study in green",
    category: "Nature",
    description: "Forests, gardens and close detail.",
    cover: green[0],
    photos: green,
  },
  {
    slug: "far-from-here",
    title: "Far from here",
    category: "Landscape & travel",
    description: "Austria, Germany, Italy and Norway.",
    cover: travel[1],
    photos: travel,
  },
  {
    slug: "everyday-stories",
    title: "Everyday stories",
    category: "Lifestyle & brands",
    description: "Lifestyle and product work for brands.",
    cover: lifestyle[0],
    photos: lifestyle,
  },
  {
    slug: "people-and-places",
    title: "People & places",
    category: "Portraits",
    description: "Portraits and couples.",
    cover: people[0],
    photos: people,
  },
];
export const allPhotos = collections.flatMap((c) => c.photos);
export const heroPhotos = [travel[0], travel[7], travel[5]];
export const portrait = photo(
  "nicholas_portrait",
  "Nicholas Gould",
  "Nicholas Gould in a green jacket with mountains in the background",
  "about",
);
export const getCollection = (slug: string) =>
  collections.find((c) => c.slug === slug);
