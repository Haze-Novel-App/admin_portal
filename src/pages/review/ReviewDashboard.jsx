


// import { useEffect, useState } from 'react';
// import { supabase } from '../../supabaseClient';
// import { 
//   Book, User, Bot, Check, X, FileText, 
//   Loader, RefreshCw, AlertCircle, Eye 
// } from 'lucide-react';
// import AnalysisModal from './AnalysisModal'; 
// import styles from '../../assets/styles/ReviewDashboard.module.css';

// export default function ReviewDashboard() {
//   const [books, setBooks] = useState([]);
//   const [selectedBook, setSelectedBook] = useState(null);
//   const [chapters, setChapters] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [loadingChapters, setLoadingChapters] = useState(false);

//   // Analysis State
//   const [analyzingIds, setAnalyzingIds] = useState(new Set());
//   const [analyzedIds, setAnalyzedIds] = useState(new Set());
//   const [unlockedIds, setUnlockedIds] = useState(new Set());

//   // Modal State
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [currentReport, setCurrentReport] = useState(null);

//   useEffect(() => {
//     fetchReviewBooks();
//   }, []);

//   async function fetchReviewBooks() {
//     try {
//       const { data, error } = await supabase
//         .from('books')
//         .select('*, chapters!inner(status)') 
//         .eq('chapters.status', 'review')
//         .order('submitted_at', { ascending: false });

//       if (error) throw error;
      
//       const uniqueBooks = Array.from(new Map(data.map(item => [item.id, item])).values());
//       setBooks(uniqueBooks);
//     } catch (error) {
//       console.error('Error fetching books:', error);
//     } finally {
//       setLoading(false);
//     }
//   }

//   // --- UPDATED: Fetch Chapters AND Check for Existing Reports ---
//   async function handleSelectBook(book) {
//     setSelectedBook(book);
//     setLoadingChapters(true);
    
//     // Reset temporary states
//     setUnlockedIds(new Set());
//     setAnalyzingIds(new Set());
//     // Note: We DO NOT reset analyzedIds yet, we will calculate them below
    
//     try {
//       // 1. Fetch Chapters
//       const { data: chapterData, error: chapterError } = await supabase
//         .from('chapters')
//         .select('*')
//         .eq('book_id', book.id)
//         .order('chapter_number', { ascending: true });

//       if (chapterError) throw chapterError;
      
//       const loadedChapters = chapterData || [];
//       setChapters(loadedChapters);

//       // 2. CHECK FOR EXISTING REPORTS (The Fix)
//       if (loadedChapters.length > 0) {
//         const chapterIds = loadedChapters.map(c => c.id);
        
//         const { data: reports, error: reportError } = await supabase
//           .from('chapter_ai_reports')
//           .select('chapter_id')
//           .in('chapter_id', chapterIds);

//         if (reportError) {
//           console.error("Error checking reports:", reportError);
//         } else {
//           // Create a Set of IDs that already have reports
//           const existingReportIds = new Set(reports.map(r => r.chapter_id));
//           setAnalyzedIds(existingReportIds);
//         }
//       } else {
//         setAnalyzedIds(new Set());
//       }
      
//     } catch (error) {
//       console.error('Error loading data:', error);
//       alert('Error loading chapters: ' + error.message);
//     } finally {
//       setLoadingChapters(false);
//     }
//   }

//   const handleViewReport = async (chapter) => {
//     try {
//       const { data, error } = await supabase
//         .from('chapter_ai_reports')
//         .select('*')
//         .eq('chapter_id', chapter.id)
//         .single();

//       if (error) {
//         if (error.code === 'PGRST116') {
//           alert("No report found. Please run Analysis first.");
//         } else {
//           throw error;
//         }
//         return;
//       }

//       setCurrentReport(data);
//       setIsModalOpen(true);
      
//     } catch (error) {
//       console.error("Error fetching report:", error);
//       alert("Could not load report: " + error.message);
//     }
//   };

