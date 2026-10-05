import { z } from "zod";
import { site } from "./site";
export const interests = [
  "Brand & lifestyle",
  "Portraits",
  "Something else",
] as const;
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .max(254),
  interest: z.enum(interests),
  message: z
    .string()
    .trim()
    .min(10, "Please tell me a little more, at least 10 characters.")
    .max(5000),
  website: z.string().max(200).optional().default(""),
});
export type ContactInput = z.infer<typeof contactSchema>;
export function inquiryText(input: ContactInput) {
  return `From: ${input.name}\nEmail: ${input.email}\nInterested in: ${input.interest}\n\n${input.message}`;
}
export function draftHref(input: ContactInput) {
  return `mailto:${site.email}?subject=${encodeURIComponent(`${input.interest} inquiry from ${input.name}`)}&body=${encodeURIComponent(inquiryText(input))}`;
}
type Mail = { to: string; replyTo: string; subject: string; text: string };
type Delivery = { configured: boolean; send: (mail: Mail) => Promise<void> };
export async function handleContact(
  request: Request,
  delivery: Delivery,
): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin)
    return Response.json(
      { error: "Please send your inquiry from this website." },
      { status: 403 },
    );
  if (!request.headers.get("content-type")?.includes("application/json"))
    return Response.json(
      { error: "Please submit the contact form." },
      { status: 415 },
    );
  if (Number(request.headers.get("content-length") || 0) > 16000)
    return Response.json(
      { error: "Your message is too long." },
      { status: 413 },
    );
  let input: unknown;
  try {
    // Bound actual bytes, even if Content-Length is absent or inaccurate.
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Missing body");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16000) {
        await reader.cancel();
        return Response.json(
          { error: "Your message is too long." },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    input = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return Response.json(
      { error: "The form could not be read. Please try again." },
      { status: 400 },
    );
  }
  const result = contactSchema.safeParse(input);
  if (!result.success)
    return Response.json(
      {
        error: result.error.issues[0]?.message ?? "Please check your details.",
      },
      { status: 400 },
    );
  if (result.data.website) return Response.json({ success: true });
  if (!delivery.configured)
    return Response.json(
      {
        error:
          "Please email Nicholas directly while the contact form is unavailable.",
      },
      { status: 503 },
    );
  const data = result.data;
  try {
    await delivery.send({
      to: site.email,
      replyTo: data.email,
      subject: `Photography inquiry: ${data.interest}`,
      text: inquiryText(data),
    });
  } catch {
    return Response.json(
      {
        error:
          "Your inquiry wasn’t sent. Please try again or email Nicholas directly.",
      },
      { status: 502 },
    );
  }
  return Response.json({ success: true });
}
