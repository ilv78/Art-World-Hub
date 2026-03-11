import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || "ArtVerse <onboarding@resend.dev>";
}

export async function sendMagicLinkEmail(
  email: string,
  token: string,
  origin: string
): Promise<void> {
  const client = getResendClient();
  const verifyUrl = `${origin}/api/auth/verify-email?token=${token}`;

  await client.emails.send({
    from: getFromEmail(),
    to: email,
    subject: "Verify your email - ArtVerse",
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a2e; border-bottom: 2px solid #F97316; padding-bottom: 10px;">
          Welcome to ArtVerse
        </h1>
        <p>Click the button below to verify your email and create your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}"
             style="background-color: #F97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Verify Email
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          ArtVerse — Discover. Collect. Create.
        </p>
      </div>
    `,
  });
}