//   const handleAnalyze = async (chapter) => {
//     if (!chapter.content_url) {
//       alert("Error: No content file found for this chapter.");
//       return;
//     }

//     setAnalyzingIds(prev => new Set(prev).add(chapter.id));

//     try {
//       console.log("=== Starting Analysis ===");
//       let storagePath = chapter.content_url;
      
//       if (storagePath.includes('supabase.co/storage/v1/object/public/chapters/')) {
//         const parts = storagePath.split('/chapters/');
//         if (parts[1]) storagePath = parts[1];
//       }
//       else if (storagePath.startsWith('chapters/')) {
//         storagePath = storagePath.substring(9);
//       }
      
//       console.log("Downloading from:", storagePath);

//       const { data: fileData, error: downloadError } = await supabase
//         .storage
//         .from('chapters')
//         .download(storagePath);

//       if (downloadError) throw new Error(`Storage Error: ${downloadError.message}`);

//       const textContent = await fileData.text(); 
//       if (textContent.length < 10) throw new Error("Chapter content is too short.");

//       const { data: aiReport, error: fnError } = await supabase.functions.invoke('analyze-chapter', {
//         body: { chapterId: chapter.id, chapterText: textContent }
//       });

//       if (fnError) {
//          let errMsg = fnError.message;
//          if(fnError.context) {
//             try { 
//                 const ctx = await fnError.context.json(); 
//                 errMsg = ctx.error || ctx.message || errMsg; 
//             } catch(e) {}
//          }
//          throw new Error(`AI Analysis Failed: ${errMsg}`);
//       }

//       if (!aiReport) throw new Error("AI Analysis returned no data");

//       const { error: dbError } = await supabase
//         .from('chapter_ai_reports')
//         .upsert({
//           chapter_id: chapter.id,
//           genre_analysis: aiReport.genre,
//           content_sensitivity: aiReport.sensitivity,
//           writing_style: aiReport.style,
//           summary: aiReport.overview?.summary || '',
//           chapter_type: aiReport.classification?.type || '',
//           target_audience: aiReport.genre?.target_audience || ''
//         });

//       if (dbError) throw new Error("Database Save Error: " + dbError.message);

//       setAnalyzedIds(prev => new Set(prev).add(chapter.id));
//       alert("Analysis Complete! Report updated.");

//     } catch (error) {
//       console.error("Analysis Failed:", error);
//       alert("Analysis Failed: " + error.message);
//     } finally {
//       setAnalyzingIds(prev => {
//         const next = new Set(prev);
//         next.delete(chapter.id);
//         return next;
//       });
//     }
//   };

//   const handleDecision = async (chapter, decision) => {
//     const actionText = decision === 'approved' ? 'APPROVE' : 'REJECT';
//     if (!confirm(`Are you sure you want to ${actionText} this chapter?`)) return;

//     try {
//       const { error } = await supabase
//         .from('chapters')
//         .update({ status: decision })
//         .eq('id', chapter.id);

//       if (error) throw error;

//       setChapters(prev => prev.map(c => 
//         c.id === chapter.id ? { ...c, status: decision } : c
//       ));

//       // After approval/rejection, we generally keep the report viewable, 
//       // but strictly speaking, the item is done. 
//       // We do NOT remove from analyzedIds so they can still see the report if they want.
//       setUnlockedIds(prev => { const next = new Set(prev); next.delete(chapter.id); return next; });

//     } catch (error) {
//       alert('Update failed: ' + error.message);
//     }
//   };

//   const toggleReReview = (chapterId) => {
//     setUnlockedIds(prev => {
//       const next = new Set(prev);
//       if (next.has(chapterId)) next.delete(chapterId);
//       else next.add(chapterId);
//       return next;
//     });
//   };

//   return (
//     <div className={styles.container}>
      
//       {/* LEFT COLUMN */}
//       <div className={styles.bookListPanel}>
//         <div className={styles.panelHeader}>
//           <h3 className={styles.panelTitle}>Review Queue ({books.length})</h3>
//         </div>
        
