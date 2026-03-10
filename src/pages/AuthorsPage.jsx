



import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
    Users, User, ArrowLeft, Shield, ShieldOff,
    BookOpen, FileText, Loader, Mail, Calendar, Trash2, UserMinus,
    UserPlus, Eye, EyeOff, Phone, MapPin, X, Pencil, UploadCloud
} from 'lucide-react';
import styles from '../assets/styles/AuthorsPage.module.css';

export default function AuthorsPage() {
    const navigate = useNavigate();
    const [authors, setAuthors] = useState([]);
    const [selectedAuthor, setSelectedAuthor] = useState(null);
    const [authorBooks, setAuthorBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingBooks, setLoadingBooks] = useState(false);

    // Create Author Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [obscurePassword, setObscurePassword] = useState(true);
    const [createForm, setCreateForm] = useState({
        username: '',
        email: '',
        password: '',
        phone: '',
        location: '',
    });
    const [createErrors, setCreateErrors] = useState({});

    // Edit Author Modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [editForm, setEditForm] = useState({
        username: '',
        phone: '',
        location_name: '',
    });
    const [editErrors, setEditErrors] = useState({});
    const [editableColumns, setEditableColumns] = useState([]);

    // Upload Book Modal state
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadStep, setUploadStep] = useState(1);
    const [isUploading, setIsUploading] = useState(false);
    const [newBookId, setNewBookId] = useState(null);
    const [bookTitle, setBookTitle] = useState('');
    const [bookDescription, setBookDescription] = useState('');
    const [bookCoverFile, setBookCoverFile] = useState(null);
    const [bookCoverPreview, setBookCoverPreview] = useState('');
    const [chapterTitle, setChapterTitle] = useState('');
    const [chapterContent, setChapterContent] = useState('');

    useEffect(() => {
        fetchAuthors();
    }, []);

    async function fetchAuthors() {
        try {
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, username, updated_at, is_blocked')
                .eq('role', 'author')
                .order('updated_at', { ascending: false });

            if (profilesError) throw profilesError;

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
        const confirmMsg = isCurrentlyBlocked
            ? `Are you sure you want to unblock "${author.full_name || 'this author'}"?\n\nTheir books will be visible to readers again and they will be able to log in.`
            : `Are you sure you want to block "${author.full_name || 'this author'}"?\n\nThis will:\n• Hide all their books from readers\n• Prevent them from logging in\n• They will need to be unblocked to regain access`;

        if (!confirm(confirmMsg)) return;

        try {
            const { error } = await supabase
                .rpc('toggle_author_block', {
                    target_author_id: author.id,
                    block_status: !isCurrentlyBlocked,
                });

            if (error) throw error;

            const updated = { ...author, is_blocked: !isCurrentlyBlocked };
            setSelectedAuthor(updated);
            setAuthors(prev => prev.map(a => a.id === author.id ? updated : a));

            const successMsg = isCurrentlyBlocked
                ? `${author.full_name || 'Author'} has been unblocked.`
                : `${author.full_name || 'Author'} has been blocked.`;
            alert(successMsg);
        } catch (error) {
            console.error('Error toggling block:', error);
            alert('Failed to update: ' + error.message);
        }
    }

    // --- Create Author ---
    function validateCreateForm() {
        const errors = {};
        if (!createForm.username.trim()) errors.username = 'Username is required';
        if (!createForm.email.trim()) errors.email = 'Email is required';
        else if (!createForm.email.includes('@')) errors.email = 'Invalid email address';
        if (!createForm.password.trim()) errors.password = 'Password is required';
        else if (createForm.password.length < 6) errors.password = 'Minimum 6 characters';
        if (createForm.phone && createForm.phone.length !== 10) errors.phone = '10 digits required';
        return errors;
    }

    async function handleCreateAuthor(e) {
        e.preventDefault();
        const errors = validateCreateForm();
        setCreateErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setCreateLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: createForm.email.trim(),
                password: createForm.password.trim(),
                options: {
                    data: {
                        username: createForm.username.trim(),
                        role: 'author',
                        phone: createForm.phone.trim() || null,
                        location_name: createForm.location.trim() || null,
                    },
                },
            });

            if (error) throw error;

            alert(`Author "${createForm.username.trim()}" created successfully!`);
            setShowCreateModal(false);
            setCreateForm({ username: '', email: '', password: '', phone: '', location: '' });
            setCreateErrors({});
            fetchAuthors(); // Refresh the list
        } catch (error) {
            console.error('Error creating author:', error);
            alert('Failed to create author: ' + error.message);
        } finally {
            setCreateLoading(false);
        }
    }

    function openCreateModal() {
        setCreateForm({ username: '', email: '', password: '', phone: '', location: '' });
        setCreateErrors({});
        setObscurePassword(true);
        setShowCreateModal(true);
    }

    // --- Edit Author ---
    async function openEditModal(author) {
        try {
            // Fetch all profile columns (safe — won't error on missing columns)
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', author.id)
                .single();

            if (error) throw error;

            setEditForm({
                username: profile?.username || '',
                phone: profile?.phone || '',
                location_name: profile?.location_name || '',
            });
            // Store which columns actually exist so we only update those
            setEditableColumns(Object.keys(profile || {}));
            setEditErrors({});
            setShowEditModal(true);
        } catch (error) {
            console.error('Error fetching author details:', error);
            alert('Failed to load author details: ' + error.message);
        }
    }

    function validateEditForm() {
        const errors = {};
        if (!editForm.username.trim()) errors.username = 'Username is required';
        if (editForm.phone && editForm.phone.trim() !== '' && editForm.phone.replace(/\D/g, '').length !== 10) {
            errors.phone = '10 digits required';
        }
        return errors;
    }

    async function handleEditAuthor(e) {
        e.preventDefault();
        const errors = validateEditForm();
        setEditErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setEditLoading(true);
        try {
            // Build update payload with only columns that exist in the table
            const updateData = { username: editForm.username.trim() };
            if (editableColumns.includes('phone')) {
                updateData.phone = editForm.phone.trim() || null;
            }
            if (editableColumns.includes('location_name')) {
                updateData.location_name = editForm.location_name.trim() || null;
            }

            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', selectedAuthor.id);

            if (error) throw error;

            // Update local state
            const updatedAuthor = {
                ...selectedAuthor,
                full_name: editForm.username.trim(),
            };
            setSelectedAuthor(updatedAuthor);
            setAuthors(prev => prev.map(a =>
                a.id === selectedAuthor.id
                    ? { ...a, full_name: editForm.username.trim() }
                    : a
            ));

            alert('Author updated successfully!');
            setShowEditModal(false);
        } catch (error) {
            console.error('Error updating author:', error);
            alert('Failed to update author: ' + error.message);
        } finally {
            setEditLoading(false);
        }
    }

    // --- Delete Author (cascade all data) ---
    async function handleDeleteAuthor(author) {
        const confirmMsg = `⚠️ WARNING: Are you sure you want to PERMANENTLY DELETE "${author.full_name || 'this author'}"?\n\nThis will permanently delete:\n• All their books\n• All chapters\n• All AI review reports\n• All reading progress data\n• All likes\n• Their profile\n\nThis action CANNOT be undone.`;

        if (!window.confirm(confirmMsg)) return;

        const typedName = window.prompt(
            `To confirm, type the author's name exactly:\n\n${author.full_name}`
        );
        if (typedName !== author.full_name) {
            if (typedName !== null) alert('Name did not match. Deletion cancelled.');
            return;
        }

        try {
            setLoading(true);

            // 1. Get all book IDs by this author
            const { data: books } = await supabase
                .from('books')
                .select('id')
                .eq('author_id', author.id);

            const bookIds = (books || []).map(b => b.id);

            if (bookIds.length > 0) {
                // 2. Get all chapter IDs for those books
                const { data: chapters } = await supabase
                    .from('chapters')
                    .select('id')
                    .in('book_id', bookIds);

                const chapterIds = (chapters || []).map(c => c.id);

                // 3. Delete chapter review history
                if (chapterIds.length > 0) {
                    await supabase
                        .from('chapter_review_history')
                        .delete()
                        .in('chapter_id', chapterIds);
                }

                // 4. Delete reading progress
                await supabase
                    .from('reading_progress')
                    .delete()
                    .in('book_id', bookIds);

                // 5. Delete likes
                await supabase
                    .from('likes')
                    .delete()
                    .in('book_id', bookIds);

                // 6. Delete chapters
                await supabase
                    .from('chapters')
                    .delete()
                    .in('book_id', bookIds);

                // 7. Delete books
                await supabase
                    .from('books')
                    .delete()
                    .eq('author_id', author.id);
            }

            // 8. Delete the author's profile
            await supabase
                .from('profiles')
                .delete()
                .eq('id', author.id);

            alert(`Author "${author.full_name}" and all related data permanently deleted.`);
            setSelectedAuthor(null);
            setAuthorBooks([]);
            setAuthors(prev => prev.filter(a => a.id !== author.id));
        } catch (error) {
            console.error('Error deleting author:', error);
            alert('Failed to delete author: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    // --- NEW: Handle Safe Book Deletion ---
    async function handleDeleteBook(book, e) {
        // 1. Prevent the click from navigating to the book review page
        e.stopPropagation();

        // 2. Initial Warning
        const confirmMsg = `WARNING: Are you sure you want to delete "${book.title}"?\n\nThis will permanently delete the book, ALL its chapters, and ALL associated AI reports. This action CANNOT be undone.`;
        if (!window.confirm(confirmMsg)) return;

        // 3. Double Confirmation (Security best practice for destructive actions)
        const typedTitle = window.prompt(`To confirm this deletion, please type the exact title of the book:\n\n${book.title}`);
        if (typedTitle !== book.title) {
            if (typedTitle !== null) alert("The title did not match. Deletion cancelled to keep data safe.");
            return;
        }

        try {
            setLoadingBooks(true);

            // 4. Delete the book from Supabase
            // Note: This relies entirely on your database having ON DELETE CASCADE set up
            // for chapters and AI reports linked to this book's ID.
            const { error } = await supabase
                .from('books')
                .delete()
                .eq('id', book.id);

            if (error) {
                // If it fails due to foreign key constraints, it protects the data safely
                if (error.code === '23503') {
                    throw new Error("Cannot delete book because related chapters/reports exist and 'Cascade Delete' is not enabled in your database settings.");
                }
                throw error;
            }

            // 5. Update UI immediately without refreshing
            setAuthorBooks(prev => prev.filter(b => b.id !== book.id));

            // 6. Update the total book count on the author's card
            setAuthors(prev => prev.map(a =>
                a.id === selectedAuthor.id
                    ? { ...a, bookCount: Math.max(0, a.bookCount - 1) }
                    : a
            ));

            alert('Book and all related data successfully deleted.');
        } catch (error) {
            console.error('Error deleting book:', error);
            alert('Deletion failed: ' + error.message);
        } finally {
            setLoadingBooks(false);
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
                            className={styles.editAuthorBtn}
                            onClick={() => openEditModal(selectedAuthor)}
                        >
                            <Pencil size={16} /> Edit Author
                        </button>
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
                        <button
                            className={styles.deleteAuthorBtn}
                            onClick={() => handleDeleteAuthor(selectedAuthor)}
                        >
                            <UserMinus size={16} /> Delete Author
                        </button>
                    </div>

                    <div className={styles.detailPanel}>
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
                                        <div
                                            key={book.id}
                                            className={styles.bookCard}
                                            onClick={() => navigate('/dashboard/books-review', { state: { selectedBook: book } })}
                                            style={{ cursor: 'pointer', position: 'relative' }} // Added position relative
                                        >

                                            {/* --- NEW: Delete Book Button --- */}
                                            <button
                                                onClick={(e) => handleDeleteBook(book, e)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '12px',
                                                    right: '12px',
                                                    backgroundColor: '#ef4444', // Red-500
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '32px',
                                                    height: '32px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    zIndex: 10, // Ensure it sits above the card click layer
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                    transition: 'transform 0.2s ease, background-color 0.2s ease'
                                                }}
                                                title="Permanently Delete Book"
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'} // Red-600
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                                            >
                                                <Trash2 size={16} />
                                            </button>

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
                <>
                    <div className={styles.pageHeader}>
                        <h2 className={styles.pageTitle}>
                            Authors <span className={styles.authorCount}>({authors.length})</span>
                        </h2>
                        <button className={styles.createAuthorBtn} onClick={openCreateModal}>
                            <UserPlus size={16} /> Create Author
                        </button>
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

            {/* Create Author Modal */}
            {showCreateModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.modalCloseBtn} onClick={() => setShowCreateModal(false)}>
                            <X size={20} />
                        </button>
                        <div className={styles.modalLogo}>
                            <BookOpen size={32} color="#7C3AED" />
                            <span className={styles.modalLogoText}>Shelfie</span>
                        </div>
                        <h2 className={styles.modalTitle}>Create Author Account</h2>
                        <form onSubmit={handleCreateAuthor} className={styles.modalForm}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Username</label>
                                <input
                                    type="text"
                                    className={`${styles.formInput} ${createErrors.username ? styles.inputError : ''}`}
                                    placeholder="Username"
                                    value={createForm.username}
                                    onChange={(e) => setCreateForm(f => ({ ...f, username: e.target.value }))}
                                />
                                {createErrors.username && <span className={styles.errorText}>{createErrors.username}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Email</label>
                                <input
                                    type="email"
                                    className={`${styles.formInput} ${createErrors.email ? styles.inputError : ''}`}
                                    placeholder="Email"
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                                />
                                {createErrors.email && <span className={styles.errorText}>{createErrors.email}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Password</label>
                                <div className={styles.passwordWrapper}>
                                    <input
                                        type={obscurePassword ? 'password' : 'text'}
                                        className={`${styles.formInput} ${createErrors.password ? styles.inputError : ''}`}
                                        placeholder="Password"
                                        value={createForm.password}
                                        onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setObscurePassword(!obscurePassword)}
                                    >
                                        {obscurePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {createErrors.password && <span className={styles.errorText}>{createErrors.password}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Phone Number (Optional)</label>
                                <input
                                    type="tel"
                                    className={`${styles.formInput} ${createErrors.phone ? styles.inputError : ''}`}
                                    placeholder="Phone Number (Optional)"
                                    value={createForm.phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setCreateForm(f => ({ ...f, phone: val }));
                                    }}
                                />
                                {createErrors.phone && <span className={styles.errorText}>{createErrors.phone}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Location (Optional)</label>
                                <div className={styles.locationInput}>
                                    <MapPin size={16} className={styles.locationIcon} />
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        placeholder="Add Location (Optional)"
                                        value={createForm.location}
                                        onChange={(e) => setCreateForm(f => ({ ...f, location: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={createLoading}
                            >
                                {createLoading ? (
                                    <><Loader size={16} className="animate-spin" /> Creating...</>
                                ) : (
                                    'Sign up'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Author Modal */}
            {showEditModal && (
                <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.modalCloseBtn} onClick={() => setShowEditModal(false)}>
                            <X size={20} />
                        </button>
                        <div className={styles.modalLogo}>
                            <Pencil size={28} color="#7C3AED" />
                            <span className={styles.modalLogoText}>Edit Author</span>
                        </div>
                        <h2 className={styles.modalTitle}>
                            Update {selectedAuthor?.full_name || 'Author'}'s Info
                        </h2>
                        <form onSubmit={handleEditAuthor} className={styles.modalForm}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Username</label>
                                <input
                                    type="text"
                                    className={`${styles.formInput} ${editErrors.username ? styles.inputError : ''}`}
                                    placeholder="Username"
                                    value={editForm.username}
                                    onChange={(e) => setEditForm(f => ({ ...f, username: e.target.value }))}
                                />
                                {editErrors.username && <span className={styles.errorText}>{editErrors.username}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Phone Number</label>
                                <input
                                    type="tel"
                                    className={`${styles.formInput} ${editErrors.phone ? styles.inputError : ''}`}
                                    placeholder="Phone Number (Optional)"
                                    value={editForm.phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setEditForm(f => ({ ...f, phone: val }));
                                    }}
                                />
                                {editErrors.phone && <span className={styles.errorText}>{editErrors.phone}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Location</label>
                                <div className={styles.locationInput}>
                                    <MapPin size={16} className={styles.locationIcon} />
                                    <input
                                        type="text"
                                        className={styles.formInput}
                                        placeholder="Location (Optional)"
                                        value={editForm.location_name}
                                        onChange={(e) => setEditForm(f => ({ ...f, location_name: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={editLoading}
                            >
                                {editLoading ? (
                                    <><Loader size={16} className="animate-spin" /> Saving...</>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}