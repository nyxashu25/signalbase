import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../middleware/errorHandler.js';
import { sendEmail } from './resendService.js';
import { signUnsubscribeToken, verifyUnsubscribeToken } from './tokenService.js';

const BRAND_COLOR = '#9400de';

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/**
 * Every value interpolated into an email template that ultimately traces
 * back to user input (a name, a workspace name someone chose at signup, a
 * ticket subject, a contact-form message) must go through this — none of
 * these fields are otherwise restricted from containing `<`/`>`, and the
 * contact form in particular is unauthenticated.
 */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/**
 * One shared wrapper so every notification email looks like it came from
 * the same product, without a templating dependency — these are simple
 * enough that a template string is clearer than a build step.
 */
function baseTemplate({ heading, bodyHtml, ctaLabel, ctaUrl, footerHtml }) {
  return `
    <div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <p style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${BRAND_COLOR}; margin: 0 0 24px;">DataPit</p>
      <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 16px;">${heading}</h1>
      <div style="font-size: 15px; line-height: 1.6; color: #333;">${bodyHtml}</div>
      ${
        ctaUrl
          ? `<p style="margin: 28px 0;"><a href="${ctaUrl}" style="display: inline-block; background: ${BRAND_COLOR}; color: #fff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 6px;">${ctaLabel}</a></p>`
          : ''
      }
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0 16px;" />
      <p style="font-size: 12px; color: #888; line-height: 1.5;">${footerHtml ?? '&mdash; The DataPit team'}</p>
    </div>
  `;
}

async function send(to, subject, html) {
  return sendEmail({ to, subject, html });
}

export async function sendEmailVerification(user, token) {
  const url = `${env.CORS_ORIGIN}/verify-email?token=${token}`;
  await send(
    user.email,
    'Confirm your DataPit account',
    baseTemplate({
      heading: 'Confirm your email',
      bodyHtml: `<p>Hi ${escapeHtml(user.name)},</p><p>Click below to confirm your email and activate your DataPit account. This link expires in 24 hours.</p>`,
      ctaLabel: 'Confirm email',
      ctaUrl: url,
    }),
  );
}

/**
 * Fired once, the moment an account first becomes verified — immediately
 * after Google sign-in creates a new account (Google already verified the
 * email), or after a password account clicks its confirm link. Sends the
 * user a welcome email and every super admin a heads-up.
 */
export async function notifyAccountVerified(user, workspace) {
  await send(
    user.email,
    'Welcome to DataPit',
    baseTemplate({
      heading: `Welcome, ${escapeHtml(user.name)}`,
      bodyHtml: `<p>Your workspace <strong>${escapeHtml(workspace.name)}</strong> is ready. You've got free credits to start finding and reveal­ing verified contacts right away.</p>`,
      ctaLabel: 'Go to your dashboard',
      ctaUrl: `${env.CORS_ORIGIN}/app`,
    }),
  );

  const admins = await prisma.superAdmin.findMany({ select: { email: true } });
  if (admins.length === 0) return;

  const adminHtml = baseTemplate({
    heading: 'New account created',
    bodyHtml: `<p><strong>${escapeHtml(user.name)}</strong> (${escapeHtml(user.email)}) just created workspace <strong>${escapeHtml(workspace.name)}</strong>.</p>`,
    footerHtml: '&mdash; DataPit system notification',
  });
  await Promise.allSettled(admins.map((a) => send(a.email, 'New DataPit signup', adminHtml)));
}

export async function sendPasswordReset(user, token) {
  const url = `${env.CORS_ORIGIN}/reset-password?token=${token}`;
  await send(
    user.email,
    'Reset your DataPit password',
    baseTemplate({
      heading: 'Reset your password',
      bodyHtml: `<p>Hi ${escapeHtml(user.name)},</p><p>Click below to choose a new password. This link expires in 1 hour and can be used once. If you didn't ask for this, you can safely ignore it — your password is unchanged.</p>`,
      ctaLabel: 'Choose a new password',
      ctaUrl: url,
    }),
  );
}

