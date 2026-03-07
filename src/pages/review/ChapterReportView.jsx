import React, { useState } from 'react';
import {
  ArrowLeft, Calendar, CheckCircle, AlertTriangle,
  BookOpen, Fingerprint, Activity, Check, X,
  FileText, Clock, History, ChevronDown, ChevronUp,
  MessageSquare, Send
} from 'lucide-react';
import styles from '../../assets/styles/ReviewDashboard.module.css';

export default function ChapterReportView({ history, chapter, onBack, onDecision }) {
  const [adminComment, setAdminComment] = useState('');
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!history || history.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>No reports available.</div>;
  }

  // The latest report is the last one
  const latestReport = history[history.length - 1];
  const pastReviews = history.slice(0, -1).reverse(); // Newest first for past reviews

  const wordCount = chapter?.word_count || 0;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const totalReviews = history.length;
  const rejectionCount = history.filter(h => h.decision === 'rejected').length;

  const formatDate = (dateString) => {
    if (!dateString) return 'Just now';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const handleSubmitDecision = async (decision) => {
    if (decision === 'rejected' && !adminComment.trim()) {
      alert('Please provide a comment explaining the rejection reason.');
      return;
    }

    const actionText = decision === 'approved' ? 'APPROVE' : 'REJECT';
    if (!confirm(`Are you sure you want to ${actionText} this chapter?`)) return;

    setSubmitting(true);
    try {
      await onDecision(decision, adminComment.trim(), latestReport.id);
    } finally {
      setSubmitting(false);
    }
  };

  const SensitivityItem = ({ label, data }) => {
    const isSafe = !data?.detected;
    return (
      <div className={styles.sensitivityItem} data-safe={isSafe}>
        <div style={{ marginTop: 2 }}>
          {isSafe ? <CheckCircle size={18} color="#38A169" /> : <AlertTriangle size={18} color="#E53E3E" />}
        </div>
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 700, color: isSafe ? '#276749' : '#C53030' }}>
            {label}
          </h4>
          {isSafe ? (
            <p style={{ margin: 0, fontSize: 13, color: '#48BB78' }}>
              No {label.toLowerCase()} detected.
            </p>
          ) : (
            <>
              <p style={{ margin: '0 0 4px 0', fontSize: 13, color: '#C53030', fontWeight: 600 }}>
                Detected: "{data.examples}"
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#9B2C2C', fontStyle: 'italic' }}>
                Context: {data.context}
              </p>
            </>
          )}
        </div>
      </div>
    );
  };

  // Renders the AI report cards for a given report row
  const ReportCards = ({ report }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Overview */}
      <section className={styles.reportCard}>
        <h3 className={styles.reportCardTitle}>
          <BookOpen size={20} color="#3182CE" /> Narrative Overview
        </h3>
        <p style={{ lineHeight: 1.6, color: '#4A5568', fontSize: 15, marginBottom: 20 }}>
          {report.summary}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {report.genre_analysis?.primary && (
            <div className={styles.tag} style={{ background: '#EBF8FF', color: '#2C5282', border: '1px solid #BEE3F8' }}>
              {report.genre_analysis.primary}
            </div>
          )}
          {report.genre_analysis?.sub_genres?.map((sub, i) => (
            <div key={i} className={styles.tag} style={{ background: '#F7FAFC', color: '#4A5568', border: '1px solid #EDF2F7' }}>
              {sub}
            </div>
          ))}
          {report.target_audience && (
            <div className={styles.tag} style={{ background: '#FAF5FF', color: '#553C9A' }}>
              Target: {report.target_audience}
            </div>
          )}
          {report.chapter_type && (
            <div className={styles.tag} style={{ background: '#F0FFF4', color: '#276749' }}>
              Type: {report.chapter_type}
            </div>
          )}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Style */}
        <section className={styles.reportCard}>
          <h3 className={styles.reportCardTitle}>
            <Fingerprint size={20} color="#805AD5" /> Style & Tone
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div className={styles.reportLabel}>Tone</div>
              <div style={{ color: '#2D3748', fontSize: 14, lineHeight: 1.5 }}>{report.writing_style?.tone}</div>
            </div>
            <div>
              <div className={styles.reportLabel}>Writing Style</div>
              <div style={{ color: '#2D3748', fontSize: 14, lineHeight: 1.5 }}>{report.writing_style?.writing_style}</div>
            </div>
            <div>
              <div className={styles.reportLabel}>Key Patterns</div>
              <div style={{ color: '#2D3748', fontSize: 14, lineHeight: 1.5 }}>{report.writing_style?.patterns}</div>
            </div>
          </div>
        </section>

        {/* Safety */}
        <section className={styles.reportCard}>
          <h3 className={styles.reportCardTitle}>
            <Activity size={20} color="#E53E3E" /> Content Safety Check
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            <SensitivityItem label="Profanity & Vulgarity" data={report.content_sensitivity?.vulgarity} />
            <SensitivityItem label="Sexual Content" data={report.content_sensitivity?.sexual_content} />
            <SensitivityItem label="Violence & Gore" data={report.content_sensitivity?.violence} />
            <SensitivityItem label="Substance Use" data={report.content_sensitivity?.substance_use} />
            <SensitivityItem label="Hate Speech" data={report.content_sensitivity?.hate_speech} />
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0' }}>

      {/* HEADER */}
      <div className={styles.reportPageHeader}>
        <div>
          <button onClick={onBack} className={styles.reportBackBtn}>
            <ArrowLeft size={16} /> Back to Chapter List
          </button>
          <h2 style={{ margin: 0, fontSize: 24, color: '#1A202C' }}>
            AI Review Report: {chapter.title}
          </h2>
          <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 13, color: '#718096', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={14} /> Analyzed on: {formatDate(latestReport.created_at)}
            </span>
            <span className={styles.headerBadge} style={{ background: '#EBF8FF', color: '#2B6CB0', border: '1px solid #BEE3F8' }}>
              <FileText size={14} /> {wordCount.toLocaleString()} words
            </span>
            <span className={styles.headerBadge} style={{ background: '#FAF5FF', color: '#6B46C1', border: '1px solid #E9D8FD' }}>
              <Clock size={14} /> {readTimeMinutes} min read
            </span>
            <span className={styles.headerBadge} style={{ background: '#FFFAF0', color: '#C05621', border: '1px solid #FEEBC8' }}>
              <History size={14} /> Review #{totalReviews}
            </span>
            {rejectionCount > 0 && (
              <span className={styles.headerBadge} style={{ background: '#FFF5F5', color: '#C53030', border: '1px solid #FED7D7' }}>
                <X size={14} /> {rejectionCount} past {rejectionCount === 1 ? 'rejection' : 'rejections'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 32, backgroundColor: '#F7FAFC' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* LATEST REPORT */}
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={20} /> Latest AI Analysis (Report #{latestReport.review_number})
            </h3>
            <ReportCards report={latestReport} />
          </div>

          {/* ADMIN COMMENT & DECISION SECTION */}
          {!latestReport.decision && chapter.status === 'review' && (
            <section className={styles.commentSection}>
              <h3 className={styles.commentSectionTitle}>
                <MessageSquare size={20} color="#4A5568" /> Admin Review & Decision
              </h3>
              <textarea
                className={styles.commentTextarea}
                placeholder="Write your comments here... (required for rejection)"
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                rows={4}
              />
              <div className={styles.decisionButtons}>
                <button
                  className={`${styles.btn} ${styles.btnReject}`}
                  onClick={() => handleSubmitDecision('rejected')}
                  disabled={submitting}
                  style={{ padding: '12px 28px', fontSize: 15 }}
                >
                  {submitting ? <Loader size={18} /> : <X size={18} />} Reject
                </button>
                <button
                  className={`${styles.btn} ${styles.btnApprove}`}
                  onClick={() => handleSubmitDecision('approved')}
                  disabled={submitting}
                  style={{ padding: '12px 28px', fontSize: 15 }}
                >
                  {submitting ? <Loader size={18} /> : <Check size={18} />} Approve
                </button>
              </div>
            </section>
          )}

          {/* Decision already made */}
          {latestReport.decision && (
            <section className={styles.commentSection} style={{ borderColor: latestReport.decision === 'approved' ? '#C6F6D5' : '#FED7D7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                {latestReport.decision === 'approved' ? (
                  <CheckCircle size={22} color="#38A169" />
                ) : (
                  <AlertTriangle size={22} color="#E53E3E" />
                )}
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: latestReport.decision === 'approved' ? '#276749' : '#C53030' }}>
                  {latestReport.decision === 'approved' ? 'Approved' : 'Rejected'}
                </h3>
                <span style={{ fontSize: 13, color: '#718096' }}>
                  — {formatDate(latestReport.decided_at)}
                </span>
              </div>
              {latestReport.admin_comment && (
                <div style={{ background: '#F7FAFC', padding: 16, borderRadius: 8, color: '#4A5568', lineHeight: 1.6, fontSize: 14 }}>
                  <strong>Admin Comment:</strong> {latestReport.admin_comment}
                </div>
              )}
            </section>
          )}

          {/* REVIEW HISTORY TIMELINE */}
          {pastReviews.length > 0 && (
            <section>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2D3748', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={20} /> Review History ({pastReviews.length} past {pastReviews.length === 1 ? 'review' : 'reviews'})
              </h3>

              <div className={styles.historyTimeline}>
                {pastReviews.map((review) => {
                  const isExpanded = expandedHistoryId === review.id;
                  const isApproved = review.decision === 'approved';
                  const isRejected = review.decision === 'rejected';

                  return (
                    <div key={review.id} className={styles.historyCard}>
                      {/* Timeline dot */}
                      <div className={styles.timelineDot} style={{
                        background: isApproved ? '#38A169' : isRejected ? '#E53E3E' : '#CBD5E0'
                      }}>
                        {isApproved ? <Check size={12} color="white" /> : isRejected ? <X size={12} color="white" /> : null}
                      </div>

                      {/* Card content */}
                      <div className={styles.historyCardContent}>
                        <div
                          className={styles.historyCardHeader}
                          onClick={() => setExpandedHistoryId(isExpanded ? null : review.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: '#2D3748' }}>
                              Review #{review.review_number}
                            </span>
                            <span style={{ fontSize: 13, color: '#718096' }}>
                              {formatDate(review.created_at)}
                            </span>
                            {review.decision && (
                              <span className={styles.historyDecisionBadge} style={{
                                background: isApproved ? '#F0FFF4' : '#FFF5F5',
                                color: isApproved ? '#276749' : '#C53030',
                                border: `1px solid ${isApproved ? '#C6F6D5' : '#FED7D7'}`
                              }}>
                                {review.decision.toUpperCase()}
                              </span>
                            )}
                          </div>
                          {isExpanded ? <ChevronUp size={18} color="#718096" /> : <ChevronDown size={18} color="#718096" />}
                        </div>

                        {/* Admin comment for this review */}
                        {review.admin_comment && (
                          <div className={styles.historyComment}>
                            <MessageSquare size={14} color="#718096" />
                            <span>{review.admin_comment}</span>
                          </div>
                        )}

                        {/* Expanded: show full report */}
                        {isExpanded && (
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #EDF2F7' }}>
                            <ReportCards report={review} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}