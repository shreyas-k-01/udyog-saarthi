import {Router} from 'express';import {getJobs} from '../services/jobs.js';import {matchJob} from '../services/matching.js';import {protect} from '../middleware/auth.js';
const router=Router();
router.get('/',async(req,res)=>{const jobs=await getJobs({search:req.query.search||'',location:req.query.location||''});res.json({jobs,meta:{count:jobs.length,live:jobs.filter(j=>!j.isDemo).length,demo:jobs.filter(j=>j.isDemo).length,updatedAt:new Date().toISOString()}});});
router.get('/recommended',protect,async(req,res)=>{const jobs=await getJobs({location:req.query.location||req.user.location||''});const recommendations=jobs.map(job=>({...job,match:matchJob(req.user,job)})).sort((a,b)=>b.match.score-a.match.score);res.json({jobs:recommendations.slice(0,30)});});
export default router;
