import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
    Users, User, ArrowLeft, Shield, ShieldOff,
    BookOpen, FileText, Loader, Mail, Calendar,
    UploadCloud, X, ChevronRight
} from 'lucide-react';
import styles from '../assets/styles/AuthorsPage.module.css';

export default function AuthorsPage() {
    const navigate = useNavigate();
    const [authors, setAuthors] = useState([]);
    const [selectedAuthor, setSelectedAuthor] = useState(null);
    const [authorBooks, setAuthorBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingBooks, setLoadingBooks] = useState(false);

    // Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadStep, setUploadStep] = useState(1); // 1: Book Info, 2: Chapters
    const [newBookId, setNewBookId] = useState(null);

    // Book Form State
    const [bookTitle, setBookTitle] = useState('');
    const [bookDescription, setBookDescription] = useState('');
    const [bookCoverFile, setBookCoverFile] = useState(null);
    const [bookCoverPreview, setBookCoverPreview] = useState('');

    // Chapter Form State
    const [chapterTitle, setChapterTitle] = useState('');
    const [chapterContent, setChapterContent] = useState('');

    // Upload Progress Sub-State
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        fetchAuthors();
    }, []);

    async function fetchAuthors() {
        try {
            // Fetch authors from profiles table directly (not from books)
            // This ensures blocked authors still appear in the admin list
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, username, updated_at, is_blocked')
                .eq('role', 'author')
                .order('updated_at', { ascending: false });

            if (profilesError) throw profilesError;

            // Get book counts for each author using a separate query
            // Note: books of blocked authors may be hidden by RLS,
            // so we count separately and don't rely on books for the author list
            const authorIds = (profiles || []).map(p => p.id);
            let bookCountMap = new Map();

            if (authorIds.length > 0) {
                const { data: books } = await supabase
                    .from('books')
                    .select('author_id');

                if (books) {
                    books.forEach(book => {
                        if (book.author_id) {
                            bookCountMap.set(book.author_id, (bookCountMap.get(book.author_id) || 0) + 1);
                        }
                    });
                }
            }

            const authorsList = (profiles || []).map(profile => ({
                id: profile.id,
                full_name: profile.username || 'Unknown Author',
                created_at: profile.updated_at,
                is_blocked: profile.is_blocked || false,
                bookCount: bookCountMap.get(profile.id) || 0,
            }));

            setAuthors(authorsList);
        } catch (error) {
            console.error('Error fetching authors:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSelectAuthor(author) {
        setSelectedAuthor(author);
        setLoadingBooks(true);

        try {
            // Fetch books - try by author_id first, fall back to author_name
            let query = supabase
                .from('books')
                .select('*, chapters(id, status)')
                .order('submitted_at', { ascending: false });

            if (author.id) {
                query = query.eq('author_id', author.id);
            } else {
                query = query.eq('author_name', author.full_name);
            }

            const { data: books, error } = await query;

            if (error) throw error;

            // Calculate chapter stats for each book
            const booksWithStats = (books || []).map(book => {
                const chapters = book.chapters || [];
                return {
                    ...book,
                    totalChapters: chapters.length,
                    inReview: chapters.filter(c => c.status === 'review').length,
                    approved: chapters.filter(c => c.status === 'approved' || c.status === 'published').length,
                    rejected: chapters.filter(c => c.status === 'rejected').length,
                };
            });

            setAuthorBooks(booksWithStats);
        } catch (error) {
            console.error('Error loading author books:', error);
            alert('Error loading books: ' + error.message);
        } finally {
            setLoadingBooks(false);
        }
    }

    async function handleToggleBlock(author) {
        const isCurrentlyBlocked = author.is_blocked;
        const action = isCurrentlyBlocked ? 'unblock' : 'block';

        const confirmMsg = isCurrentlyBlocked
            ? `Are you sure you want to unblock "${author.full_name || 'this author'}"?\n\nTheir books will be visible to readers again and they will be able to log in.`
            : `Are you sure you want to block "${author.full_name || 'this author'}"?\n\nThis will:\n• Hide all their books from readers\n• Prevent them from logging in\n• They will need to be unblocked to regain access`;

        if (!confirm(confirmMsg)) return;

        try {
            // Use RPC function with SECURITY DEFINER to bypass RLS
            const { error } = await supabase
                .rpc('toggle_author_block', {
                    target_author_id: author.id,
                    block_status: !isCurrentlyBlocked,
                });

            if (error) throw error;

            // Update local state
            const updated = { ...author, is_blocked: !isCurrentlyBlocked };
            setSelectedAuthor(updated);
            setAuthors(prev => prev.map(a => a.id === author.id ? updated : a));

            const successMsg = isCurrentlyBlocked
                ? `${author.full_name || 'Author'} has been unblocked. Their books are now visible and they can log in again.`
                : `${author.full_name || 'Author'} has been blocked. Their books are now hidden from readers and they cannot log in.`;
            alert(successMsg);
        } catch (error) {
            console.error('Error toggling block:', error);
            alert('Failed to update: ' + error.message);
        }
    }

    const handleBack = () => {
        setSelectedAuthor(null);
        setAuthorBooks([]);
    };

    const openUploadModal = () => {
        setUploadStep(1);
        setNewBookId(null);
        setBookTitle('');
        setBookDescription('');
        setBookCoverFile(null);
        setBookCoverPreview('');
        setChapterTitle('');
        setChapterContent('');
        setIsUploadModalOpen(true);
    };

    const closeUploadModal = () => {
        setIsUploadModalOpen(false);
        if (newBookId && selectedAuthor) {
            handleSelectAuthor(selectedAuthor); // Refresh books list
        }
    };

    const handleCoverChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setBookCoverFile(file);
            setBookCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleCreateBook = async () => {
        if (!bookTitle || !bookCoverFile) {
            alert("Title and Cover are required.");
            return;
        }
        setIsUploading(true);
        try {
            const timestamp = Date.now();
            const coverPath = `${selectedAuthor.id}/${timestamp}_${bookCoverFile.name}`;

            // Upload Cover to book_covers bucket
            const { error: uploadError } = await supabase.storage.from('book_covers').upload(coverPath, bookCoverFile);
            if (uploadError) throw uploadError;

            const { data: { publicUrl: coverUrl } } = supabase.storage.from('book_covers').getPublicUrl(coverPath);

            // Insert Book
            const { data: bookData, error: dbError } = await supabase.from('books').insert([{
                author_id: selectedAuthor.id,
                author_name: selectedAuthor.full_name,
                title: bookTitle,
                synopsis: bookDescription, // Mapping description from form to synopsis column
                cover_url: coverUrl,
                status: 'review', // Sent to review
                submitted_at: new Date().toISOString() // Set submitted_at so it shows up
            }]).select().single();

            if (dbError) throw dbError;

            setNewBookId(bookData.id);
            setUploadStep(2); // Move to chapters step
        } catch (error) {
            console.error('Error creating book:', error);
            alert('Failed to create book: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddChapter = async () => {
        if (!chapterTitle || !chapterContent) {
            alert("Chapter Title and Content are required.");
            return;
        }
        setIsUploading(true);
        try {
            // Calculate word count
            const wordCount = chapterContent.trim().split(/\s+/).filter(w => w.length > 0).length;

            // Optional: Upload chapter text as a Blob
            const contentBlob = new Blob([chapterContent], { type: 'text/plain' });
            const timestamp = Date.now();
            const contentPath = `chapters/${selectedAuthor.id}/${newBookId}/${timestamp}.txt`;

            const { error: uploadError } = await supabase.storage.from('chapters').upload(contentPath, contentBlob);
            if (uploadError) throw uploadError;

            const { data: { publicUrl: contentUrl } } = supabase.storage.from('chapters').getPublicUrl(contentPath);

            // We need to know what chapter number this is
            const { data: existingChapters } = await supabase.from('chapters').select('id').eq('book_id', newBookId);
            const chapterNum = existingChapters ? existingChapters.length + 1 : 1;

            const { error: dbError } = await supabase.from('chapters').insert([{
                book_id: newBookId,
                title: chapterTitle,
                chapter_number: chapterNum,
                content_url: contentUrl,
                word_count: wordCount,
                status: 'review', // Send directly to review
                submitted_at: new Date().toISOString()
            }]);

            if (dbError) throw dbError;

            alert(`Chapter ${chapterNum} added successfully!`);

            // Reset chapter form for the next one
            setChapterTitle('');
            setChapterContent('');
        } catch (error) {
            console.error('Error adding chapter:', error);
            alert('Failed to add chapter: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    // Get initials for avatar
    const getInitials = (author) => {
        const name = author.full_name || '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className={styles.container}>

            {selectedAuthor ? (
                // === AUTHOR DETAIL VIEW ===
                <>
                    <div className={styles.pageHeader} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <button className={styles.backBtn} onClick={handleBack}>
                            <ArrowLeft size={18} /> Back
                        </button>
                        <div className={styles.avatarLarge}>{getInitials(selectedAuthor)}</div>
                        <div style={{ flex: 1 }}>
                            <h2 className={styles.authorName}>
                                {selectedAuthor.full_name || 'Unnamed Author'}
                            </h2>
                            <div className={styles.authorMeta}>
                                {selectedAuthor.created_at && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Calendar size={14} /> Joined {new Date(selectedAuthor.created_at).toLocaleDateString()}
                                    </span>
                                )}
                                <span className={`${styles.statusBadge} ${selectedAuthor.is_blocked ? styles.blocked : styles.active}`}>
                                    {selectedAuthor.is_blocked ? 'Blocked' : 'Active'}
                                </span>
                            </div>
                        </div>
                        <button
                            className={`${styles.blockBtn} ${selectedAuthor.is_blocked ? styles.unblock : styles.block}`}
                            onClick={() => handleToggleBlock(selectedAuthor)}
                        >
                            {selectedAuthor.is_blocked ? (
                                <><ShieldOff size={16} /> Unblock Author</>
                            ) : (
                                <><Shield size={16} /> Block Author</>
                            )}
                        </button>
                    </div>

                    <div className={styles.detailPanel}>

                        {/* Books List */}
                        <div className={styles.booksSection}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
                                    <BookOpen size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                                    Books ({authorBooks.length})
                                </h3>
                                <button className={styles.uploadBtn} onClick={openUploadModal}>
                                    <UploadCloud size={16} /> Upload Book
                                </button>
                            </div>

                            {loadingBooks ? (
                                <div className={styles.loadingState}>
                                    <Loader className="animate-spin" size={24} /> Loading books...
                                </div>
                            ) : authorBooks.length === 0 ? (
                                <div className={styles.noBooksMsg}>
                                    This author hasn't submitted any books yet.
                                </div>
                            ) : (
                                <div className={styles.booksGrid}>
                                    {authorBooks.map(book => (
                                        <div key={book.id} className={styles.bookCard} onClick={() => navigate('/dashboard/books-review', { state: { selectedBook: book } })} style={{ cursor: 'pointer' }}>
                                            <div className={styles.coverContainer}>
                                                {book.cover_url ? (
                                                    <img
                                                        src={book.cover_url}
                                                        alt={book.title}
                                                        className={styles.coverImage}
                                                    />
                                                ) : (
                                                    <div className={styles.coverPlaceholder}>
                                                        <BookOpen size={48} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.bookCardInfo}>
                                                <div className={styles.bookCardTitle}>{book.title}</div>
                                                {book.submitted_at && (
                                                    <div className={styles.bookCardDate}>
                                                        Submitted: {new Date(book.submitted_at).toLocaleDateString()}
                                                    </div>
                                                )}
                                                <div className={styles.statChips}>
                                                    <span className={`${styles.chip} ${styles.total}`}>
                                                        <FileText size={10} /> {book.totalChapters} ch
                                                    </span>
                                                    {book.inReview > 0 && (
                                                        <span className={`${styles.chip} ${styles.review}`}>
                                                            {book.inReview} review
                                                        </span>
                                                    )}
                                                    {book.approved > 0 && (
                                                        <span className={`${styles.chip} ${styles.approved}`}>
                                                            {book.approved} ok
                                                        </span>
                                                    )}
                                                    {book.rejected > 0 && (
                                                        <span className={`${styles.chip} ${styles.rejected}`}>
                                                            {book.rejected} rej
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                // === AUTHORS GRID VIEW ===
                <>
                    <div className={styles.pageHeader}>
                        <h2 className={styles.pageTitle}>
                            Authors <span className={styles.authorCount}>({authors.length})</span>
                        </h2>
                    </div>

                    {loading ? (
                        <div className={styles.loadingState}>
                            <Loader className="animate-spin" size={32} /> Loading authors...
                        </div>
                    ) : authors.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Users size={64} style={{ opacity: 0.3 }} />
                            <h3>No authors found</h3>
                            <p>Authors will appear here once they sign up.</p>
                        </div>
                    ) : (
                        <div className={styles.authorsGrid}>
                            {authors.map(author => (
                                <div
                                    key={author.id}
                                    className={styles.authorCard}
                                    onClick={() => handleSelectAuthor(author)}
                                >
                                    <div className={styles.avatar}>{getInitials(author)}</div>
                                    <div className={styles.authorCardInfo}>
                                        <div className={styles.authorCardName}>
                                            {author.full_name || 'Unnamed Author'}
                                        </div>
                                        <div className={styles.authorCardEmail}>
                                            {`${author.bookCount} book${author.bookCount !== 1 ? 's' : ''}`}
                                        </div>
                                        <span className={`${styles.statusBadge} ${author.is_blocked ? styles.blocked : styles.active}`}>
                                            {author.is_blocked ? 'Blocked' : 'Active'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* --- UPLOAD BOOK MODAL --- */}
            {isUploadModalOpen && (
                <div className={styles.modalOverlay} onClick={closeUploadModal}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                {uploadStep === 1 ? 'Create New Book' : 'Add Chapters'}
                            </h3>
                            <button className={styles.closeBtn} onClick={closeUploadModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.stepIndicator}>
                                <div className={`${styles.step} ${uploadStep >= 1 ? styles.active : ''}`}>
                                    <div className={styles.stepNumber}>1</div>
                                    <span>Book Details</span>
                                </div>
                                <div className={styles.stepDivider}></div>
                                <div className={`${styles.step} ${uploadStep >= 2 ? styles.active : ''}`}>
                                    <div className={styles.stepNumber}>2</div>
                                    <span>Chapters</span>
                                </div>
                            </div>

                            {uploadStep === 1 && (
                                <div>
                                    <div className={styles.formGroup}>
                                        <label>Book Title *</label>
                                        <input
                                            type="text"
                                            value={bookTitle}
                                            onChange={(e) => setBookTitle(e.target.value)}
                                            placeholder="Enter book title"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Description</label>
                                        <textarea
                                            value={bookDescription}
                                            onChange={(e) => setBookDescription(e.target.value)}
                                            placeholder="Enter book description"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Cover Image *</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleCoverChange}
                                            style={{ display: 'none' }}
                                            id="cover-upload"
                                        />
                                        <label htmlFor="cover-upload" className={`${styles.fileInputArea} ${bookCoverFile ? styles.hasFile : ''}`}>
                                            {bookCoverPreview ? (
                                                <img src={bookCoverPreview} alt="Cover Preview" style={{ maxHeight: 200, borderRadius: 8, objectFit: 'contain' }} />
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <UploadCloud size={32} color="#A0AEC0" />
                                                    <div className={styles.fileInputText}>Click to upload cover image</div>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            )}

                            {uploadStep === 2 && (
                                <div>
                                    <div style={{ padding: 16, background: '#F0FFF4', border: '1px solid #C6F6D5', borderRadius: 8, color: '#276749', marginBottom: 24, fontSize: 14 }}>
                                        Book created successfully! Now you can add chapters to it.
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Chapter Title *</label>
                                        <input
                                            type="text"
                                            value={chapterTitle}
                                            onChange={(e) => setChapterTitle(e.target.value)}
                                            placeholder="e.g. Chapter 1: The Beginning"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Chapter Content *</label>
                                        <textarea
                                            value={chapterContent}
                                            onChange={(e) => setChapterContent(e.target.value)}
                                            placeholder="Paste the chapter text here..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.modalFooter}>
                            {uploadStep === 1 ? (
                                <>
                                    <button className={`${styles.btn} ${styles.btnCancel}`} onClick={closeUploadModal} disabled={isUploading}>
                                        Cancel
                                    </button>
                                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleCreateBook} disabled={isUploading || !bookTitle || !bookCoverFile}>
                                        {isUploading ? <><Loader size={16} className="animate-spin" /> Creating...</> : 'Create & Continue'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button className={`${styles.btn} ${styles.btnCancel}`} onClick={closeUploadModal} disabled={isUploading}>
                                        Done
                                    </button>
                                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAddChapter} disabled={isUploading || !chapterTitle || !chapterContent}>
                                        {isUploading ? <><Loader size={16} className="animate-spin" /> Uploading...</> : 'Upload Chapter'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
