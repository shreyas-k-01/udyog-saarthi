import { Router } from 'express';
import Application from '../models/Application.js';
import User from '../models/User.js';
import { memory } from '../store.js';
import { protect, allow } from '../middleware/auth.js';
import { sendEmail, emailHtml } from '../services/email.js';

const router = Router();
const sla = () => Number(process.env.REVIEW_SLA_DAYS || 7) * 86400000;
const dateLabel = value => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

router.post('/', protect, allow('candidate'), async (req, res) => {
  try {
    const { job } = req.body;
    if (!job?.id || !job?.title) return res.status(400).json({ message: 'Job information is required' });
    const submittedAt = new Date();
    const reviewDueAt = new Date(submittedAt.getTime() + sla());
    const employerId = job.employerId || undefined;
    const data = {
      candidateId: req.user._id || req.user.id, jobId: job.id, jobTitle: job.title, company: job.company,
      employerId, status: 'submitted', submittedAt, reviewDueAt,
      events: [{ type: 'submitted', note: 'Application submitted by candidate', at: submittedAt }]
    };
    let app;
    if (globalThis.mongoReady) app = await Application.create(data);
    else {
      app = { id: crypto.randomUUID(), ...data, candidateName: req.user.name };
      memory.applications.push(app);
    }

    await sendEmail({
      to: req.user.email,
      subject: `Application received: ${job.title}`,
      text: `Hello ${req.user.name}, your application for ${job.title} at ${job.company || 'the employer'} has been received. The employer has seven days to review it. Expected review deadline: ${dateLabel(reviewDueAt)}.`,
      html: emailHtml('Your application has been received', `Hello ${req.user.name}, your application for ${job.title} has been received.`, `Expected employer review deadline: ${dateLabel(reviewDueAt)}`)
    });

    let employerEmail;
    if (employerId && globalThis.mongoReady) {
      const employer = await User.findById(employerId).select('name email');
      employerEmail = employer?.email;
    }
    employerEmail = employerEmail || process.env.EMPLOYER_NOTIFICATION_EMAIL;
    if (employerEmail) await sendEmail({
      to: employerEmail,
      subject: `New candidate application: ${job.title}`,
      text: `${req.user.name} has applied for ${job.title}. Please review this application by ${dateLabel(reviewDueAt)}.`,
      html: emailHtml('You have a new application', `${req.user.name} has applied for ${job.title}.`, `Please review by: ${dateLabel(reviewDueAt)}`)
    });

    res.status(201).json({ application: app });
  } catch (error) {
    console.error('Application submission failed:', error);
    res.status(500).json({ message: 'Could not submit application' });
  }
});

router.get('/mine', protect, async (req, res) => {
  let apps;
  if (globalThis.mongoReady) apps = await Application.find({ candidateId: req.user._id }).sort({ createdAt: -1 });
  else apps = memory.applications.filter(a => a.candidateId === req.user.id);
  res.json({ applications: apps });
});

router.get('/manage', protect, allow('employer', 'admin'), async (req, res) => {
  let apps;
  if (globalThis.mongoReady) {
    const q = req.user.role === 'admin' ? {} : { employerId: req.user._id };
    apps = await Application.find(q).sort({ reviewDueAt: 1 }).lean();
    for (const a of apps) a.candidate = await User.findById(a.candidateId).select('name email skills');
  } else apps = memory.applications.map(a => ({ ...a, candidate: memory.users.find(u => u.id === a.candidateId) }));
  res.json({ applications: apps });
});

router.patch('/:id/status', protect, allow('employer', 'admin'), async (req, res) => {
  try {
    const allowed = ['reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid status' });
    let app;
    let candidate;
    if (globalThis.mongoReady) {
      app = await Application.findById(req.params.id);
      if (!app) return res.status(404).json({ message: 'Application not found' });
      if (req.user.role !== 'admin' && app.employerId && String(app.employerId) !== String(req.user._id)) return res.status(403).json({ message: 'Not your application' });
      app.status = req.body.status;
      app.events.push({ type: req.body.status, note: `Employer changed status to ${req.body.status}` });
      await app.save();
      candidate = await User.findById(app.candidateId).select('name email');
    } else {
      app = memory.applications.find(a => a.id === req.params.id);
      if (!app) return res.status(404).json({ message: 'Application not found' });
      app.status = req.body.status;
      app.events.push({ type: req.body.status, note: `Employer changed status to ${req.body.status}`, at: new Date() });
      candidate = memory.users.find(u => u.id === app.candidateId);
    }

    if (candidate?.email) await sendEmail({
      to: candidate.email,
      subject: `Application update: ${app.jobTitle}`,
      text: `Hello ${candidate.name}, the status of your application for ${app.jobTitle} at ${app.company || 'the employer'} is now: ${req.body.status}.`,
      html: emailHtml('Your application status has changed', `Hello ${candidate.name}, the status of your application for ${app.jobTitle} is now ${req.body.status}.`)
    });
    res.json({ application: app });
  } catch (error) {
    console.error('Application status update failed:', error);
    res.status(500).json({ message: 'Could not update application status' });
  }
});

router.get('/analytics', protect, allow('employer', 'admin'), async (req, res) => {
  let apps;
  if (globalThis.mongoReady) apps = await Application.find(req.user.role === 'admin' ? {} : { employerId: req.user._id }).lean();
  else apps = memory.applications;
  const count = status => apps.filter(a => a.status === status).length;
  res.json({ total: apps.length, pending: count('submitted'), reviewing: count('reviewing'), overdue: count('overdue'), shortlisted: count('shortlisted'), hired: count('hired'), rejected: count('rejected') });
});

export default router;
