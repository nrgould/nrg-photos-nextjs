import { Resend } from "resend";
import { handleContact } from "@/lib/contact";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleContact(request, {
    configured: Boolean(
      process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL,
    ),
    send: async (mail) => {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: process.env.CONTACT_FROM_EMAIL!,
        ...mail,
      });
      if (error) throw new Error("Email delivery failed");
    },
  });
}
