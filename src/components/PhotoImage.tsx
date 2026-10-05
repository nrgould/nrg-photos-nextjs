import Image from "next/image";
import { photoUrl, type Photo } from "@/lib/photography";
export default function PhotoImage({
  photo,
  className = "",
  priority = false,
  sizes = "(max-width: 700px) 100vw, 50vw",
  onLoad,
}: {
  photo: Photo;
  className?: string;
  priority?: boolean;
  sizes?: string;
  onLoad?: () => void;
}) {
  return (
    <Image
      src={photoUrl(photo.src)}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      className={className}
      sizes={sizes}
      quality={85}
      preload={priority}
      onLoad={onLoad}
    />
  );
}
