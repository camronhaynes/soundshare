import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Resend } from 'resend';

// Email configuration from environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@soundshare.app';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Initialize Resend if API key is provided
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

let transporter: Transporter | null = null;

/**
 * Initialize the email transporter (for SMTP fallback)
 */
function initTransporter() {
  if (!transporter) {
    // Skip if using Resend
    if (resend) {
      return null;
    }

    // For development, use console logging if SMTP not configured
    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('Email not configured. Magic links will be logged to console.');
      return null;
    }

    transporter = nodemailer.createTransporter({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Send a magic link email
 */
export async function sendMagicLinkEmail(email: string, token: string) {
  const magicLink = `${APP_URL}/auth/verify?token=${token}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
          }
          .link-text {
            color: #667eea;
            word-break: break-all;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎵 SoundShare</h1>
          </div>
          <div class="content">
            <h2>Sign in to your account</h2>
            <p>Click the button below to securely sign in to SoundShare. This link will expire in 15 minutes.</p>
            <div style="text-align: center;">
              <a href="${magicLink}" class="button">Sign In to SoundShare</a>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">
              Or copy and paste this link in your browser:
              <br>
              <span class="link-text">${magicLink}</span>
            </p>
            <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">
              If you didn't request this email, you can safely ignore it.
            </p>
          </div>
          <div class="footer">
            <p>© 2025 SoundShare. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Sign in to SoundShare

Click the link below to sign in to your account:
${magicLink}

This link will expire in 15 minutes.

If you didn't request this email, you can safely ignore it.

© 2025 SoundShare
  `;

  // Try Resend first if configured
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: `SoundShare <${EMAIL_FROM}>`,
        to: email,
        subject: '🎵 Sign in to SoundShare',
        html: htmlContent,
        text: textContent,
      });

      if (error) {
        console.error('Resend error:', error);
        throw new Error('Failed to send magic link email');
      }

      console.log('✅ Magic link email sent via Resend to', email);
      return;
    } catch (error) {
      console.error('Failed to send email via Resend:', error);
      throw new Error('Failed to send magic link email');
    }
  }

  // Fallback to SMTP/nodemailer
  const emailTransporter = initTransporter();

  // In development without email service, log to console
  if (!emailTransporter) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🪄 MAGIC LINK EMAIL (Development Mode)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${email}`);
    console.log(`Magic Link: ${magicLink}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 Configure SMTP settings in .env.local to send real emails');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return;
  }

  // Send via SMTP
  try {
    await emailTransporter.sendMail({
      from: `"SoundShare" <${EMAIL_FROM}>`,
      to: email,
      subject: '🎵 Sign in to SoundShare',
      text: textContent,
      html: htmlContent,
    });

    console.log(`✅ Magic link email sent via SMTP to ${email}`);
  } catch (error) {
    console.error('Failed to send email via SMTP:', error);
    throw new Error('Failed to send magic link email');
  }
}

/**
 * Send a welcome email to new users
 */
export async function sendWelcomeEmail(email: string, name: string) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
          }
          .feature {
            display: flex;
            align-items: center;
            margin: 20px 0;
          }
          .feature-icon {
            font-size: 24px;
            margin-right: 15px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎵 Welcome to SoundShare!</h1>
          </div>
          <div class="content">
            <h2>Hey ${name}! 👋</h2>
            <p>Welcome to SoundShare - your new home for sharing and discovering amazing sounds!</p>

            <h3>Here's what you can do:</h3>
            <div class="feature">
              <span class="feature-icon">📤</span>
              <div>
                <strong>Upload & Share</strong><br>
                Share your loops, clips, and recordings with the world
              </div>
            </div>
            <div class="feature">
              <span class="feature-icon">🎛️</span>
              <div>
                <strong>Multi-Stem Mixer</strong><br>
                Upload and mix multi-track projects with individual stem control
              </div>
            </div>
            <div class="feature">
              <span class="feature-icon">🎨</span>
              <div>
                <strong>Audio Effects</strong><br>
                Transform your sounds with reverb, delay, distortion, and more
              </div>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${APP_URL}" class="button">Start Creating</a>
            </div>

            <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">
              Need help? Just reply to this email and we'll be happy to assist!
            </p>
          </div>
          <div class="footer">
            <p>© 2025 SoundShare. All rights reserved.</p>
            <p>Follow us on social media for updates and inspiration!</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Welcome to SoundShare!

Hey ${name}! 👋

Welcome to SoundShare - your new home for sharing and discovering amazing sounds!

Here's what you can do:
• Upload & Share - Share your loops, clips, and recordings with the world
• Multi-Stem Mixer - Upload and mix multi-track projects with individual stem control
• Audio Effects - Transform your sounds with reverb, delay, distortion, and more

Get started: ${APP_URL}

Need help? Just reply to this email!

© 2025 SoundShare
  `;

  // Try Resend first if configured
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: `SoundShare <${EMAIL_FROM}>`,
        to: email,
        subject: '🎉 Welcome to SoundShare!',
        html: htmlContent,
        text: textContent,
      });

      if (error) {
        console.error('Resend error:', error);
        // Don't throw for welcome emails
        return;
      }

      console.log('✅ Welcome email sent via Resend to', email);
      return;
    } catch (error) {
      console.error('Failed to send welcome email via Resend:', error);
      // Don't throw for welcome emails - they're not critical
      return;
    }
  }

  // Fallback to SMTP/nodemailer
  const emailTransporter = initTransporter();

  // In development without email service, log to console
  if (!emailTransporter) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 WELCOME EMAIL (Development Mode)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return;
  }

  // Send via SMTP
  try {
    await emailTransporter.sendMail({
      from: `"SoundShare" <${EMAIL_FROM}>`,
      to: email,
      subject: '🎉 Welcome to SoundShare!',
      text: textContent,
      html: htmlContent,
    });

    console.log(`✅ Welcome email sent via SMTP to ${email}`);
  } catch (error) {
    console.error('Failed to send welcome email via SMTP:', error);
    // Don't throw error for welcome emails - they're not critical
  }
}