const nodemailer = require("nodemailer");
const logger = require("../config/logger");
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendInviteEmail = async ({ to, inviterName, orgName, token }) => {
  const inviteUrl = `${process.env.CLIENT_URL}/invite/${token}`;

  const mailOptions = {
    from: `"Ops Console" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `${inviterName} invited you to join ${orgName} on Ops Console`,
    html: `
      <h2>You've been invited!</h2>
      <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong>.</p>
      <p>Click the link below to accept the invitation (expires in 7 days):</p>
      <a href="${inviteUrl}" style="
        display:inline-block;
        padding:12px 24px;
        background:#4f46e5;
        color:white;
        border-radius:6px;
        text-decoration:none;
        font-weight:bold;
      ">Accept Invitation</a>
      <p>Or copy this link: <code>${inviteUrl}</code></p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Invite email sent to ${to}`);
  } catch (error) {
    logger.error(`Failed to send invite email to ${to}: ${error.message}`);
  }
};

module.exports = { sendInviteEmail };
