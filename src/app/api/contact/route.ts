import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';

const contactSchema = z.object({
	to: z.string().min(1, 'Name is required'),
	email: z.string().email('Valid email is required'),
	message: z.string().min(1, 'Message is required'),
	address1: z.string().optional(),
	address2: z.string().optional(),
	postcardImage: z.string().optional(),
});

export async function POST(request: Request) {
	try {
		const apiKey = process.env.RESEND_API_KEY;
		if (!apiKey) {
			return NextResponse.json(
				{ error: 'Email service not configured' },
				{ status: 500 }
			);
		}

		const resend = new Resend(apiKey);

		const body = await request.json();
		const result = contactSchema.safeParse(body);

		if (!result.success) {
			const firstIssue = result.error.issues[0];
			return NextResponse.json(
				{ error: firstIssue?.message || 'Validation failed' },
				{ status: 400 }
			);
		}

		const { to, email, message, address1, address2, postcardImage } =
			result.data;

		// Get the base URL from environment or construct from request
		const baseUrl =
			process.env.NEXT_PUBLIC_BASE_URL ||
			process.env.VERCEL_URL
				? `https://${process.env.VERCEL_URL}`
				: 'http://localhost:3000';

		const imageUrl = postcardImage
			? `${baseUrl}${postcardImage}`
			: null;

		const htmlContent = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
			</head>
			<body style="margin: 0; padding: 40px 20px; background: #1a1a1a; font-family: 'Georgia', serif;">
				<div style="max-width: 600px; margin: 0 auto;">
					${imageUrl ? `
					<!-- Postcard Image (Front) -->
					<div style="background: #fff; border: 12px solid #fff; box-shadow: 0 8px 30px rgba(0,0,0,0.3); margin-bottom: 24px;">
						<img src="${imageUrl}" alt="Postcard" style="width: 100%; height: auto; display: block;" />
					</div>
					` : ''}

					<!-- Postcard Message (Back) -->
					<div style="background: #fffdf8; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 8px 30px rgba(0,0,0,0.3); padding: 0;">
						<!-- Top decorative edge -->
						<div style="height: 6px; background: linear-gradient(90deg, #e74c3c 0%, #e74c3c 50%, #3498db 50%, #3498db 100%);"></div>

						<div style="padding: 32px;">
							<!-- Stamp area -->
							<div style="float: right; border: 2px solid rgba(0,0,0,0.3); padding: 8px 12px; font-size: 10px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">
								NRG PHOTO
							</div>

							<div style="clear: both; padding-top: 20px;">
								<!-- Address block -->
								<div style="margin-bottom: 24px;">
									<p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666;">To:</p>
									<p style="margin: 0; font-size: 18px; font-weight: bold;">${to}</p>
									${address1 ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #333;">${address1}</p>` : ''}
									${address2 ? `<p style="margin: 2px 0 0 0; font-size: 14px; color: #333;">${address2}</p>` : ''}
								</div>

								<!-- Divider line -->
								<div style="border-top: 1px solid rgba(0,0,0,0.15); margin: 24px 0;"></div>

								<!-- Message -->
								<div style="padding: 16px 0;">
									<p style="margin: 0; font-size: 16px; line-height: 1.8; white-space: pre-wrap;">${message}</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Footer -->
					<p style="margin-top: 24px; text-align: center; font-size: 12px; color: #666;">
						Sent from NRG Photo Portfolio
					</p>
				</div>
			</body>
			</html>
		`;

		const { data, error: sendError } = await resend.emails.send({
			from: 'NRG Photo <onboarding@resend.dev>',
			to: email,
			subject: `A postcard for ${to}`,
			html: htmlContent,
		});

		if (sendError) {
			console.error('Resend error:', sendError);
			return NextResponse.json(
				{ error: sendError.message || 'Failed to send email' },
				{ status: 400 }
			);
		}

		console.log('Email sent successfully:', data);
		return NextResponse.json({ success: true, id: data?.id });
	} catch (error) {
		console.error('Contact form error:', error);
		return NextResponse.json(
			{ error: 'Failed to send postcard. Please try again.' },
			{ status: 500 }
		);
	}
}
