import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  pool: true,
  maxConnections: 3,
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

export async function sendMail(to: string, subject: string, html: string) {
  return transporter.sendMail({
    from: `"Iyin-Ekiti TechFest" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}