//         <div className={styles.listContent}>
//           {loading ? (
//             <div style={{padding: 20, textAlign: 'center'}}><Loader className="animate-spin" /></div>
//           ) : books.length === 0 ? (
//             <div style={{padding: 20, textAlign: 'center', color: '#888'}}>
//               <Check size={48} style={{opacity: 0.2}} />
//               <p>All caught up!</p>
//             </div>
//           ) : (
//             books.map((book) => (
//               <div 
//                 key={book.id} 
//                 className={`${styles.bookItem} ${selectedBook?.id === book.id ? styles.active : ''}`}
//                 onClick={() => handleSelectBook(book)}
//               >
//                 <div className={styles.bookTitle}>{book.title}</div>
//                 <div className={styles.bookAuthor}>
//                   <User size={12} /> {book.author_name || 'Unknown Author'}
//                 </div>
//               </div>
//             ))
//           )}
//         </div>
//       </div>

//       {/* RIGHT COLUMN */}
//       <div className={styles.detailPanel}>
//         {selectedBook ? (
//           <>
//             <div className={styles.detailHeader}>
//               <h2 style={{margin: 0, fontSize: 24, color: '#1A202C'}}>{selectedBook.title}</h2>
//               <div style={{marginTop: 8, display: 'flex', gap: 16, fontSize: 13, color: '#718096'}}>
//                 <span><User size={14} style={{display:'inline', marginRight:4}}/> {selectedBook.author_name}</span>
//                 <span>Submitted: {new Date(selectedBook.submitted_at).toLocaleDateString()}</span>
//               </div>
//             </div>

//             {loadingChapters ? (
//               <div style={{display:'flex', alignItems:'center', justifyContent:'center', flex:1, color:'#888'}}>
//                 <Loader className="animate-spin" size={32} /> Loading...
//               </div>
//             ) : (
//               <div className={styles.chapterGrid}>
//                 {chapters.map((chapter) => {
//                   const status = chapter.status || 'draft';
//                   const isPublished = status === 'published' || status === 'approved';
//                   const isReviewing = status === 'review';
                  
//                   const isAnalyzing = analyzingIds.has(chapter.id);
//                   const isAnalyzed = analyzedIds.has(chapter.id);
//                   const isReReviewing = unlockedIds.has(chapter.id);

//                   // Show controls if it's in review OR if the user manually clicked "Review Again"
//                   const showControls = isReviewing || isReReviewing;

//                   return (
//                     <div key={chapter.id} className={`${styles.chapterCard} ${styles[status]}`}>
                      
//                       <div className={styles.chapterInfo}>
//                         <h4>Chapter {chapter.chapter_number}: {chapter.title}</h4>
//                         <div className={styles.chapterMeta}>
//                           <span className={`${styles.statusPill} ${styles[status]}`}>
//                             {status === 'approved' ? 'Published' : status.toUpperCase()}
//                           </span>
//                           <span><FileText size={14} style={{display:'inline', marginRight:4}} /> {chapter.word_count || 0} words</span>
//                         </div>
//                       </div>

//                       <div className={styles.actions}>
                        
//                         {/* CASE: PUBLISHED - Show "Review Again" */}
//                         {!showControls && isPublished && (
//                           <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => toggleReReview(chapter.id)}>
//                             <RefreshCw size={16} /> Review Again
//                           </button>
//                         )}

//                         {/* CASE: ACTIVE REVIEW (or Re-Reviewing) */}
//                         {showControls && (
//                           <>
//                             {/* ANALYZE BUTTON */}
//                             <button 
//                               className={`${styles.btn} ${styles.btnAnalyze}`} 
//                               onClick={() => handleAnalyze(chapter)}
//                               disabled={isAnalyzing}
//                             >
//                               {isAnalyzing ? (
//                                 <><Loader size={16} className="animate-spin" /> Analyzing...</>
//                               ) : (
//                                 <><Bot size={16} /> {isAnalyzed ? 'Re-Analyze' : 'Analyze'}</>
//                               )}
//                             </button>
                            
