import cron from 'node-cron';
import Application from '../models/Application.js';
import User from '../models/User.js';
import { memory } from '../store.js';
import { sendEmail, emailHtml } from '../services/email.js';

const dueLabel = value => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

async function notifyCandidate(application, subject, title, message) {
  const candidate = globalThis.mongoReady
    ? await User.findById(application.candidateId).select('name email')
    : memory.users.find(user => user.id === application.candidateId);
  if (candidate?.email) await sendEmail({
    to: candidate.email, subject,
    text: `Hello ${candidate.name}, ${message}`,
    html: emailHtml(title, `Hello ${candidate.name}, ${message}`, `Job: ${application.jobTitle || 'Application'}`)
  });
}

async function notifyEmployer(application, subject, title, message) {
  if (!application.employerId || !globalThis.mongoReady) return;
  const employer = await User.findById(application.employerId).select('name email');
  if (employer?.email) await sendEmail({
    to: employer.email, subject,
    text: `Hello ${employer.name}, ${message}`,
    html: emailHtml(title, `Hello ${employer.name}, ${message}`, `Candidate application: ${application.jobTitle || 'Job'}`)
  });
}

async function notifyAdmin(application) {
  if (!process.env.ADMIN_EMAIL) {
    console.warn('[sla] ADMIN_EMAIL is not configured; overdue escalation recorded but no admin email sent.');
    return;
  }
  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: `Overdue employer review: ${application.jobTitle || 'Application'}`,
    text: `An application has passed its seven-day employer review deadline. Job: ${application.jobTitle}. Candidate application ID: ${application._id || application.id}. Deadline: ${dueLabel(application.reviewDueAt)}. Please follow up with the employer.`,
    html: emailHtml('Employer review deadline missed', 'An application has passed its seven-day review deadline. Please follow up with the employer.', `Job: ${application.jobTitle}. Deadline: ${dueLabel(application.reviewDueAt)}`)
  });
}

async function processApplications(applications, now, persist) {
  for (const app of applications) {
    try {
      const dueAt = new Date(app.reviewDueAt);
      const active = ['submitted', 'reviewing'].includes(app.status);
      if (!active || !app.reviewDueAt) continue;

      const reminderWindow = dueAt.getTime() - now.getTime() <= 24 * 60 * 60 * 1000 && dueAt > now;
      if (reminderWindow && !app.lastReminderAt) {
        await notifyEmployer(app, 'Reminder: application review deadline approaching', 'Application review reminder', `Please review the application for ${app.jobTitle}. The seven-day review deadline is ${dueLabel(app.reviewDueAt)}.`);
        await notifyCandidate(app, 'Your application is awaiting review', 'Your application is awaiting review', `Your application for ${app.jobTitle} is still awaiting the employer's review. The expected review deadline is ${dueLabel(app.reviewDueAt)}.`);
        app.lastReminderAt = now;
        app.events.push({ type: 'sla_reminder', note: 'Reminder sent within 24 hours of review deadline', at: now });
        await persist(app);
      }

      if (dueAt <= now && !app.escalatedAt) {
        app.status = 'overdue';
        app.escalatedAt = now;
        app.events.push({ type: 'sla_escalated', note: 'Employer review deadline passed; flagged for administrator follow-up. Candidate was not rejected.', at: now });
        await persist(app);
        await notifyEmployer(app, 'Action required: application review is overdue', 'Application review is overdue', `The seven-day deadline to review the application for ${app.jobTitle} has passed. Please review it as soon as possible.`);
        await notifyCandidate(app, 'Your application review is delayed', 'Your application review is delayed', `The employer has not reviewed your application for ${app.jobTitle} within seven days. It remains active and has not been rejected. The platform administrator has been notified.`);
        await notifyAdmin(app);
        console.log(`[sla] Escalated overdue application ${app._id || app.id}`);
      }
    } catch (error) {
      console.error('[sla] Could not process application:', app._id || app.id, error.message);
    }
  }
}

export function startSlaWorker() {
  cron.schedule('0 * * * *', async () => {
    const now = new Date();
    try {
      if (globalThis.mongoReady) {
        const candidates = await Application.find({
          status: { $in: ['submitted', 'reviewing'] },
          reviewDueAt: { $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
          $or: [{ lastReminderAt: null }, { lastReminderAt: { $exists: false } }, { escalatedAt: null }]
        });
        await processApplications(candidates, now, app => app.save());
      } else {
        await processApplications(memory.applications, now, async () => {});
      }
    } catch (error) {
      console.error('[sla] Worker error:', error.message);
    }
  });
  console.log('SLA worker scheduled: hourly reminders and overdue escalation');
}
