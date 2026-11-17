import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobId: { type: String, required: true },
  jobTitle: String,
  company: String,
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['submitted', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'withdrawn', 'overdue'], default: 'submitted' },
  submittedAt: { type: Date, default: Date.now },
  reviewDueAt: Date,
  lastReminderAt: Date,
  escalatedAt: Date,
  events: [{ type: { type: String }, note: String, at: { type: Date, default: Date.now } }]
}, { timestamps: true });

applicationSchema.index({ status: 1, reviewDueAt: 1 });
export default mongoose.model('Application', applicationSchema);
