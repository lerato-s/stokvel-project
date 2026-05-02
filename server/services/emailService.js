// emailService.js
// Install: npm install nodemailer
//
// Add to your .env:
//   EMAIL_USER=your_gmail@gmail.com
//   EMAIL_PASS=your_gmail_app_password  (NOT your real password — use Gmail App Password)
//   EMAIL_FROM=your_gmail@gmail.com
//
// To get a Gmail App Password:
//   1. Go to myaccount.google.com
//   2. Security → 2-Step Verification → App Passwords
//   3. Generate one for "Mail"
//   4. Use that 16-character password as EMAIL_PASS

const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,          // true for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000,  // fail fast instead of hanging
  greetingTimeout: 10000,
})

// ── Send group invite email ───────────────────────────────────────────────────
async function sendInviteEmail({ toEmail, toName, groupName, inviterName, inviteLink }) {
  await transporter.sendMail({
    from:    `"${inviterName} via Stokvel" <${process.env.EMAIL_FROM}>`,
    to:      toEmail,
    subject: `You've been invited to join ${groupName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
        <h2 style="color: #9b7fd4;">You're invited! 🎉</h2>
        <p>Hi <strong>${toName}</strong>,</p>
        <p><strong>${inviterName}</strong> has invited you to join the stokvel group <strong>${groupName}</strong>.</p>
        <p>Click the button below to accept your invitation and set up your account:</p>
        <a href="${inviteLink}" style="
          display: inline-block;
          background: #9b7fd4;
          color: white;
          padding: 12px 28px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          margin: 16px 0;
        ">Accept Invitation</a>
        <p style="color: #999; font-size: 13px;">This link expires in 48 hours. If you did not expect this invite, ignore this email.</p>
      </div>
    `,
  })
}

// ── Send meeting notification email ──────────────────────────────────────────
async function sendMeetingNotification({ toEmail, toName, groupName, meetingDate, meetingTime,link, venue, agenda }) {
  await transporter.sendMail({
    from:    `"${groupName} Stokvel" <${process.env.EMAIL_FROM}>`,
    to:      toEmail,
    subject: `Upcoming Meeting — ${groupName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
        <h2 style="color: #9b7fd4;">📅 Meeting Reminder</h2>
        <p>Hi <strong>${toName}</strong>,</p>
        <p>You have an upcoming meeting for <strong>${groupName}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; color: #666; font-weight: bold;">Date</td>
            <td style="padding: 8px;">${meetingDate}</td>
          </tr>
          <tr style="background: #f0f0f0;">
            <td style="padding: 8px; color: #666; font-weight: bold;">Time</td>
            <td style="padding: 8px;">${meetingTime || "TBD"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #666; font-weight: bold;">Venue</td>
            <td style="padding: 8px;">${venue}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #0c0b0b; font-weight: bold;">Link</td>
            <td style="padding: 8px;"><a href="${link}" target="_blank" rel="noopener noreferrer">${link}</a></td>
          </tr>
          ${agenda ? `
          <tr style="background: #f0f0f0;">
            <td style="padding: 8px; color: #666; font-weight: bold;">Agenda</td>
            <td style="padding: 8px;">${agenda}</td>
          </tr>` : ""}
        </table>
        <p style="color: #999; font-size: 13px;">Please ensure your contributions are up to date before the meeting.</p>
      </div>
    `,
  })
}

// ── Send missing contribution warning ────────────────────────────────────────
async function sendMissingContributionEmail({ toEmail, toName, groupName, month, amount }) {
  await transporter.sendMail({
    from:    `"${groupName} Stokvel" <${process.env.EMAIL_FROM}>`,
    to:      toEmail,
    subject: `⚠️ Missing Contribution — ${groupName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
        <h2 style="color: #e05c5c;">⚠️ Contribution Reminder</h2>
        <p>Hi <strong>${toName}</strong>,</p>
        <p>This is a reminder that your contribution of <strong>R${amount}</strong> for <strong>${month}</strong> has not been received for <strong>${groupName}</strong>.</p>
        <p>Please log in and make your payment as soon as possible to avoid penalties.</p>
        <p style="color: #999; font-size: 13px;">If you believe this is an error, please contact your group admin.</p>
      </div>
    `,
  })
}

// ── Send meeting minutes ──────────────────────────────────────────────────────
async function sendMeetingMinutes({ toEmail, toName, groupName, meetingDate, minutes }) {
  await transporter.sendMail({
    from:    `"${groupName} Stokvel" <${process.env.EMAIL_FROM}>`,
    to:      toEmail,
    subject: `Meeting Minutes — ${groupName} — ${meetingDate}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
        <h2 style="color: #9b7fd4;">📋 Meeting Minutes</h2>
        <p>Hi <strong>${toName}</strong>,</p>
        <p>Here are the minutes from the <strong>${groupName}</strong> meeting held on <strong>${meetingDate}</strong>:</p>
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 16px 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
          ${minutes}
        </div>
        <p style="color: #999; font-size: 13px;">Keep this for your records.</p>
      </div>
    `,
  })
}

// ── Send role assignment notification ────────────────────────────────────────
async function sendRoleAssignedEmail({ toEmail, toName, groupName, role }) {
  await transporter.sendMail({
    from:    `"${groupName} Stokvel" <${process.env.EMAIL_FROM}>`,
    to:      toEmail,
    subject: `You've been assigned as ${role} — ${groupName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
        <h2 style="color: #9b7fd4;">🎖️ Role Assigned</h2>
        <p>Hi <strong>${toName}</strong>,</p>
        <p>You have been assigned the role of <strong>${role}</strong> in the stokvel group <strong>${groupName}</strong>.</p>
        ${role === "Treasurer" ? `
        <p>As Treasurer you can:</p>
        <ul style="color: #444; line-height: 2;">
          <li>Confirm member payments</li>
          <li>Flag missing contributions</li>
          <li>Manage payout schedules</li>
          <li>Schedule meetings and post agendas</li>
          <li>Record meeting minutes</li>
        </ul>` : ""}
        <p style="color: #999; font-size: 13px;">Log in to your Stokvel account to get started.</p>
      </div>
    `,
  })
}
async function sendContributionReceiptEmail({ toEmail, toName, groupName, amount, reference, date }) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: `Payment Confirmed — ${groupName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2e7d32;">Payment Confirmed ✅</h2>
        <p>Hi ${toName},</p>
        <p>Your contribution to <strong>${groupName}</strong> has been received successfully.</p>
        
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Amount:</strong> R${amount}</p>
          <p style="margin: 4px 0;"><strong>Date:</strong> ${date}</p>
          <p style="margin: 4px 0;"><strong>Reference:</strong> ${reference}</p>
          <p style="margin: 4px 0;"><strong>Group:</strong> ${groupName}</p>
        </div>

        <p>Thank you for your contribution!</p>
      </div>
    `,
  })
}

module.exports = {
  sendInviteEmail,
  sendMeetingNotification,
  sendMissingContributionEmail,
  sendMeetingMinutes,
  sendRoleAssignedEmail,
  sendContributionReceiptEmail,
}