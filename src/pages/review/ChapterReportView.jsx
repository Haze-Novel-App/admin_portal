// import React from 'react';
// import { 
//   ArrowLeft, Calendar, CheckCircle, AlertTriangle, 
//   BookOpen, Fingerprint, Activity, Check, X 
// } from 'lucide-react';

// export default function ChapterReportView({ report, chapter, onBack, onDecision }) {
//   if (!report) return <div className="p-8 text-center">Loading Report...</div>;

//   const formatDate = (dateString) => {
//     if (!dateString) return 'Just now';
//     return new Date(dateString).toLocaleString('en-US', {
//       year: 'numeric', month: 'long', day: 'numeric', 
//       hour: '2-digit', minute: '2-digit'
//     });
//   };

//   // Helper to render a single sensitivity check
//   const SensitivityItem = ({ label, data }) => {
//     const isSafe = !data?.detected;
//     return (
//       <div style={{
//         display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16,
//         borderRadius: 8, border: `1px solid ${isSafe ? '#C6F6D5' : '#FED7D7'}`,
//         backgroundColor: isSafe ? '#F0FFF4' : '#FFF5F5',
//         marginBottom: 8
//       }}>
//         <div style={{marginTop: 2}}>
//           {isSafe ? <CheckCircle size={18} color="#38A169" /> : <AlertTriangle size={18} color="#E53E3E" />}
//         </div>
//         <div>
//           <h4 style={{margin: '0 0 4px 0', fontSize: 14, fontWeight: 700, color: isSafe ? '#276749' : '#C53030'}}>
//             {label}
//           </h4>
//           {isSafe ? (
//             <p style={{margin: 0, fontSize: 13, color: '#48BB78'}}>
//               No {label.toLowerCase()} detected.
//             </p>
//           ) : (
//             <>
//               <p style={{margin: '0 0 4px 0', fontSize: 13, color: '#C53030', fontWeight: 600}}>
//                 Detected: "{data.examples}"
//               </p>
//               <p style={{margin: 0, fontSize: 12, color: '#9B2C2C', fontStyle: 'italic'}}>
//                 Context: {data.context}
//               </p>
//             </>
//           )}
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div style={{display: 'flex', flexDirection: 'column', height: '100%', background: 'white'}}>
      
//       {/* --- HEADER --- */}
//       <div style={{padding: '20px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff'}}>
//         <div>
//           <button 
//             onClick={onBack}
//             style={{background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 8, color: '#718096', cursor: 'pointer', padding: 0, marginBottom: 8, fontSize: 14}}
//           >
//             <ArrowLeft size={16} /> Back to Chapter List
//           </button>
//           <h2 style={{margin: 0, fontSize: 24, color: '#1A202C'}}>Analysis Report: {chapter.title}</h2>
//           <div style={{display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: '#718096'}}>
//             <span style={{display: 'flex', alignItems: 'center', gap: 4}}>
//               <Calendar size={14} /> Analyzed on: {formatDate(report.created_at)}
//             </span>
//             <span style={{background: '#EDF2F7', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600}}>
//               ID: {report.id?.slice(0, 8)}...
//             </span>
//           </div>
//         </div>
        
//         {/* DECISION BUTTONS (Top Right) */}
//         <div style={{display: 'flex', gap: 12}}>
//            <button 
//              onClick={() => onDecision('rejected')}
//              style={{
//                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', 
//                background: '#FFF5F5', color: '#C53030', border: '1px solid #FED7D7', 
//                borderRadius: 8, fontWeight: 600, cursor: 'pointer'
//              }}
//            >
//              <X size={18} /> Reject
//            </button>
//            <button 
//              onClick={() => onDecision('approved')}
//              style={{
//                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', 
//                background: '#F0FFF4', color: '#2F855A', border: '1px solid #C6F6D5', 
//                borderRadius: 8, fontWeight: 600, cursor: 'pointer'
//              }}
//            >
//              <Check size={18} /> Approve
//            </button>
//         </div>
//       </div>

//       {/* --- SCROLLABLE CONTENT --- */}
//       <div style={{flex: 1, overflowY: 'auto', padding: '32px', backgroundColor: '#F7FAFC'}}>
//         <div style={{maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24}}>

