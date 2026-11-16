const norm = s => String(s||'').toLowerCase().replace(/[^a-z0-9+#. ]/g,' ').trim();
export function matchJob(user,job) {
  const userSkills=(user.skills||[]).map(norm).filter(Boolean); const required=(job.skills?.length?job.skills:extractSkills(job.description)).map(norm).filter(Boolean);
  const matched=required.filter(s=>userSkills.some(u=>u===s||u.includes(s)||s.includes(u)));
  const skillScore=required.length?matched.length/required.length:0.35;
  const interest=(user.interests||[]).some(i=>norm(`${job.title} ${job.category} ${job.description}`).includes(norm(i)))?1:0.4;
  const location= !user.location||norm(job.location).includes(norm(user.location))||job.remote?1:0.5;
  const score=Math.round((skillScore*.65+interest*.2+location*.15)*100);
  return {score,matchedSkills:matched,missingSkills:required.filter(s=>!matched.includes(s)),reason:matched.length?`Matches ${matched.length} of ${required.length} listed skills${interest===1?' and relates to your interests':''}.`:'Potential option based on your interests or location; add skills to your profile for a more useful match.'};
}
function extractSkills(text='') { const dictionary=['excel','data entry','communication','problem solving','computer basics','html','css','javascript','react','organization','ms office','testing','documentation','python','sql','customer service'];const t=norm(text);return dictionary.filter(s=>t.includes(s)); }
