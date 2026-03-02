import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
    Users, User, ArrowLeft, Shield, ShieldOff,
    BookOpen, FileText, Loader, Mail, Calendar
} from 'lucide-react';
import styles from '../assets/styles/AuthorsPage.module.css';

export default function AuthorsPage() {
    const navigate = useNavigate();
    const [authors, setAuthors] = useState([]);
    const [selectedAuthor, setSelectedAuthor] = useState(null);
    const [authorBooks, setAuthorBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingBooks, setLoadingBooks] = useState(false);

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
                            <h3 className={styles.sectionTitle}>
                                <BookOpen size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                                Books ({authorBooks.length})
                            </h3>

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
        </div>
    );
}