//                             {/* VIEW REPORT BUTTON (Shows if analyzed previously or just now) */}
//                             {isAnalyzed && (
//                               <button 
//                                 className={`${styles.btn} ${styles.btnOutline}`}
//                                 onClick={() => handleViewReport(chapter)}
//                                 title="View detailed AI report"
//                                 style={{ marginLeft: 8 }}
//                               >
//                                 <Eye size={16} /> View Report
//                               </button>
//                             )}
                            
//                             {/* APPROVE/REJECT (Unlocked if analyzed) */}
//                             {isAnalyzed ? (
//                               <>
//                                 <button className={`${styles.btn} ${styles.btnApprove}`} onClick={() => handleDecision(chapter, 'approved')} disabled={isAnalyzing}>
//                                   <Check size={16} /> Approve
//                                 </button>
//                                 <button className={`${styles.btn} ${styles.btnReject}`} onClick={() => handleDecision(chapter, 'rejected')} disabled={isAnalyzing}>
//                                   <X size={16} /> Reject
//                                 </button>
//                               </>
//                             ) : (
//                               <div style={{fontSize: 12, color: '#718096', fontStyle: 'italic'}}>Run analysis to unlock approval</div>
//                             )}
//                           </>
//                         )}

//                         {status === 'rejected' && !showControls && (
//                           <div style={{color: '#E53E3E', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600}}>
//                             <AlertCircle size={16}/> Rejected
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </>
//         ) : (
//           <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, color:'#CBD5E0'}}>
//             <Book size={64} style={{marginBottom: 24, opacity: 0.5}} />
//             <h3>Select a book to review</h3>
//           </div>
//         )}
//       </div>

//       <AnalysisModal 
//         isOpen={isModalOpen}
//         onClose={() => setIsModalOpen(false)}
//         report={currentReport}
//         chapterTitle={chapters.find(c => c.id === currentReport?.chapter_id)?.title || 'Chapter'}
//       />
//     </div>
//   );
// }















import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  Book, User, Bot, Check, X, FileText, 
  Loader, RefreshCw, AlertCircle, Eye 
} from 'lucide-react';
import ChapterReportView from './ChapterReportView'; // IMPORT THE NEW PAGE
import styles from '../../assets/styles/ReviewDashboard.module.css';

