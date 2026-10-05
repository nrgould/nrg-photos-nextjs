import { getCatalogPreset } from "../../preset-commerce";
import { CommerceError, type PrivateDelivery } from "./types";

/** Structural subset of a supabase-js client built with the server secret key. */
export interface StorageClient {
  storage: {
    from(bucket: string): {
      createSignedUrl(
        path: string,
        expiresIn: number,
        options: { download: string },
      ): Promise<{ data: { signedUrl: string } | null; error: unknown }>;
    };
  };
}

export const presetFilesBucket = "preset-files";

/** Signs `<presetId>.xmp` in the private bucket; never logs the key or the URL. */
export function createSupabaseDelivery(
  client: StorageClient,
  supabaseUrl: string,
): PrivateDelivery {
  return {
    allowedOrigins: [new URL(supabaseUrl).origin],
    async issueDownload({ presetId, expiresInSeconds }) {
      const preset = getCatalogPreset(presetId);
      if (!preset) throw new CommerceError("unknown_preset", 404);
      const { data, error } = await client.storage
        .from(presetFilesBucket)
        .createSignedUrl(`${preset.id}.xmp`, expiresInSeconds, {
          download: `${preset.name}.xmp`,
        });
      if (error || !data) throw new CommerceError("delivery_unavailable", 503);
      return data.signedUrl;
    },
  };
}