//           {/* 1. OVERVIEW CARD */}
//           <section style={{background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #E2E8F0'}}>
//             <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#2D3748'}}>
//               <BookOpen size={20} color="#3182CE"/> Narrative Overview
//             </h3>
//             <p style={{lineHeight: 1.6, color: '#4A5568', fontSize: 15}}>
//               {report.summary}
//             </p>
//             <div style={{display: 'flex', gap: 12, marginTop: 16}}>
//                <div style={{background: '#EBF8FF', color: '#2C5282', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600}}>
//                  Genre: {report.genre_analysis?.primary}
//                </div>
//                <div style={{background: '#FAF5FF', color: '#553C9A', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600}}>
//                  Target: {report.target_audience}
//                </div>
//                <div style={{background: '#F0FFF4', color: '#276749', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600}}>
//                  Type: {report.chapter_type}
//                </div>
//             </div>
//           </section>

//           <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
            
//             {/* 2. STYLE CARD */}
//             <section style={{background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #E2E8F0'}}>
//               <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#2D3748'}}>
//                 <Fingerprint size={20} color="#805AD5"/> Style & Tone
//               </h3>
//               <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
//                 <div>
//                   <div style={{fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase'}}>Tone</div>
//                   <div style={{color: '#2D3748', fontSize: 14}}>{report.writing_style?.tone}</div>
//                 </div>
//                 <div>
//                   <div style={{fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase'}}>Writing Style</div>
//                   <div style={{color: '#2D3748', fontSize: 14}}>{report.writing_style?.writing_style}</div>
//                 </div>
//                 <div>
//                    <div style={{fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase'}}>Key Patterns</div>
//                    <div style={{color: '#2D3748', fontSize: 14}}>{report.writing_style?.patterns}</div>
//                 </div>
//               </div>
//             </section>

//             {/* 3. SAFETY CARD (The one you asked for) */}
//             <section style={{background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #E2E8F0'}}>
//               <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#2D3748'}}>
//                 <Activity size={20} color="#E53E3E"/> Content Safety Check
//               </h3>
//               <div style={{display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16}}>
//                 <SensitivityItem label="Profanity & Vulgarity" data={report.content_sensitivity?.vulgarity} />
//                 <SensitivityItem label="Sexual Content" data={report.content_sensitivity?.sexual_content} />
//                 <SensitivityItem label="Violence & Gore" data={report.content_sensitivity?.violence} />
//                 <SensitivityItem label="Substance Use" data={report.content_sensitivity?.substance_use} />
//                 <SensitivityItem label="Hate Speech" data={report.content_sensitivity?.hate_speech} />
//               </div>
//             </section>
          
//           </div>

//         </div>
//       </div>
//     </div>
//   );
// }















import React from 'react';
import { 
  ArrowLeft, Calendar, CheckCircle, AlertTriangle, 
  BookOpen, Fingerprint, Activity, Check, X 
} from 'lucide-react';

