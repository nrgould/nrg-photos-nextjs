import type { ConfigurationResult } from "./config";
import type { CommerceService } from "./service";
import { CommerceError, type CommerceStore } from "./types";

export function createCommerceHandlers({
  configuration,
  store,
  service,
  authenticate,
}: {
  configuration: ConfigurationResult;
  store?: CommerceStore;
  service?: CommerceService;
  authenticate?: (
    requireEmail?: boolean,
  ) => Promise<{ userId: string; email: string | null }>;
}) {
  const headers = { "Cache-Control": "private, no-store" };
  const ready = () => {
    if (
      configuration.status !== "configured" ||
      store?.durability !== "durable" ||
      !service ||
      !authenticate
    )
      throw new CommerceError("commerce_not_configured", 503);
    return {
      service,
      authenticate,
      origin: configuration.configuration.origin,
    };
  };
  const respond = async (run: () => Promise<unknown>) => {
    try {
      return Response.json(await run(), { headers });
    } catch (error) {
      // Provider and database failures surface as a bare 503, so name the cause in the server log.
      if (!(error instanceof CommerceError) || error.status >= 500) {
        const { name, code, type, statusCode, message } = (error ??
          {}) as Record<string, unknown>;
        console.error("commerce request failed", {
          name,
          code,
          type,
          statusCode,
          message,
        });
      }
      return Response.json(
        {
          error:
            error instanceof CommerceError
              ? error.code
              : "commerce_unavailable",
        },
        {
          status: error instanceof CommerceError ? error.status : 503,
          headers,
        },
      );
    }
  };
  const sameOrigin = (request: Request, origin: string) => {
    if (request.headers.get("origin") !== origin)
      throw new CommerceError("invalid_origin", 403);
  };
  const rawBody = async (request: Request, maxBytes: number) => {
    if (Number(request.headers.get("content-length")) > maxBytes)
      throw new CommerceError("body_too_large", 413);
    const reader = request.body?.getReader();
    if (!reader) return "";
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        length += next.value.length;
        if (length > maxBytes) {
          await reader.cancel();
          throw new CommerceError("body_too_large", 413);
        }
        chunks.push(next.value);
      }
    } finally {
      reader.releaseLock();
    }
    return Buffer.concat(chunks).toString("utf8");
  };
  const body = async (request: Request, keys: readonly string[]) => {
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new CommerceError("invalid_content_type", 415);
    let parsed: unknown;
    try {
      parsed = JSON.parse(await rawBody(request, 8192));
    } catch (error) {
      if (error instanceof CommerceError) throw error;
      throw new CommerceError("invalid_json");
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      Object.keys(parsed).some((key) => !keys.includes(key))
    )
      throw new CommerceError("invalid_request");
    return parsed as Record<string, unknown>;
  };
  return {
    availability: () =>
      Response.json(
        {
          status:
            configuration.status === "configured" &&
            store?.durability === "durable" &&
            service &&
            authenticate
              ? configuration.configuration.mode === "stripe-live"
                ? "ready"
                : "test-ready"
              : "unavailable",
        },
        { headers },
      ),
    checkout: (request: Request) =>
      respond(async () => {
        const { service, authenticate, origin } = ready();
        sameOrigin(request, origin);
        const { userId: user } = await authenticate();
        const input = await body(request, [
          "paidPresetIds",
          "requestId",
          "returnPath",
        ]);
        return service.checkout(
          user,
          input.paidPresetIds,
          input.requestId,
          input.returnPath,
        );
      }),
    webhook: (request: Request) =>
      respond(async () => {
        const { service } = ready();
        const signature = request.headers.get("stripe-signature");
        if (!signature) throw new CommerceError("missing_webhook_signature");
        return service.webhook(await rawBody(request, 1048576), signature);
      }),
    ownership: () =>
      respond(async () => {
        const { service, authenticate } = ready();
        const { userId, email } = await authenticate();
        return service.ownership(userId, email);
      }),
    claimReward: (request: Request) =>
      respond(async () => {
        const { service, authenticate, origin } = ready();
        sameOrigin(request, origin);
        return service.claimReward((await authenticate(true)).userId);
      }),
    download: (presetId: string) =>
      respond(async () => {
        const { service, authenticate } = ready();
        return service.download((await authenticate()).userId, presetId);
      }),
  };
}