export default function ReviewDashboard() {
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Analysis State
  const [analyzingIds, setAnalyzingIds] = useState(new Set());
  const [analyzedIds, setAnalyzedIds] = useState(new Set());
  const [unlockedIds, setUnlockedIds] = useState(new Set());

  // PAGE VIEW STATE (Replaces Modal)
  const [viewingReportChapter, setViewingReportChapter] = useState(null);
  const [currentReport, setCurrentReport] = useState(null);

  useEffect(() => {
    fetchReviewBooks();
  }, []);

  async function fetchReviewBooks() {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*, chapters!inner(status)') 
        .eq('chapters.status', 'review')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      const uniqueBooks = Array.from(new Map(data.map(item => [item.id, item])).values());
      setBooks(uniqueBooks);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectBook(book) {
    setSelectedBook(book);
    setLoadingChapters(true);
    setViewingReportChapter(null); // Reset view to list
    setUnlockedIds(new Set());
    setAnalyzingIds(new Set());
    
    try {
      const { data: chapterData, error: chapterError } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', book.id)
        .order('chapter_number', { ascending: true });

      if (chapterError) throw chapterError;
      
      const loadedChapters = chapterData || [];
      setChapters(loadedChapters);

      if (loadedChapters.length > 0) {
        const chapterIds = loadedChapters.map(c => c.id);
        const { data: reports } = await supabase
          .from('chapter_ai_reports')
          .select('chapter_id')
          .in('chapter_id', chapterIds);

        if (reports) {
          setAnalyzedIds(new Set(reports.map(r => r.chapter_id)));
        }
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading chapters: ' + error.message);
    } finally {
      setLoadingChapters(false);
    }
  }

  // --- VIEW REPORT PAGE LOGIC ---
  const handleViewReport = async (chapter) => {
    try {
      const { data, error } = await supabase
        .from('chapter_ai_reports')
        .select('*')
        .eq('chapter_id', chapter.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') alert("No report found. Run Analysis first.");
        else throw error;
        return;
      }

      setCurrentReport(data);
      setViewingReportChapter(chapter); // This triggers the view switch
      
    } catch (error) {
      console.error("Error fetching report:", error);
      alert("Could not load report.");
    }
  };

  const handleAnalyze = async (chapter) => {
    if (!chapter.content_url) { alert("Error: No content file found."); return; }
    setAnalyzingIds(prev => new Set(prev).add(chapter.id));

    try {
      console.log("=== Starting Analysis ===");
      let storagePath = chapter.content_url;
      if (storagePath.includes('supabase.co/storage/v1/object/public/chapters/')) {
        storagePath = storagePath.split('/chapters/')[1];
      } else if (storagePath.startsWith('chapters/')) {
        storagePath = storagePath.substring(9);
      }
      
      const { data: fileData, error: downloadError } = await supabase
        .storage.from('chapters').download(storagePath);

      if (downloadError) throw new Error(`Storage Error: ${downloadError.message}`);
      const textContent = await fileData.text(); 
      if (textContent.length < 10) throw new Error("Chapter content too short.");

      const { data: aiReport, error: fnError } = await supabase.functions.invoke('analyze-chapter', {
        body: { chapterId: chapter.id, chapterText: textContent }
      });

      if (fnError) throw new Error(`AI Analysis Failed: ${fnError.message}`);

      const { error: dbError } = await supabase.from('chapter_ai_reports').upsert({
          chapter_id: chapter.id,
          genre_analysis: aiReport.genre,
          content_sensitivity: aiReport.sensitivity,
          writing_style: aiReport.style,
          summary: aiReport.overview?.summary || '',
          chapter_type: aiReport.classification?.type || '',
          target_audience: aiReport.genre?.target_audience || ''
      });

      if (dbError) throw new Error("Database Save Error: " + dbError.message);

      setAnalyzedIds(prev => new Set(prev).add(chapter.id));
      alert("Analysis Complete!");

    } catch (error) {
      console.error("Analysis Failed:", error);
      alert("Analysis Failed: " + error.message);
    } finally {
      setAnalyzingIds(prev => { const next = new Set(prev); next.delete(chapter.id); return next; });
    }
  };

  const handleDecision = async (chapterId, decision) => {
    if (!confirm(`Are you sure you want to ${decision.toUpperCase()} this chapter?`)) return;

    try {
      const { error } = await supabase
        .from('chapters')
        .update({ status: decision })
        .eq('id', chapterId);

      if (error) throw error;

      setChapters(prev => prev.map(c => 
        c.id === chapterId ? { ...c, status: decision } : c
      ));

      // If we are on the Report Page, go back to the list
      setViewingReportChapter(null);

    } catch (error) {
      alert('Update failed: ' + error.message);
    }
  };

  const toggleReReview = (chapterId) => {
    setUnlockedIds(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  return (
    <div className={styles.container}>
      
      {/* LEFT COLUMN: BOOK LIST */}
      <div className={styles.bookListPanel}>
        <div className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>Review Queue ({books.length})</h3>
        </div>
        <div className={styles.listContent}>
          {loading ? (
            <div style={{padding: 20, textAlign: 'center'}}><Loader className="animate-spin" /></div>
          ) : books.length === 0 ? (
            <div style={{padding: 20, textAlign: 'center', color: '#888'}}>
              <Check size={48} style={{opacity: 0.2}} />
              <p>All caught up!</p>
            </div>
          ) : (
            books.map((book) => (
              <div 
                key={book.id} 
                className={`${styles.bookItem} ${selectedBook?.id === book.id ? styles.active : ''}`}
                onClick={() => handleSelectBook(book)}
              >
                <div className={styles.bookTitle}>{book.title}</div>
                <div className={styles.bookAuthor}>
                  <User size={12} /> {book.author_name || 'Unknown Author'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: SWITCH BETWEEN LIST AND REPORT */}
      <div className={styles.detailPanel}>
        
        {/* CONDITIONAL RENDER: SHOW REPORT OR SHOW LIST */}
        {viewingReportChapter ? (
          <ChapterReportView 
            report={currentReport}
            chapter={viewingReportChapter}
            onBack={() => setViewingReportChapter(null)}
            onDecision={(decision) => handleDecision(viewingReportChapter.id, decision)}
          />
        ) : selectedBook ? (
          <>
            <div className={styles.detailHeader}>
              <h2 style={{margin: 0, fontSize: 24, color: '#1A202C'}}>{selectedBook.title}</h2>
              <div style={{marginTop: 8, display: 'flex', gap: 16, fontSize: 13, color: '#718096'}}>
                <span><User size={14} style={{display:'inline', marginRight:4}}/> {selectedBook.author_name}</span>
                <span>Submitted: {new Date(selectedBook.submitted_at).toLocaleDateString()}</span>
              </div>
            </div>

            {loadingChapters ? (
              <div style={{display:'flex', alignItems:'center', justifyContent:'center', flex:1, color:'#888'}}>
                <Loader className="animate-spin" size={32} /> Loading...
              </div>
            ) : (
              <div className={styles.chapterGrid}>
                {chapters.map((chapter) => {
                  const status = chapter.status || 'draft';
                  const isPublished = status === 'published' || status === 'approved';
                  const isReviewing = status === 'review';
                  
                  const isAnalyzing = analyzingIds.has(chapter.id);
                  const isAnalyzed = analyzedIds.has(chapter.id);
                  const isReReviewing = unlockedIds.has(chapter.id);
                  const showControls = isReviewing || isReReviewing;

                  return (
                    <div key={chapter.id} className={`${styles.chapterCard} ${styles[status]}`}>
                      <div className={styles.chapterInfo}>
                        <h4>Chapter {chapter.chapter_number}: {chapter.title}</h4>
                        <div className={styles.chapterMeta}>
                          <span className={`${styles.statusPill} ${styles[status]}`}>
                            {status === 'approved' ? 'Published' : status.toUpperCase()}
                          </span>
                          <span><FileText size={14} style={{display:'inline', marginRight:4}} /> {chapter.word_count || 0} words</span>
                        </div>
                      </div>

                      <div className={styles.actions}>
                        {!showControls && isPublished && (
                          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => toggleReReview(chapter.id)}>
                            <RefreshCw size={16} /> Review Again
                          </button>
                        )}

                        {showControls && (
                          <>
                            <button 
                              className={`${styles.btn} ${styles.btnAnalyze}`} 
                              onClick={() => handleAnalyze(chapter)}
                              disabled={isAnalyzing}
                            >
                              {isAnalyzing ? <Loader size={16} className="animate-spin" /> : <Bot size={16} />}
                              {isAnalyzing ? ' Analyzing...' : (isAnalyzed ? ' Re-Analyze' : ' Analyze')}
                            </button>
                            
                            {isAnalyzed && (
                              <button 
                                className={`${styles.btn} ${styles.btnOutline}`}
                                onClick={() => handleViewReport(chapter)}
                                style={{ marginLeft: 8 }}
                              >
                                <Eye size={16} /> View Report
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, color:'#CBD5E0'}}>
            <Book size={64} style={{marginBottom: 24, opacity: 0.5}} />
            <h3>Select a book to review</h3>
          </div>
        )}
      </div>
    </div>
  );
}