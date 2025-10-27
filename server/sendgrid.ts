import sgMail from '@sendgrid/mail';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected');
  }
  return {apiKey: connectionSettings.settings.api_key, email: connectionSettings.settings.from_email};
}

export async function getUncachableSendGridClient() {
  const {apiKey, email} = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email
  };
}

export async function sendMagicLinkEmail(to: string, magicLink: string): Promise<void> {
  const {client, fromEmail} = await getUncachableSendGridClient();
  
  const msg = {
    to,
    from: fromEmail,
    subject: 'Your Login Link for Lean Workforce',
    text: `Click the link below to log in to your account:\n\n${magicLink}\n\nThis link will expire in 10 minutes and can only be used once.\n\nIf you didn't request this link, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000000;">Login to Lean Workforce</h2>
        <p>Click the button below to log in to your account:</p>
        <div style="margin: 30px 0;">
          <a href="${magicLink}" 
             style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Login to Account
          </a>
        </div>
        <p style="color: #666666; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <a href="${magicLink}" style="color: #000000;">${magicLink}</a>
        </p>
        <p style="color: #999999; font-size: 12px; margin-top: 30px;">
          This link will expire in 10 minutes and can only be used once.<br>
          If you didn't request this link, you can safely ignore this email.
        </p>
      </div>
    `
  };

  await client.send(msg);
  console.log(`✅ Magic link email sent to ${to}`);
}
