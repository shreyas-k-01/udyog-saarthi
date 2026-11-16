import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, email: { type: String, required: true, unique: true, lowercase: true }, passwordHash: { type: String, required: true },
  role: { type: String, enum: ['candidate','employer','admin'], default: 'candidate' }, skills: [String], education: String, experience: String, interests: [String], location: String, accommodations: [String]
}, { timestamps: true });
export default mongoose.model('User', userSchema);
