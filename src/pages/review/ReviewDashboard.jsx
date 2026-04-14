
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import {
  Book, User, Bot, Check, X, FileText,
  Loader, RefreshCw, AlertCircle, Eye, ArrowLeft, History, Zap
} from 'lucide-react';
import ChapterReportView from './ChapterReportView';
import styles from '../../assets/styles/ReviewDashboard.module.css';

export default function ReviewDashboard() {
  const location = useLocation();
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Analysis State
  const [analyzingIds, setAnalyzingIds] = useState(new Set());

  // Review history map: chapter_id -> array of history rows
  const [reviewHistoryMap, setReviewHistoryMap] = useState({});

  // Rate limiting cooldown state (in seconds)
  const [cooldownTime, setCooldownTime] = useState(0);

  // Page view state
  const [viewingReportChapter, setViewingReportChapter] = useState(null);
  const [currentReportHistory, setCurrentReportHistory] = useState([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentItem: "" });

  // Standard Magic Report for Bulk Approval
  const MAGIC_REPORT = {
    genre: { primary: "General Fiction", sub_genres: ["Drama"], target_audience: "General" },
    overview: {
      summary: "Bulk approved by administrator. Initial review passed automatically.",
      themes: ["Standard Narrative"],
      emotional_tone: "Neutral"
    },
    classification: { type: "Standard Chapter", pacing: "Moderate" },
    sensitivity: {
      vulgarity: { detected: false, examples: "", context: "" },
      sexual_content: { detected: false, examples: "", context: "" },
      violence: { detected: false, examples: "", context: "" },
      substance_use: { detected: false, examples: "", context: "" },
      hate_speech: { detected: false, examples: "", context: "" }
    },
    style: { tone: "Consistent", writing_style: "Professional", patterns: "Standard" }
  };

  useEffect(() => {
    fetchReviewBooks();
  }, []);

  // Auto-select book if navigated from Authors page
  useEffect(() => {
    if (location.state?.selectedBook && !loading) {
      handleSelectBook(location.state.selectedBook);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, loading]);

  // Cooldown countdown effect
  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setInterval(() => {
        setCooldownTime(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownTime]);

  async function fetchReviewBooks() {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*, chapters!inner(status)')
        .eq('chapters.status', 'review')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      const uniqueBooks = Array.from(new Map((data || []).map(item => [item.id, item])).values());
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
    setViewingReportChapter(null);
    setAnalyzingIds(new Set());

    try {
      const { data: chapterData, error: chapterError } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', book.id)
        .order('chapter_number', { ascending: true });

      if (chapterError) throw chapterError;

      const loadedChapters = chapterData || [];

      // Sort: 'review' status chapters first, then by chapter_number
      loadedChapters.sort((a, b) => {
        const aIsReview = a.status === 'review' ? 0 : 1;
        const bIsReview = b.status === 'review' ? 0 : 1;
        if (aIsReview !== bIsReview) return aIsReview - bIsReview;
        return (a.chapter_number || 0) - (b.chapter_number || 0);
      });

      setChapters(loadedChapters);

      // Fetch all review history for these chapters
      if (loadedChapters.length > 0) {
        const chapterIds = loadedChapters.map(c => c.id);
        const { data: historyData, error: histError } = await supabase
          .from('chapter_review_history')
          .select('*')
          .in('chapter_id', chapterIds)
          .order('review_number', { ascending: true });

        if (histError) {
          console.error('Error fetching review history:', histError);
        } else {
          // Group by chapter_id
          const histMap = {};
          (historyData || []).forEach(row => {
            if (!histMap[row.chapter_id]) histMap[row.chapter_id] = [];
            histMap[row.chapter_id].push(row);
          });
          setReviewHistoryMap(histMap);
        }
      } else {
        setReviewHistoryMap({});
      }

    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading chapters: ' + error.message);
    } finally {
      setLoadingChapters(false);
    }
  }

  // --- AI REVIEW ---
  const handleAnalyze = async (chapter) => {
    if (!chapter.content_url) { alert("Error: No content file found."); return; }
    setAnalyzingIds(prev => new Set(prev).add(chapter.id));

    try {
      console.log("=== Starting AI Review ===");
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

      if (fnError) {
        console.error("Edge Function Error Structure:", fnError);
        let errorMsg = fnError.message || (typeof fnError === 'string' ? fnError : JSON.stringify(fnError));

        // Try to parse detailed error response
        if (fnError.context?.json) {
          const detail = fnError.context.json;
          errorMsg = detail.error || errorMsg;
          if (detail.suggestion) errorMsg += `\n\n💡 Suggestion: ${detail.suggestion}`;
        }

        // Special handling for common Gemini errors
        if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota")) {
          errorMsg = "Gemini API Quota Exceeded (429). This usually means too many requests were made too quickly, or your key's free tier limit was reached. Please wait a minute or check your Google AI Studio billing.";
        } else if (errorMsg.includes("503") || errorMsg.toLowerCase().includes("overloaded")) {
          errorMsg = "Gemini is currently overloaded (503). We've already tried several retries, but the service is under high demand. Please try again in a few minutes.";
        }

        throw new Error(errorMsg);
      }
      if (!aiReport) throw new Error("AI Analysis returned no data from Edge Function.");

      // Handle custom error objects returned with 200 OK status
      if (aiReport.error) {
        let errorMsg = aiReport.error;
        if (aiReport.suggestion) errorMsg += `\n\n💡 Suggestion: ${aiReport.suggestion}`;

        // Final normalization for common Gemini errors
        if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota")) {
          errorMsg = "Gemini API Quota Exceeded (429). This usually means too many requests were made too quickly, or your key's free tier limit was reached. Please wait a minute or check your Google AI Studio billing.";
        } else if (errorMsg.includes("503") || errorMsg.toLowerCase().includes("overloaded")) {
          errorMsg = "Gemini is currently overloaded (503). We've already tried several retries, but the service is under high demand. Please try again in a few minutes.";
        }

        throw new Error(errorMsg);
      }
      const existingHistory = reviewHistoryMap[chapter.id] || [];
      const nextReviewNumber = existingHistory.length + 1;

      // INSERT a new row into chapter_review_history (not upsert!)
      const { data: newRow, error: dbError } = await supabase
        .from('chapter_review_history')
        .insert({
          chapter_id: chapter.id,
          review_number: nextReviewNumber,
          genre_analysis: aiReport.genre,
          content_sensitivity: aiReport.sensitivity,
          writing_style: aiReport.style,
          summary: aiReport.overview?.summary || '',
          chapter_type: aiReport.classification?.type || '',
          target_audience: aiReport.genre?.target_audience || ''
        })
        .select()
        .single();

      if (dbError) throw new Error("Database Save Error: " + dbError.message);

      // Calculate and save word count
      const wordCount = textContent.trim().split(/\s+/).filter(w => w.length > 0).length;
      await supabase.from('chapters').update({ word_count: wordCount }).eq('id', chapter.id);
      setChapters(prev => prev.map(c => c.id === chapter.id ? { ...c, word_count: wordCount } : c));

      // Update local review history map
      setReviewHistoryMap(prev => ({
        ...prev,
        [chapter.id]: [...(prev[chapter.id] || []), newRow]
      }));

      alert("AI Review Complete! Report #" + nextReviewNumber + " generated.");

    } catch (error) {
      console.error("AI Review Failed:", error);

      // If error is a 503 or 429, trigger a 30-second cooling down period
      if (error.message.includes("503") || error.message.includes("429")) {
        setCooldownTime(30);
        alert(`Gemini is currently overloaded or rate-limited. To protect your quota, we've enabled a 30s cooling-down period.\n\nError: ${error.message}`);
      } else {
        alert("AI Review Failed: " + error.message);
      }
    } finally {
      setAnalyzingIds(prev => { const next = new Set(prev); next.delete(chapter.id); return next; });
    }
  };

  // --- MAGIC BULK APPROVE ---
  const handleBulkMagicApprove = async (chaptersToApprove) => {
    if (!chaptersToApprove || chaptersToApprove.length === 0) {
      alert("No chapters available for bulk approval.");
      return;
    }

    if (!confirm(`Are you sure you want to Magic Approve ${chaptersToApprove.length} chapters instantly? This will skip AI analysis and mark them as Approved.`)) {
      return;
    }

    setIsBulkProcessing(true);
    setBulkProgress({ current: 0, total: chaptersToApprove.length, currentItem: "Initializing..." });
    
    try {
      console.log(`=== Starting Magic Bulk Approval for ${chaptersToApprove.length} chapters ===`);
      
      let completedCount = 0;
      for (const chapter of chaptersToApprove) {
        setBulkProgress(prev => ({ ...prev, currentItem: chapter.title || `Chapter ${chapter.chapter_number}` }));
        
        const existingHistory = reviewHistoryMap[chapter.id] || [];
        const nextReviewNumber = existingHistory.length + 1;

        // 1. Insert Magic Report
        const { data: newRow, error: dbError } = await supabase
          .from('chapter_review_history')
          .insert({
            chapter_id: chapter.id,
            review_number: nextReviewNumber,
            genre_analysis: MAGIC_REPORT.genre,
            content_sensitivity: MAGIC_REPORT.sensitivity,
            writing_style: MAGIC_REPORT.style,
            summary: MAGIC_REPORT.overview.summary,
            chapter_type: MAGIC_REPORT.classification.type,
            target_audience: MAGIC_REPORT.genre.target_audience,
            decision: 'approved' // Automatically set decision to approved
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // 2. Update Chapter Status
        const { error: updateError } = await supabase
          .from('chapters')
          .update({ status: 'approved' })
          .eq('id', chapter.id);

        if (updateError) throw updateError;

        // 3. Update Local State
        setReviewHistoryMap(prev => ({
          ...prev,
          [chapter.id]: [...(prev[chapter.id] || []), newRow]
        }));

        completedCount++;
        setBulkProgress(prev => ({ ...prev, current: completedCount }));
      }

      // Refresh chapters list locally
      setChapters(prev => prev.map(c => {
        const isTarget = chaptersToApprove.find(tc => tc.id === c.id);
        return isTarget ? { ...c, status: 'approved' } : c;
      }));

      alert(`Success! ${chaptersToApprove.length} chapters have been Magic Approved.`);

    } catch (error) {
      console.error("Bulk Magic Approval Failed:", error);
      alert("Bulk Magic Approval Failed: " + error.message);
    } finally {
      setIsBulkProcessing(false);
      setBulkProgress({ current: 0, total: 0, currentItem: "" });
    }
  };

  // --- VIEW REPORT ---
  const handleViewReport = async (chapter) => {
    const history = reviewHistoryMap[chapter.id] || [];
    if (history.length === 0) {
      alert("No report found. Please run AI Review first.");
      return;
    }

    // If chapter has no word_count, calculate it
    let updatedChapter = chapter;
    if (!chapter.word_count && chapter.content_url) {
      try {
        let storagePath = chapter.content_url;
        if (storagePath.includes('supabase.co/storage/v1/object/public/chapters/')) {
          storagePath = storagePath.split('/chapters/')[1];
        } else if (storagePath.startsWith('chapters/')) {
          storagePath = storagePath.substring(9);
        }
        const { data: fileData } = await supabase.storage.from('chapters').download(storagePath);
        if (fileData) {
          const textContent = await fileData.text();
          const wordCount = textContent.trim().split(/\s+/).filter(w => w.length > 0).length;
          updatedChapter = { ...chapter, word_count: wordCount };
          await supabase.from('chapters').update({ word_count: wordCount }).eq('id', chapter.id);
          setChapters(prev => prev.map(c => c.id === chapter.id ? { ...c, word_count: wordCount } : c));
        }
      } catch (e) {
        console.warn('Could not calculate word count:', e);
      }
    }

    setCurrentReportHistory(history);
    setViewingReportChapter(updatedChapter);
  };

  // --- DECISION (called from ChapterReportView) ---
  const handleDecision = async (chapterId, decision, comment, historyRowId) => {
    try {
      // Update the chapter status
      const { error: chapterError } = await supabase
        .from('chapters')
        .update({
          status: decision,
          admin_feedback: comment?.trim() || null,
        })
        .eq('id', chapterId);

      if (chapterError) throw chapterError;

      // Update the history row with the admin comment and decision
      const { error: histError } = await supabase
        .from('chapter_review_history')
        .update({
          admin_comment: comment,
          decision: decision,
          decided_at: new Date().toISOString()
        })
        .eq('id', historyRowId);

      if (histError) throw histError;

      // Update local chapter state
      setChapters(prev => prev.map(c =>
        c.id === chapterId ? { ...c, status: decision } : c
      ));

      // Update local history
      setReviewHistoryMap(prev => {
        const updated = { ...prev };
        if (updated[chapterId]) {
          updated[chapterId] = updated[chapterId].map(h =>
            h.id === historyRowId
              ? { ...h, admin_comment: comment, decision, decided_at: new Date().toISOString() }
              : h
          );
        }
        return updated;
      });

      // Go back to chapter list
      setViewingReportChapter(null);
      setCurrentReportHistory([]);

    } catch (error) {
      alert('Update failed: ' + error.message);
    }
  };

  // Go back to the books grid
  const handleBack = () => {
    setSelectedBook(null);
    setChapters([]);
    setViewingReportChapter(null);
    setCurrentReportHistory([]);
    setReviewHistoryMap({});
  };

  return (
    <div className={styles.container}>

      {selectedBook ? (
        <>
          <div className={styles.pageHeader}>
            <button className={styles.backBtn} onClick={handleBack}>
              <ArrowLeft size={18} /> Back to Books
            </button>
          </div>

          {viewingReportChapter ? (
            <ChapterReportView
              history={currentReportHistory}
              chapter={viewingReportChapter}
              onBack={() => { setViewingReportChapter(null); setCurrentReportHistory([]); }}
              onDecision={(decision, comment, historyRowId) => handleDecision(viewingReportChapter.id, decision, comment, historyRowId)}
            />
          ) : (
            <div className={styles.detailPanel}>
              <div className={styles.detailHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 24, color: '#1A202C' }}>{selectedBook.title}</h2>
                    <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 13, color: '#718096' }}>
                      <span><User size={14} style={{ display: 'inline', marginRight: 4 }} /> {selectedBook.author_name}</span>
                    </div>
                  </div>

                  {/* Magic Bulk Approve Button */}
                  <button
                    className={`${styles.btn} ${styles.btnMagic}`}
                    onClick={() => handleBulkMagicApprove(chapters.filter(c => c.status === 'review'))}
                    disabled={isBulkProcessing || chapters.filter(c => c.status === 'review').length === 0}
                  >
                    {isBulkProcessing ? <Loader size={16} className="animate-spin" /> : <Zap size={16} />}
                    {isBulkProcessing ? ' Processing...' : ' Magic Approve All Chapters'}
                  </button>
                </div>
              </div>

              {loadingChapters ? (
                <div className={styles.loadingState}>
                  <Loader className="animate-spin" size={32} /> &nbsp;Loading chapters...
                </div>
              ) : (
                <div className={styles.chapterGrid}>
                  {chapters.map((chapter) => {
                    const status = chapter.status || 'draft';
                    const isReviewing = status === 'review';
                    const isAnalyzing = analyzingIds.has(chapter.id);
                    const chapterHistory = reviewHistoryMap[chapter.id] || [];
                    const hasReports = chapterHistory.length > 0;
                    const reviewCount = chapterHistory.length;
                    // Count how many past rejections
                    const rejectionCount = chapterHistory.filter(h => h.decision === 'rejected').length;

                    return (
                      <div key={chapter.id} className={`${styles.chapterCard} ${styles[status]}`}>
                        <div className={styles.chapterInfo}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h4 style={{ margin: 0 }}>Chapter {chapter.chapter_number}: {chapter.title}</h4>
                            {rejectionCount > 0 && (
                              <span className={styles.reviewCountBadge}>
                                <History size={12} /> Revision #{rejectionCount + 1}
                              </span>
                            )}
                          </div>
                          <div className={styles.chapterMeta}>
                            <span className={`${styles.statusPill} ${styles[status]}`}>
                              {status === 'approved' ? 'Published' : status.toUpperCase()}
                            </span>
                            <span><FileText size={14} style={{ display: 'inline', marginRight: 4 }} /> {chapter.word_count || 0} words</span>
                            {status === 'review' && chapter.submitted_at && (
                              <span>Submitted: {new Date(chapter.submitted_at).toLocaleDateString()}</span>
                            )}
                            {reviewCount > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6B46C1' }}>
                                <Bot size={14} /> {reviewCount} {reviewCount === 1 ? 'report' : 'reports'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={styles.actions}>
                          {/* AI REVIEW button - always shown for chapters in review status */}
                          {isReviewing && (
                            <button
                              className={`${styles.btn} ${styles.btnAnalyze}`}
                              onClick={() => handleAnalyze(chapter)}
                              disabled={isAnalyzing || cooldownTime > 0}
                            >
                              {isAnalyzing ? (
                                <Loader size={16} className="animate-spin" />
                              ) : cooldownTime > 0 ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : (
                                <Bot size={16} />
                              )}
                              {isAnalyzing
                                ? ' Analyzing...'
                                : cooldownTime > 0
                                  ? ` Cool-down (${cooldownTime}s)`
                                  : ' AI Review'}
                            </button>
                          )}

                          {/* VIEW REPORT button - shown if reports exist */}
                          {hasReports && (
                            <button
                              className={`${styles.btn} ${styles.btnOutline}`}
                              onClick={() => handleViewReport(chapter)}
                            >
                              <Eye size={16} /> View Report{reviewCount > 1 ? 's' : ''}
                            </button>
                          )}

                          {/* Status badges for non-review chapters */}
                          {status === 'rejected' && (
                            <div style={{ color: '#E53E3E', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                              <AlertCircle size={16} /> Rejected
                            </div>
                          )}
                          {(status === 'approved' || status === 'published') && (
                            <div style={{ color: '#38A169', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                              <Check size={16} /> Approved
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className={styles.pageHeader}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h2 className={styles.pageTitle}>
                All Books <span className={styles.bookCount}>({books.length})</span>
              </h2>
              <button
                className={`${styles.btn} ${styles.btnMagic}`}
                onClick={async () => {
                  if (!confirm("Caution: This will Magic Approve ALL chapters for ALL books shown here. Proceed?")) return;

                  const allReviewChapters = [];
                  for (const book of books) {
                    const { data } = await supabase.from('chapters').select('*').eq('book_id', book.id).eq('status', 'review');
                    if (data) allReviewChapters.push(...data);
                  }

                  if (allReviewChapters.length === 0) {
                    alert("No chapters currently in review.");
                    return;
                  }
                  handleBulkMagicApprove(allReviewChapters);
                }}
                disabled={isBulkProcessing || books.length === 0}
              >
                <Zap size={16} />Approve All Books
              </button>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingState}>
              <Loader className="animate-spin" size={32} /> &nbsp;Loading books...
            </div>
          ) : books.length === 0 ? (
            <div className={styles.emptyState}>
              <Book size={64} style={{ opacity: 0.3 }} />
              <h3>No books found</h3>
              <p>Books will appear here once authors submit them.</p>
            </div>
          ) : (
            <div className={styles.booksGrid}>
              {books.map((book) => (
                <div
                  key={book.id}
                  className={styles.bookCard}
                  onClick={() => handleSelectBook(book)}
                >
                  <div className={styles.coverContainer}>
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className={styles.coverImage}
                      />
                    ) : (
                      <div className={styles.coverPlaceholder}>
                        <Book size={48} />
                      </div>
                    )}
                  </div>
                  <div className={styles.bookCardInfo}>
                    <div className={styles.bookCardTitle}>{book.title}</div>
                    <div className={styles.bookCardAuthor}>
                      <User size={12} /> {book.author_name || 'Unknown Author'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bulk Progress Overlay */}
      {isBulkProcessing && (
        <div className={styles.progressOverlay}>
          <div className={styles.progressPopup}>
            <div className={styles.progressHeader}>
              <div className={styles.progressIcon}>
                <Zap size={20} className={styles.pulseIcon} />
              </div>
              <div className={styles.progressTitle}>
                <h3>Magic Approving Chapters...</h3>
                <p>Now processing: <strong>{bulkProgress.currentItem}</strong></p>
              </div>
            </div>
            
            <div className={styles.progressBody}>
              <div className={styles.progressStats}>
                <span>{Math.round((bulkProgress.current / bulkProgress.total) * 100)}% Complete</span>
                <span>{bulkProgress.current} / {bulkProgress.total}</span>
              </div>
              <div className={styles.progressTrack}>
                <div 
                  className={styles.progressBar} 
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