export default function ChapterReportView({ report, chapter, onBack, onDecision }) {
  if (!report) return <div className="p-8 text-center">Loading Report...</div>;

  const formatDate = (dateString) => {
    if (!dateString) return 'Just now';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', 
      hour: '2-digit', minute: '2-digit'
    });
  };

  const SensitivityItem = ({ label, data }) => {
    const isSafe = !data?.detected;
    return (
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16,
        borderRadius: 8, border: `1px solid ${isSafe ? '#C6F6D5' : '#FED7D7'}`,
        backgroundColor: isSafe ? '#F0FFF4' : '#FFF5F5',
        marginBottom: 8
      }}>
        <div style={{marginTop: 2}}>
          {isSafe ? <CheckCircle size={18} color="#38A169" /> : <AlertTriangle size={18} color="#E53E3E" />}
        </div>
        <div>
          <h4 style={{margin: '0 0 4px 0', fontSize: 14, fontWeight: 700, color: isSafe ? '#276749' : '#C53030'}}>
            {label}
          </h4>
          {isSafe ? (
            <p style={{margin: 0, fontSize: 13, color: '#48BB78'}}>
              No {label.toLowerCase()} detected.
            </p>
          ) : (
            <>
              <p style={{margin: '0 0 4px 0', fontSize: 13, color: '#C53030', fontWeight: 600}}>
                Detected: "{data.examples}"
              </p>
              <p style={{margin: 0, fontSize: 12, color: '#9B2C2C', fontStyle: 'italic'}}>
                Context: {data.context}
              </p>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100%', background: 'white'}}>
      
      {/* HEADER */}
      <div style={{padding: '20px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff'}}>
        <div>
          <button 
            onClick={onBack}
            style={{background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 8, color: '#718096', cursor: 'pointer', padding: 0, marginBottom: 8, fontSize: 14}}
          >
            <ArrowLeft size={16} /> Back to Chapter List
          </button>
          <h2 style={{margin: 0, fontSize: 24, color: '#1A202C'}}>Analysis Report: {chapter.title}</h2>
          <div style={{display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: '#718096'}}>
            <span style={{display: 'flex', alignItems: 'center', gap: 4}}>
              <Calendar size={14} /> Analyzed on: {formatDate(report.created_at)}
            </span>
          </div>
        </div>
        
        <div style={{display: 'flex', gap: 12}}>
           <button 
             onClick={() => onDecision('rejected')}
             style={{
               display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', 
               background: '#FFF5F5', color: '#C53030', border: '1px solid #FED7D7', 
               borderRadius: 8, fontWeight: 600, cursor: 'pointer'
             }}
           >
             <X size={18} /> Reject
           </button>
           <button 
             onClick={() => onDecision('approved')}
             style={{
               display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', 
               background: '#F0FFF4', color: '#2F855A', border: '1px solid #C6F6D5', 
               borderRadius: 8, fontWeight: 600, cursor: 'pointer'
             }}
           >
             <Check size={18} /> Approve
           </button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{flex: 1, overflowY: 'auto', padding: '32px', backgroundColor: '#F7FAFC'}}>
        <div style={{maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24}}>

          {/* 1. OVERVIEW CARD */}
          <section style={{background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #E2E8F0'}}>
            <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#2D3748'}}>
              <BookOpen size={20} color="#3182CE"/> Narrative Overview
            </h3>
            <p style={{lineHeight: 1.6, color: '#4A5568', fontSize: 15, marginBottom: 20}}>
              {report.summary}
            </p>
            
            {/* TAGS ROW */}
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center'}}>
               
               {/* Primary Genre */}
               <div style={{background: '#EBF8FF', color: '#2C5282', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700, border: '1px solid #BEE3F8'}}>
                 {report.genre_analysis?.primary}
               </div>

               {/* --- NEW: Sub-Genres --- */}
               {report.genre_analysis?.sub_genres?.map((sub, index) => (
                 <div key={index} style={{background: '#F7FAFC', color: '#4A5568', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500, border: '1px solid #EDF2F7'}}>
                   {sub}
                 </div>
               ))}

               {/* Divider */}
               <div style={{height: 20, width: 1, background: '#E2E8F0', margin: '0 8px'}}></div>

               {/* Audience & Type */}
               <div style={{background: '#FAF5FF', color: '#553C9A', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600}}>
                 Target: {report.target_audience}
               </div>
               <div style={{background: '#F0FFF4', color: '#276749', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600}}>
                 Type: {report.chapter_type}
               </div>
            </div>
          </section>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
            
            {/* 2. STYLE CARD */}
            <section style={{background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #E2E8F0'}}>
              <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#2D3748'}}>
                <Fingerprint size={20} color="#805AD5"/> Style & Tone
              </h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
                <div>
                  <div style={{fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: 4}}>Tone</div>
                  <div style={{color: '#2D3748', fontSize: 14, lineHeight: 1.5}}>{report.writing_style?.tone}</div>
                </div>
                <div>
                  <div style={{fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: 4}}>Writing Style</div>
                  <div style={{color: '#2D3748', fontSize: 14, lineHeight: 1.5}}>{report.writing_style?.writing_style}</div>
                </div>
                <div>
                   <div style={{fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: 4}}>Key Patterns</div>
                   <div style={{color: '#2D3748', fontSize: 14, lineHeight: 1.5}}>{report.writing_style?.patterns}</div>
                </div>
              </div>
            </section>

            {/* 3. SAFETY CARD */}
            <section style={{background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #E2E8F0'}}>
              <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#2D3748'}}>
                <Activity size={20} color="#E53E3E"/> Content Safety Check
              </h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16}}>
                <SensitivityItem label="Profanity & Vulgarity" data={report.content_sensitivity?.vulgarity} />
                <SensitivityItem label="Sexual Content" data={report.content_sensitivity?.sexual_content} />
                <SensitivityItem label="Violence & Gore" data={report.content_sensitivity?.violence} />
                <SensitivityItem label="Substance Use" data={report.content_sensitivity?.substance_use} />
                <SensitivityItem label="Hate Speech" data={report.content_sensitivity?.hate_speech} />
              </div>
            </section>
          
          </div>

        </div>
      </div>
    </div>
  );
}