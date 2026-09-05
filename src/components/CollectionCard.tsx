import Link from "next/link";
import type { Collection } from "@/lib/photography";
import PhotoImage from "./PhotoImage";
export default function CollectionCard({
  collection,
}: {
  collection: Collection;
}) {
  return (
    <Link
      className={`collection-card collection-${collection.slug}`}
      href={`/work/${collection.slug}`}
    >
      <div className="collection-image">
        <PhotoImage photo={collection.cover} />
        <span className="collection-open">View collection</span>
      </div>
      <div className="collection-caption">
        <div>
          <h3>{collection.title}</h3>
          <p>{collection.category}</p>
        </div>
        <span className="collection-count">
          {collection.photos.length} photographs
        </span>
      </div>
    </Link>
  );
}