export async function sendWorkspaceInvite({ email, inviterName, workspaceName, role, token }) {
  const url = `${env.CORS_ORIGIN}/accept-invite?token=${token}`;
  await send(
    email,
    `${inviterName} invited you to ${workspaceName} on DataPit`,
    baseTemplate({
      heading: `Join ${escapeHtml(workspaceName)}`,
      bodyHtml: `<p><strong>${escapeHtml(inviterName)}</strong> invited you to join the workspace <strong>${escapeHtml(workspaceName)}</strong> on DataPit as ${role === 'ADMIN' ? 'an admin' : 'a member'}.</p><p>This invite expires in 7 days.</p>`,
      ctaLabel: 'Accept invite',
      ctaUrl: url,
    }),
  );
}

export async function notifyInviteAccepted(inviter, newUser, workspace) {
  await send(
    inviter.email,
    `${newUser.name} joined ${workspace.name}`,
    baseTemplate({
      heading: 'Your invite was accepted',
      bodyHtml: `<p><strong>${escapeHtml(newUser.name)}</strong> (${escapeHtml(newUser.email)}) accepted your invite and joined <strong>${escapeHtml(workspace.name)}</strong>.</p>`,
      ctaLabel: 'See your team',
      ctaUrl: `${env.CORS_ORIGIN}/app/settings/members`,
    }),
  );
}

export async function sendTicketCreatedConfirmation(user, ticket) {
  await send(
    user.email,
    `We've received your ticket: ${ticket.subject}`,
    baseTemplate({
      heading: 'Ticket received',
      bodyHtml: `<p>Hi ${escapeHtml(user.name)},</p><p>We've received your ticket <strong>${escapeHtml(ticket.subject)}</strong> and will get back to you shortly.</p>`,
      ctaLabel: 'View ticket',
      ctaUrl: `${env.CORS_ORIGIN}/app/tickets/${ticket.id}`,
    }),
  );
}

export async function sendTicketReplyNotification(user, ticket) {
  await send(
    user.email,
    `Support replied: ${ticket.subject}`,
    baseTemplate({
      heading: 'Support replied to your ticket',
      bodyHtml: `<p>Hi ${escapeHtml(user.name)},</p><p>There's a new reply on your ticket <strong>${escapeHtml(ticket.subject)}</strong>.</p>`,
      ctaLabel: 'View reply',
      ctaUrl: `${env.CORS_ORIGIN}/app/tickets/${ticket.id}`,
    }),
  );
}

export async function sendTicketClosedNotification(user, ticket) {
  await send(
    user.email,
    `Ticket closed: ${ticket.subject}`,
    baseTemplate({
      heading: 'Your ticket was closed',
      bodyHtml: `<p>Hi ${escapeHtml(user.name)},</p><p>Your ticket <strong>${escapeHtml(ticket.subject)}</strong> has been marked closed. Reply on it any time to reopen.</p>`,
      ctaLabel: 'View ticket',
      ctaUrl: `${env.CORS_ORIGIN}/app/tickets/${ticket.id}`,
    }),
  );
}

export async function sendCreditPurchaseReceipt(user, amount, amountCents) {
  const priceLabel = amountCents ? `$${(amountCents / 100).toFixed(2)}` : null;
  await send(
    user.email,
    `Receipt: ${amount} DataPit credits`,
    baseTemplate({
      heading: 'Credits added',
      bodyHtml: `<p>Hi ${escapeHtml(user.name)},</p><p>Your purchase of <strong>${amount} credits</strong>${priceLabel ? ` (${priceLabel})` : ''} is complete and available in your workspace now.</p>`,
      ctaLabel: 'View billing',
      ctaUrl: `${env.CORS_ORIGIN}/app/billing`,
    }),
  );
}

export async function sendPlanActivated(user, plan, interval) {
  await send(
    user.email,
    `Your plan is now ${plan}`,
    baseTemplate({
      heading: 'Plan activated',
      bodyHtml: `<p>Hi ${escapeHtml(user.name)},</p><p>Your workspace is now on the <strong>${plan}</strong> plan${interval ? ` (billed ${interval.toLowerCase()})` : ''}.</p>`,
      ctaLabel: 'View billing',
      ctaUrl: `${env.CORS_ORIGIN}/app/billing`,
    }),
  );
}

