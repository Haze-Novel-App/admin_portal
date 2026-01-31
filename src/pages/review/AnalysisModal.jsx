import React from 'react';
import { X, AlertTriangle, BookOpen, Fingerprint, Activity, List } from 'lucide-react';

export default function AnalysisModal({ isOpen, onClose, report, chapterTitle }) {
  if (!isOpen || !report) return null;

  // Helper for sensitivity badges
  const SensitivityBadge = ({ label, data }) => {
    if (!data?.detected) return null;
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 4, 
        padding: 12, background: '#FFF5F5', borderRadius: 8, border: '1px solid #FED7D7'
      }}>
        <div style={{display:'flex', alignItems:'center', gap:6, fontWeight:600, color:'#C53030'}}>
          <AlertTriangle size={14} /> {label} Detected
        </div>
        <div style={{fontSize:13, color:'#742A2A'}}>"{data.examples}"</div>
        <div style={{fontSize:12, color:'#9B2C2C', fontStyle:'italic'}}>{data.context}</div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'white', width: '90%', maxWidth: '800px', maxHeight: '85vh',
        borderRadius: 16, display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        
        {/* HEADER */}
        <div style={{padding: 24, borderBottom: '1px solid #E2E8F0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <h2 style={{margin:0, fontSize:20, color:'#1A202C'}}>AI Analysis Report</h2>
            <p style={{margin:'4px 0 0', color:'#718096', fontSize:14}}>Chapter: {chapterTitle}</p>
          </div>
          <button onClick={onClose} style={{background:'none', border:'none', cursor:'pointer', padding:8, borderRadius:8, color:'#718096'}}>
            <X size={24} />
          </button>
        </div>

        {/* CONTENT */}
        <div style={{padding: 24, overflowY: 'auto', display:'flex', flexDirection:'column', gap: 24}}>
          
          {/* 1. OVERVIEW SECTION */}
          <section>
            <h3 style={{fontSize:16, fontWeight:700, color:'#2D3748', display:'flex', alignItems:'center', gap:8, marginBottom:12}}>
              <BookOpen size={18} color="#3182CE"/> Overview & Genre
            </h3>
            <div style={{background:'#F7FAFC', padding:16, borderRadius:12}}>
              <p style={{margin:'0 0 12px 0', lineHeight:1.6, color:'#4A5568'}}>
                <strong>Summary:</strong> {report.summary}
              </p>
              <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
                <span style={{background:'#EBF8FF', color:'#2B6CB0', padding:'4px 12px', borderRadius:16, fontSize:12, fontWeight:600}}>
                  {report.genre_analysis?.primary}
                </span>
                <span style={{background:'#EDF2F7', color:'#4A5568', padding:'4px 12px', borderRadius:16, fontSize:12, fontWeight:600}}>
                  Target: {report.target_audience}
                </span>
                <span style={{background:'#F0FFF4', color:'#2F855A', padding:'4px 12px', borderRadius:16, fontSize:12, fontWeight:600}}>
                  Pacing: {report.chapter_type}
                </span>
              </div>
            </div>
          </section>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
            {/* 2. STYLE & TONE */}
            <section>
              <h3 style={{fontSize:16, fontWeight:700, color:'#2D3748', display:'flex', alignItems:'center', gap:8, marginBottom:12}}>
                <Fingerprint size={18} color="#805AD5"/> Style & Tone
              </h3>
              <ul style={{margin:0, padding:'0 0 0 16px', color:'#4A5568', lineHeight:1.6, fontSize:14}}>
                <li><strong>Tone:</strong> {report.writing_style?.tone}</li>
                <li><strong>Style:</strong> {report.writing_style?.writing_style}</li>
                <li><strong>Patterns:</strong> {report.writing_style?.patterns}</li>
              </ul>
            </section>

             {/* 3. THEMES */}
             <section>
              <h3 style={{fontSize:16, fontWeight:700, color:'#2D3748', display:'flex', alignItems:'center', gap:8, marginBottom:12}}>
                <List size={18} color="#D69E2E"/> Key Themes
              </h3>
              <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
                {/* Check if themes is an array (it should be), otherwise fallback */}
                {(Array.isArray(report.genre_analysis?.themes) 
                    ? report.genre_analysis.themes 
                    : (report.overview?.themes || [])
                 ).map((theme, i) => (
                  <span key={i} style={{border:'1px solid #E2E8F0', color:'#4A5568', padding:'4px 10px', borderRadius:6, fontSize:13}}>
                    {theme}
                  </span>
                ))}
              </div>
            </section>
          </div>

          {/* 4. CONTENT SENSITIVITY */}
          <section>
            <h3 style={{fontSize:16, fontWeight:700, color:'#2D3748', display:'flex', alignItems:'center', gap:8, marginBottom:12}}>
              <Activity size={18} color="#E53E3E"/> Content Sensitivity
            </h3>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
              {/* Check if any sensitivity detected */}
              {!Object.values(report.content_sensitivity || {}).some(x => x?.detected) && (
                 <div style={{gridColumn:'1 / -1', padding:16, background:'#F0FFF4', color:'#2F855A', borderRadius:8, fontSize:14}}>
                   ✅ No sensitive content detected. Safe for all audiences.
                 </div>
              )}

              <SensitivityBadge label="Profanity" data={report.content_sensitivity?.vulgarity} />
              <SensitivityBadge label="Sexual Content" data={report.content_sensitivity?.sexual_content} />
              <SensitivityBadge label="Violence" data={report.content_sensitivity?.violence} />
              <SensitivityBadge label="Substance Use" data={report.content_sensitivity?.substance_use} />
              <SensitivityBadge label="Hate Speech" data={report.content_sensitivity?.hate_speech} />
            </div>
          </section>

        </div>

        {/* FOOTER */}
        <div style={{padding: 24, borderTop: '1px solid #E2E8F0', display:'flex', justifyContent:'flex-end'}}>
          <button 
            onClick={onClose}
            style={{
              padding: '10px 24px', background:'#3182CE', color:'white', border:'none', 
              borderRadius:8, fontWeight:600, cursor:'pointer'
            }}
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}