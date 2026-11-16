import { demoJobs } from '../data.js';
const clean = (s='') => String(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
export async function getJobs({search='',location=''}={}) {
  let jobs = [...demoJobs];
  try {
    const url = new URL('https://remotive.com/api/remote-jobs'); if (search) url.searchParams.set('search',search);
    const r = await fetch(url,{signal:AbortSignal.timeout(7000)}); if (r.ok) { const data=await r.json(); jobs.push(...(data.jobs||[]).slice(0,30).map(j=>({id:`remotive-${j.id}`,title:j.title,company:j.company_name,location:j.candidate_required_location||'Remote',category:j.category,type:j.job_type,remote:true,skills:[],description:clean(j.description).slice(0,1200),source:'Remotive',isDemo:false,url:j.url,createdAt:j.publication_date}))); }
  } catch { /* keep available listings */ }
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
    try { const q=new URL('https://api.adzuna.com/v1/api/jobs/in/search/1'); q.searchParams.set('app_id',process.env.ADZUNA_APP_ID);q.searchParams.set('app_key',process.env.ADZUNA_APP_KEY);q.searchParams.set('results_per_page','20');q.searchParams.set('what',search||'');q.searchParams.set('where',location||'Bangalore');
      const r=await fetch(q,{signal:AbortSignal.timeout(7000)});if(r.ok){const d=await r.json();jobs.push(...(d.results||[]).map(j=>({id:`adzuna-${j.id}`,title:j.title,company:j.company?.display_name||'Employer',location:j.location?.display_name||'India',category:j.category?.label||'Other',type:j.contract_type||'Not specified',remote:false,skills:[],description:clean(j.description),source:'Adzuna',isDemo:false,url:j.redirect_url,createdAt:j.created})));}
    } catch {}
  }
  const unique=[...new Map(jobs.map(j=>[j.id,j])).values()];
  return unique.filter(j=>(!search||`${j.title} ${j.company} ${j.description} ${j.category}`.toLowerCase().includes(search.toLowerCase()))&&(!location||`${j.location}`.toLowerCase().includes(location.toLowerCase())||j.remote));
}