export async function sendAdminCreditsAdded(user, amount) {
  await send(
    user.email,
    `${amount} credits added to your workspace`,
    baseTemplate({
      heading: 'Credits added by support',
      bodyHtml: `<p>Hi ${escapeHtml(user.name)},</p><p>Our support team added <strong>${amount} credits</strong> to your workspace.</p>`,
      ctaLabel: 'View billing',
      ctaUrl: `${env.CORS_ORIGIN}/app/billing`,
    }),
  );
}

export async function sendAdminPlanChanged(user, plan) {
  await send(
    user.email,
    `Your plan was changed to ${plan}`,
    baseTemplate({
      heading: 'Plan updated by support',
      bodyHtml: `<p>Hi ${escapeHtml(user.name)},</p><p>Our support team changed your workspace's plan to <strong>${plan}</strong>.</p>`,
      ctaLabel: 'View billing',
      ctaUrl: `${env.CORS_ORIGIN}/app/billing`,
    }),
  );
}

export async function sendMonthlyCreditsRenewed(user, amount) {
  await send(
    user.email,
    `${amount} credits renewed`,
    baseTemplate({
      heading: 'Your monthly credits are in',
      bodyHtml: `<p>Hi ${escapeHtml(user.name)},</p><p>Your plan's monthly grant of <strong>${amount} credits</strong> just landed in your workspace.</p>`,
      ctaLabel: 'View billing',
      ctaUrl: `${env.CORS_ORIGIN}/app/billing`,
    }),
  );
}

/**
 * Admin-composed broadcast to every opted-in user (see
 * adminService.sendPromotionalBroadcast for the recipient filter). Each
 * email carries a per-user, no-expiry unsubscribe link.
 */
export async function sendPromotionalBroadcast(users, subject, bodyHtml) {
  const results = await Promise.allSettled(
    users.map((user) => {
      const unsubscribeUrl = `${env.CORS_ORIGIN}/unsubscribe?token=${signUnsubscribeToken(user.id)}`;
      return send(
        user.email,
        subject,
        baseTemplate({
          heading: subject,
          bodyHtml,
          footerHtml: `You're receiving this because you have a DataPit account. <a href="${unsubscribeUrl}" style="color: #888;">Unsubscribe</a>`,
        }),
      );
    }),
  );

  // sendEmail never throws (see resendService.js) — a failure shows up as a
  // fulfilled promise whose value has sent:false, not a rejection.
  const failed = results.filter((r) => r.status === 'rejected' || r.value?.sent === false).length;
  if (failed > 0) {
    logger.error({ failed, total: users.length }, 'Some promotional broadcast sends failed');
  }
  return { attempted: users.length, failed };
}

/**
 * Forwards a marketing Contact-page / in-app support-chat submission to
 * every super admin — the closest thing this app has to a sales inbox,
 * since there's no CRM integration (see TODO.md, explicitly deferred).
 */
export async function sendContactFormLead({ name, email, company, message, category }) {
  const admins = await prisma.superAdmin.findMany({ select: { email: true } });
  if (admins.length === 0) return;

  const categoryLabel = { general: 'General inquiry', support: 'Support', enterprise: 'Enterprise' }[
    category
  ] ?? category;

  const html = baseTemplate({
    heading: `New contact form lead — ${categoryLabel}`,
    bodyHtml: `
      <p><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)})${company ? ` at <strong>${escapeHtml(company)}</strong>` : ''}</p>
      <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
    `,
    footerHtml: '&mdash; DataPit system notification',
  });
  await Promise.allSettled(admins.map((a) => send(a.email, `New lead: ${categoryLabel}`, html)));
}

/** The click-target for every promotional email's unsubscribe link (see routes/notifications.js). */
export async function unsubscribeUser(token) {
  let payload;
  try {
    payload = verifyUnsubscribeToken(token);
  } catch {
    throw new ApiError(400, 'Invalid unsubscribe link');
  }

  await prisma.user.update({ where: { id: payload.sub }, data: { marketingOptOut: true } });
  return { unsubscribed: true };
}
