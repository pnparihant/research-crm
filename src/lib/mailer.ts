import nodemailer from "nodemailer";

export function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendLoginOtpEmail(to: string, otp: string) {
  console.log(`[mailer] sendLoginOtpEmail — to=${to}`);
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Arihant Capital Markets"}" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: "Your OTP for Arihant Capital Markets Research Servicing Tracker",
    text: `Your OTP for Arihant Capital Markets Research Servicing Tracker login is ${otp}. Valid for 10 minutes. Do not share this OTP with anyone. - ARIHANT`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h2 style="color:#1e3a5f;margin:0;">Arihant Capital Markets</h2>
          <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Research Servicing Tracker</p>
        </div>
        <p style="color:#374151;font-size:15px;">Your login OTP is:</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#1e3a5f;font-family:monospace;">${otp}</span>
        </div>
        <p style="color:#6b7280;font-size:13px;">Valid for <strong>10 minutes</strong>. Do not share this OTP with anyone.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#9ca3af;font-size:11px;text-align:center;">— ARIHANT</p>
      </div>
    `,
  });
  console.log(`[mailer] sendLoginOtpEmail — sent successfully to ${to}`);
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  console.log(`[mailer] sendPasswordResetEmail — to=${to}`);
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? "Arihant Capital Markets"}" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: "CRM — Reset your password",
    html: `
      <p>Hi ${name},</p>
      <p>Click the link below to reset your password. The link expires in <strong>1 hour</strong>.</p>
      <p><a href="${resetUrl}" style="color:#0f766e;font-weight:bold;">Reset Password</a></p>
      <p>If you did not request this, ignore this email.</p>
      <p style="color:#9ca3af;font-size:12px;">Arihant Capital Markets — CRM</p>
    `,
  });
  console.log(`[mailer] sendPasswordResetEmail — sent successfully to ${to}`);
}
