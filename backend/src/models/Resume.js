import mongoose from 'mongoose';
const resumeSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fileName: { type: String, required: true },
  analysis: { type: mongoose.Schema.Types.Mixed, required: true },
  analyzedAt: { type: Date, default: Date.now }
}, { timestamps: true });
export default mongoose.model('Resume', resumeSchema);
