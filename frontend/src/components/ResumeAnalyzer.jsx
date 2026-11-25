import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, RefreshCw, Sparkles, Trash2, Upload } from 'lucide-react';
import { api } from '../lib/api';
import './resume.css';

export default function ResumeAnalyzer({ notify }) {
  const [file, setFile] = useState(null);
  const [resume, setResume] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadHistory() {
    try {
      const data = await api('/resumes/mine');
      setHistory(data.resumes || []);
      setResume(current => current || data.resumes?.[0] || null);
    } catch (error) {
      notify(error.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { loadHistory(); }, []);

  async function analyze(event) {
    event.preventDefault();
    if (!file) return notify('Choose a PDF resume first.');
    const body = new FormData();
    body.append('resume', file);
    setBusy(true);
    try {
      const data = await api('/resumes/upload', { method: 'POST', body });
      setResume(data.resume);
      setFile(null);
      event.target.reset();
      await loadHistory();
      notify('Resume analysis completed.');
    } catch (error) {
      notify(error.message);
    } finally { setBusy(false); }
  }

  async function remove(id) {
    try {
      await api(`/resumes/${id}`, { method: 'DELETE' });
      if (resume?.id === id) setResume(null);
      await loadHistory();
      notify('Analysis deleted.');
    } catch (error) { notify(error.message); }
  }

  const analysis = resume?.analysis;
  return (
    <div className="resume-page">
      <section className="panel resume-upload-panel">
        <div className="panel-title">
          <div><span className="eyebrow">AI CAREER TOOL</span><h2>Resume Analyzer</h2></div>
          <div className="round-icon blue"><FileText /></div>
        </div>
        <p className="muted">Upload a PDF resume (maximum 5 MB) to review its structure, detected skills and improvement opportunities.</p>
        <form onSubmit={analyze}>
          <label className="resume-dropzone">
            <Upload size={25} />
            <b>{file ? file.name : 'Choose your resume PDF'}</b>
            <span>PDF only · up to 5 MB</span>
            <input type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
          <button className="primary-btn" type="submit" disabled={busy || !file}>
            {busy ? 'Analyzing…' : <><Sparkles size={16} /> Analyze resume</>}
          </button>
        </form>
        <p className="resume-privacy">Your resume is used to generate this analysis and the results are saved to your account. Avoid uploading documents containing information you do not want processed.</p>
      </section>

      {analysis && (
        <>
          <div className="resume-result-heading">
            <div><span className="eyebrow">LATEST REVIEW</span><h2>{resume.fileName}</h2><p className="muted">{analysis.poweredBy || 'Resume analysis'} · {resume.analyzedAt ? new Date(resume.analyzedAt).toLocaleString() : ''}</p></div>
            <button className="secondary-btn" onClick={() => remove(resume.id)}><Trash2 size={15} /> Delete</button>
          </div>
          <div className="resume-score-grid">
            <section className="panel resume-score-card"><span className="eyebrow">RESUME COMPLETENESS</span><div className="resume-score">{analysis.qualityScore}<small>/100</small></div><p className="muted">{analysis.scoreExplanation}</p></section>
            <section className="panel resume-summary-card"><span className="eyebrow">SUMMARY</span><p>{analysis.summary}</p></section>
          </div>
          <section className="panel"><div className="panel-title"><div><span className="eyebrow">EXTRACTED INFORMATION</span><h2>Detected skills</h2></div></div>
            {analysis.detectedSkills?.length ? <div className="resume-skill-list">{analysis.detectedSkills.map(skill => <span key={skill}>{skill}</span>)}</div> : <p className="muted">No skills were confidently detected.</p>}
          </section>
          <section className="panel"><div className="panel-title"><div><span className="eyebrow">STRUCTURE REVIEW</span><h2>Resume sections</h2></div></div>
            <div className="resume-section-list">{(analysis.sections || []).map((section,index) => <div key={section.name+index} className="resume-section-row">{section.present ? <CheckCircle2 size={17} className="resume-good"/> : <AlertCircle size={17} className="resume-warning"/>}<span>{section.name}</span><b>{section.present ? 'Detected' : 'Not detected'}</b></div>)}</div>
          </section>
          <div className="resume-score-grid">
            <section className="panel"><span className="eyebrow">WHAT WORKS</span><h2>Strengths</h2>{analysis.strengths?.length ? <ul className="resume-list">{analysis.strengths.map((x,i)=><li key={i}>{x}</li>)}</ul> : <p className="muted">No specific strengths identified.</p>}</section>
            <section className="panel"><span className="eyebrow">AREAS TO IMPROVE</span><h2>Issues</h2>{analysis.issues?.length ? <ul className="resume-list">{analysis.issues.map((x,i)=><li key={i}><b>{x.section}:</b> {x.problem}<span>{x.recommendation}</span></li>)}</ul> : <p className="muted">No major issues identified.</p>}</section>
          </div>
          <section className="panel"><span className="eyebrow">ACTION PLAN</span><h2>Recommendations</h2><ol className="resume-list">{(analysis.recommendations || []).map((x,i)=><li key={i}>{x}</li>)}</ol></section>
        </>
      )}

      <section className="panel resume-history">
        <div className="panel-title"><div><span className="eyebrow">YOUR FILES</span><h2>Analysis history</h2></div><button className="secondary-btn" onClick={loadHistory}><RefreshCw size={15}/> Refresh</button></div>
        {loading ? <p className="muted">Loading history…</p> : history.length ? history.map(item => <div className="resume-history-row" key={item.id}><button className="resume-history-open" onClick={() => setResume(item)}><FileText size={18}/><span><b>{item.fileName}</b><small>{item.analyzedAt ? new Date(item.analyzedAt).toLocaleString() : 'Saved analysis'}</small></span></button><button className="icon-btn" title="Delete analysis" onClick={() => remove(item.id)}><Trash2 size={16}/></button></div>) : <p className="muted">No resume analyses yet. Upload a PDF to get started.</p>}
      </section>
    </div>
  );
}
