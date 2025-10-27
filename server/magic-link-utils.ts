import { randomBytes } from "crypto";

/**
 * Generate a cryptographically secure token for magic links
 * Returns a 32-character URL-safe token
 */
export function generateMagicLinkToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Generate the magic link URL for email
 */
export function generateMagicLinkUrl(token: string, baseUrl: string): string {
  return `${baseUrl}/auth/verify?token=${token}`;
}

/**
 * Mock email sender for development
 * In production, this would use a real email service (SendGrid, Mailgun, etc.)
 */
export async function sendMagicLinkEmail(email: string, magicLinkUrl: string): Promise<void> {
  console.log(`
=================================================================
🔐 MAGIC LINK EMAIL (Demo Mode - Check Server Logs)
=================================================================
To: ${email}
Subject: Your Login Link for Lean Workforce

Click the link below to log in to your account:

${magicLinkUrl}

This link will expire in 10 minutes and can only be used once.

If you didn't request this link, you can safely ignore this email.
=================================================================
  `);
  
  // In production, implement real email sending:
  // await emailService.send({
  //   to: email,
  //   subject: "Your Login Link for Lean Workforce",
  //   html: emailTemplate(magicLinkUrl),
  // });
}
