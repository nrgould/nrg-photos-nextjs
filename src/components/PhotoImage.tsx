import Image from "next/image";
import { photoUrl, type Photo } from "@/lib/photography";
import { Skeleton } from "./ui/skeleton";

export default function PhotoImage({
  photo,
  className = "",
  priority = false,
  sizes = "(max-width: 700px) 100vw, 50vw",
  onLoad,
  skeleton = false,
}: {
  photo: Photo;
  className?: string;
  priority?: boolean;
  sizes?: string;
  onLoad?: () => void;
  /** Pulses in the photo's place, then the photo fades in. The parent positions and clips it. */
  skeleton?: boolean;
}) {
  const image = (
    <Image
      src={photoUrl(photo.src)}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      className={className}
      sizes={sizes}
      quality={85}
      preload={priority}
      // Marked on the element, so a grid of tiles loads without re-rendering.
      onLoad={(event) => {
        event.currentTarget.dataset.loaded = "";
        onLoad?.();
      }}
    />
  );
  return skeleton ? (
    <>
      <Skeleton className="photo-skeleton" />
      {image}
    </>
  ) : (
    image
  );
}
