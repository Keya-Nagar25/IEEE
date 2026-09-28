import "server-only";
import nodemailer from "nodemailer";
import { event } from "./event";
import { siteUrl } from "./format";

export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
function transport() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      pool: true,
      maxConnections: 2,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendCredentials(to: { email: string; leaderName: string; teamName: string; teamNumber: number; code: string }) {
  const loginUrl = `${siteUrl()}/team/login`;
  const hi = to.leaderName ? `Hi ${to.leaderName},` : "Hi,";
  const text = [
    hi,
    "",
    `Here are the login details for your team "${to.teamName}" at ${event.name}.`,
    "",
    `Team number: ${to.teamNumber}`,
    `Login code:  ${to.code}`,
    "",
    `Log in at ${loginUrl} on event day to submit your GitHub repo.`,
    "Only share this code with your teammates.",
    "",
    `— ${event.name} organizers`,
  ].join("\n");
  const html = `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">
<p>${escape(hi)}</p>
<p>Here are the login details for your team <strong>${escape(to.teamName)}</strong> at ${escape(event.name)}.</p>
<table style="border-collapse:collapse;margin:16px 0">
<tr><td style="padding:6px 16px 6px 0;color:#666">Team number</td><td style="padding:6px 0;font-family:monospace;font-size:18px"><strong>${to.teamNumber}</strong></td></tr>
<tr><td style="padding:6px 16px 6px 0;color:#666">Login code</td><td style="padding:6px 0;font-family:monospace;font-size:18px"><strong>${escape(to.code)}</strong></td></tr>
</table>
<p>Log in at <a href="${loginUrl}">${loginUrl}</a> on event day to submit your GitHub repo. Only share this code with your teammates.</p>
<p style="color:#666">— ${escape(event.name)} organizers</p></div>`;

  await transport().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: to.email,
    subject: `${event.name} — your team login (Team ${to.teamNumber})`,
    text,
    html,
  });
}
