import { Router } from 'express';
import multer from 'multer';
import Resume from '../models/Resume.js';
import { protect, allow } from '../middleware/auth.js';
import { memory } from '../store.js';
import { extractResumeText } from '../services/resumeParser.js';
import { analyzeResume } from '../services/resumeAnalyzer.js';
const router=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1},fileFilter:(req,file,cb)=>{
 if(file.mimetype!=='application/pdf'||!file.originalname.toLowerCase().endsWith('.pdf')) return cb(new Error('Only PDF resumes are accepted.'));
 cb(null,true);
}});
const uploadPdf=(req,res,next)=>upload.single('resume')(req,res,error=>error?res.status(400).json({message:error.message||'Resume upload failed.'}):next());
const serialize=doc=>({id:String(doc.id||doc._id),fileName:doc.fileName,analysis:doc.analysis,analyzedAt:doc.analyzedAt||doc.createdAt});
router.post('/upload',protect,allow('candidate'),uploadPdf,async(req,res)=>{
 try{
  if(!req.file)return res.status(400).json({message:'Choose a PDF resume to upload.'});
  if(req.file.buffer.subarray(0,5).toString()!=='%PDF-')return res.status(400).json({message:'The uploaded file is not a valid PDF.'});
  const text=await extractResumeText(req.file.buffer),analysis=await analyzeResume(text);
  const fileName=req.file.originalname.split(/[\\/]/).pop().replace(/\0/g,'').slice(0,150)||'resume.pdf';
  const saved=globalThis.mongoReady?await Resume.create({candidateId:req.user._id,fileName,analysis,analyzedAt:new Date()}):{id:crypto.randomUUID(),candidateId:String(req.user.id||req.user._id),fileName,analysis,analyzedAt:new Date()};
  if(!globalThis.mongoReady)memory.resumes.push(saved);
  res.status(201).json({resume:serialize(saved)});
 }catch(error){res.status(422).json({message:error.message||'Could not analyze this resume.'});}
});
router.get('/mine',protect,allow('candidate'),async(req,res)=>{
 try{const docs=globalThis.mongoReady?await Resume.find({candidateId:req.user._id}).sort({createdAt:-1}).select('-__v'):memory.resumes.filter(r=>r.candidateId===String(req.user.id||req.user._id));res.json({resumes:docs.map(serialize)});}
 catch{res.status(500).json({message:'Could not load resume history.'});}
});
router.delete('/:id',protect,allow('candidate'),async(req,res)=>{
 try{let deleted;if(globalThis.mongoReady)deleted=await Resume.findOneAndDelete({_id:req.params.id,candidateId:req.user._id});else{const i=memory.resumes.findIndex(r=>r.id===req.params.id&&r.candidateId===String(req.user.id||req.user._id));if(i>=0)deleted=memory.resumes.splice(i,1)[0];}if(!deleted)return res.status(404).json({message:'Resume analysis not found.'});res.json({message:'Resume analysis deleted.'});}
 catch{res.status(400).json({message:'Could not delete this resume analysis.'});}
});
export default router;
