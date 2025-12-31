import { createTransporter, EMAIL_SENDER, APP_NAME } from './emailConfig';
import { logger } from '../logging/logger';

interface InvitationEmailParams {
  to: string;
  firstName: string;
  lastName: string;
  inviteLink: string;
  expiresIn: string;
}

/**
 * Send invitation email to new user
 * Contains invite link for account registration
 * User creates their own password during registration
 */
export const sendInvitationEmail = async ({
  to,
  firstName,
  lastName,
  inviteLink,
  expiresIn = '24 hours',
}: InvitationEmailParams): Promise<void> => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"${APP_NAME}" <${EMAIL_SENDER}>`,
    to,
    subject: `You're Invited to Join ${APP_NAME}`,
    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1a73e8; margin-bottom: 10px;">${APP_NAME}</h1>
                </div>

                <h2 style="color: #333;">Welcome, ${firstName} ${lastName}!</h2>

                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                    You've been invited to join <strong>${APP_NAME}</strong>.
                </p>

                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                    Click the button below to accept your invitation and create your account:
                </p>

                <p style="text-align: center; margin: 35px 0;">
                    <a href="${inviteLink}"
                       style="display: inline-block; background: #1a73e8; color: white;
                              padding: 16px 32px; text-decoration: none; border-radius: 6px;
                              font-weight: bold; font-size: 16px;">
                        Accept Invitation & Register
                    </a>
                </p>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1a73e8;">
                    <p style="margin: 0; color: #555;">
                        <strong>📧 Your Email:</strong> ${to}
                    </p>
                    <p style="margin: 10px 0 0 0; color: #777; font-size: 14px;">
                        You'll create your own password during registration.
                    </p>
                </div>

                <p style="color: #888; font-size: 14px;">
                    <strong>⏰ This invitation will expire in ${expiresIn}.</strong>
                </p>

                <p style="color: #888; font-size: 13px; margin-top: 20px;">
                    If the button doesn't work, copy and paste this link into your browser:
                    <br>
                    <a href="${inviteLink}" style="color: #1a73e8; word-break: break-all;">${inviteLink}</a>
                </p>

                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

                <p style="color: #999; font-size: 12px; text-align: center;">
                    If you did not expect this invitation, you can safely ignore this email.
                    <br><br>
                    This is an automated message from ${APP_NAME}.
                </p>
            </div>
        `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Invitation email sent successfully to ${to}`, {
      messageId: info.messageId,
    });
  } catch (error) {
    logger.error('Failed to send invitation email:', {
      to,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      `Email service error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};
