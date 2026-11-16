import mongoose from 'mongoose';
export async function connectDB() {
  if (!process.env.MONGODB_URI) { console.warn('MONGODB_URI not set: running in demo memory mode.'); return false; }
  try { await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 4000 }); console.log('MongoDB connected'); return true; }
  catch (err) { console.warn('MongoDB unavailable; using demo memory mode:', err.message); return false; }
}
