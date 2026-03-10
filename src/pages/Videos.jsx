// import { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { supabase } from '../supabaseClient';
// import { Plus, Search, Filter, Play, Trash2, Clock, X } from 'lucide-react';

// export default function Videos() {
//   const navigate = useNavigate();
//   const [videos, setVideos] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // State for the video player modal
//   const [selectedVideo, setSelectedVideo] = useState(null);

//   useEffect(() => {
//     fetchVideos();
//   }, []);

//   async function fetchVideos() {
//     setLoading(true);
//     try {
//       const { data, error } = await supabase
//         .from('app_shorts')
//         .select('*')
//         .order('created_at', { ascending: false });

//       if (error) throw error;
//       setVideos(data || []);
//     } catch (error) {
//       console.error('Error fetching videos:', error);
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function deleteVideo(id) {
//     if (!confirm('Are you sure you want to delete this video?')) return;
//     try {
//       const { error } = await supabase.from('app_shorts').delete().eq('id', id);
//       if (error) throw error;
//       setVideos(videos.filter(v => v.id !== id));
//     } catch (error) {
//       alert('Error deleting video');
//     }
//   }

//   return (
//     <div>
//       {/* Header Section */}
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
//         <div>
//           <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#1A1A1A' }}>Video Library</h2>
//           <p style={{ margin: '4px 0 0', color: '#8898AA', fontSize: 14 }}>Manage your shorts and promotional content</p>
//         </div>

//         <button
//           onClick={() => navigate('/dashboard/videos/new')}
//           style={{
//             display: 'flex', alignItems: 'center', gap: 8,
//             background: '#7C3AED', color: 'white', border: 'none',
//             padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600,
//             cursor: 'pointer', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
//           }}
//         >
//           <Plus size={18} /> Upload New Video
//         </button>
//       </div>

//       {/* Search Bar */}
//       <div className="card" style={{ marginBottom: 24, display: 'flex', gap: 16, padding: 16 }}>
//         <div style={{ flex: 1, position: 'relative' }}>
//           <Search size={18} color="#8898AA" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
//           <input
//             type="text"
//             placeholder="Search videos..."
//             style={{ width: '100%', padding: '10px 10px 10px 42px', borderRadius: 8, border: '1px solid #E8E8E8', fontSize: 14, outline: 'none' }}
//           />
//         </div>
//       </div>

//       {/* VIDEO GRID */}
//       {loading ? (
//         <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading videos...</div>
//       ) : videos.length === 0 ? (
//         <div className="card" style={{ minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8898AA' }}>
//           <div style={{ background: '#F4F6F8', padding: 20, borderRadius: '50%', marginBottom: 16 }}>
//             <Plus size={32} color="#7C3AED" />
//           </div>
//           <h3 style={{ margin: '0 0 8px', color: '#1A1A1A' }}>No videos yet</h3>
//           <p style={{ margin: 0, fontSize: 14 }}>Upload your first short to get started.</p>
//         </div>
//       ) : (
//         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 24 }}>
//           {videos.map((video) => (
//             <div key={video.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>

//               {/* Thumbnail Container (Clickable) */}
//               <div
//                 onClick={() => setSelectedVideo(video)} // <--- CLICK TO OPEN MODAL
//                 style={{
//                   position: 'relative',
//                   aspectRatio: '9/16',
//                   borderRadius: 12,
//                   overflow: 'hidden',
//                   marginBottom: 16,
//                   backgroundColor: '#000',
//                   cursor: 'pointer',
//                   group: 'thumbnail'
//                 }}
//               >
//                 <img
//                   src={video.thumbnail_url}
//                   alt={video.title}
//                   style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
//                 />
//                 {/* Play Button Overlay */}
//                 <div style={{
//                   position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
//                   display: 'flex', alignItems: 'center', justifyContent: 'center',
//                   opacity: 0.8, transition: 'opacity 0.2s'
//                 }}>
//                   <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//                     <Play size={24} fill="white" stroke="white" />
//                   </div>
//                 </div>
//               </div>

//               {/* Info */}
//               <div style={{ flex: 1 }}>
//                 <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: '#1A1A1A' }}>{video.title}</h3>
//                 <div style={{ fontSize: 12, color: '#8898AA', display: 'flex', alignItems: 'center', gap: 6 }}>
//                   <Clock size={12} />
//                   {new Date(video.created_at).toLocaleDateString()}
//                 </div>
//               </div>

//               {/* Actions */}
//               <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                 <span style={{ fontSize: 12, color: '#4CAF50', fontWeight: 600, background: '#E8F5E9', padding: '4px 8px', borderRadius: 6 }}>
//                   Active
//                 </span>
//                 <button
//                   onClick={() => deleteVideo(video.id)}
//                   style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF5252', padding: 4 }}
//                   title="Delete Video"
//                 >
//                   <Trash2 size={18} />
//                 </button>
//               </div>

//             </div>
//           ))}
//         </div>
//       )}

//       {/* --- VIDEO PLAYER MODAL --- */}
//       {selectedVideo && (
//         <div style={{
//           position: 'fixed', inset: 0, zIndex: 9999,
//           background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
//           display: 'flex', alignItems: 'center', justifyContent: 'center'
//         }}>
//           <div style={{ position: 'relative', width: '90%', maxWidth: '400px', aspectRatio: '9/16' }}>

//             {/* Close Button */}
//             <button
//               onClick={() => setSelectedVideo(null)}
//               style={{
//                 position: 'absolute', top: -50, right: 0,
//                 background: 'white', border: 'none', borderRadius: '50%',
//                 width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
//                 cursor: 'pointer'
//               }}
//             >
//               <X size={24} color="black" />
//             </button>

//             {/* Video Player */}
//             <video
//               src={selectedVideo.video_url}
//               controls
//               autoPlay
//               style={{ width: '100%', height: '100%', borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', background: 'black' }}
//             />
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }








import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Plus, Search, Play, Trash2, Clock, X, Book, Link as LinkIcon, ChevronDown } from 'lucide-react';

export default function Videos() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [books, setBooks] = useState([]); 
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedVideo, setSelectedVideo] = useState(null);
  
  // Linking states
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [videoToLink, setVideoToLink] = useState(null);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  
  // Dropdown search states
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: videoData, error: videoError } = await supabase
        .from('app_shorts')
        .select('*')
        .order('created_at', { ascending: false });

      if (videoError) throw videoError;
      setVideos(videoData || []);

      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('id, title')
        .order('title');

      if (bookError) throw bookError;
      setBooks(bookData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteVideo(id) {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    try {
      const { error } = await supabase.from('app_shorts').delete().eq('id', id);
      if (error) throw error;
      setVideos(videos.filter(v => v.id !== id));
    } catch (error) {
      alert('Error deleting video');
    }
  }

  const openLinkModal = (video) => {
    setVideoToLink(video);
    setSelectedBookId(video.book_id || ''); 
    setBookSearchQuery(''); 
    setIsDropdownOpen(false); // Make sure dropdown is closed when opening modal
    setLinkModalOpen(true);
  };

  async function handleSaveLink() {
    if (!videoToLink) return;
    setIsLinking(true);

    const finalBookId = selectedBookId === '' ? null : selectedBookId;

    try {
      const { error } = await supabase
        .from('app_shorts')
        .update({ book_id: finalBookId })
        .eq('id', videoToLink.id);

      if (error) throw error;

      setVideos(videos.map(v => 
        v.id === videoToLink.id ? { ...v, book_id: finalBookId } : v
      ));
      
      setLinkModalOpen(false);
      setVideoToLink(null);
    } catch (error) {
      console.error('Error linking book:', error);
      alert('Failed to link book. Ensure app_shorts has a book_id column.');
    } finally {
      setIsLinking(false);
    }
  }

  const getBookTitle = (bookId) => {
    const book = books.find(b => b.id === bookId);
    return book ? book.title : 'Unknown Book';
  };

  // Filter books based on search query
  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(bookSearchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#1A1A1A' }}>Video Library</h2>
          <p style={{ margin: '4px 0 0', color: '#8898AA', fontSize: 14 }}>Manage your shorts and promotional content</p>
        </div>

        <button
          onClick={() => navigate('/dashboard/videos/new')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#7C3AED', color: 'white', border: 'none',
            padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
          }}
        >
          <Plus size={18} /> Upload New Video
        </button>
      </div>

      {/* Main Page Search Bar */}
      <div className="card" style={{ marginBottom: 24, display: 'flex', gap: 16, padding: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} color="#8898AA" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search videos..."
            style={{ width: '100%', padding: '10px 10px 10px 42px', borderRadius: 8, border: '1px solid #E8E8E8', fontSize: 14, outline: 'none' }}
          />
        </div>
      </div>

      {/* VIDEO GRID */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading videos...</div>
      ) : videos.length === 0 ? (
        <div className="card" style={{ minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8898AA' }}>
          <div style={{ background: '#F4F6F8', padding: 20, borderRadius: '50%', marginBottom: 16 }}>
            <Plus size={32} color="#7C3AED" />
          </div>
          <h3 style={{ margin: '0 0 8px', color: '#1A1A1A' }}>No videos yet</h3>
          <p style={{ margin: 0, fontSize: 14 }}>Upload your first short to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 24 }}>
          {videos.map((video) => (
            <div key={video.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>

              {/* Thumbnail Container */}
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <div 
                  onClick={() => setSelectedVideo(video)} 
                  style={{
                    aspectRatio: '9/16',
                    borderRadius: 12,
                    overflow: 'hidden',
                    backgroundColor: '#000',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Play size={24} fill="white" stroke="white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: '#1A1A1A' }}>{video.title}</h3>
                
                {/* Linked Book Badge */}
                {video.book_id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, color: '#7C3AED', background: '#F3E8FF', padding: '4px 8px', borderRadius: 6, width: 'fit-content' }}>
                    <Book size={14} /> {getBookTitle(video.book_id)}
                  </div>
                ) : (
                   <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, color: '#8898AA', background: '#F4F6F8', padding: '4px 8px', borderRadius: 6, width: 'fit-content' }}>
                    <LinkIcon size={14} /> Unlinked
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => openLinkModal(video)}
                  style={{ background: '#F4F6F8', color: '#4A5568', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <LinkIcon size={14} /> {video.book_id ? 'Change Book' : 'Link Book'}
                </button>
                <button
                  onClick={() => deleteVideo(video.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF5252', padding: 4 }}
                  title="Delete Video"
                >
                  <Trash2 size={18} />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* --- LINK BOOK MODAL --- */}
      {linkModalOpen && videoToLink && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '450px', padding: 24, background: 'white', borderRadius: 16, display: 'flex', flexDirection: 'column' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, color: '#1A1A1A' }}>Link Video to Book</h3>
                <button onClick={() => setLinkModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <X size={20} color="#888" />
                </button>
             </div>

             <p style={{ fontSize: 14, color: '#4A5568', marginBottom: 24 }}>
               Select a book to feature <strong>{videoToLink.title}</strong> on its detail page.
             </p>

             {/* Searchable Dropdown (Matches Upload Screen) */}
             <div style={{ position: 'relative', marginBottom: 40 }}>
               {/* Dropdown Trigger */}
               <div 
                 onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                 style={{ 
                   width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #ddd', 
                   background: 'white', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                 }}
               >
                 <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: selectedBookId ? '#1A1A1A' : '#888' }}>
                   <Book size={16} />
                   {selectedBookId ? getBookTitle(selectedBookId) : 'Select a book to link...'}
                 </div>
                 <ChevronDown size={16} color="#888" />
               </div>

               {/* Transparent overlay to close dropdown when clicking outside */}
               {isDropdownOpen && (
                 <div 
                   style={{ position: 'fixed', inset: 0, zIndex: 9 }} 
                   onClick={() => setIsDropdownOpen(false)} 
                 />
               )}

               {/* Dropdown Menu */}
               {isDropdownOpen && (
                 <div style={{ 
                   position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 10, 
                   background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                   overflow: 'hidden'
                 }}>
                   <div style={{ padding: 8, borderBottom: '1px solid #E2E8F0', position: 'relative' }}>
                     <Search size={14} color="#888" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                     <input
                       type="text"
                       placeholder="Search books..."
                       value={bookSearchQuery}
                       onChange={(e) => setBookSearchQuery(e.target.value)}
                       onClick={(e) => e.stopPropagation()} // Prevent closing when typing
                       style={{ width: '100%', padding: '8px 8px 8px 30px', borderRadius: 6, border: '1px solid #E2E8F0', outline: 'none', fontSize: 13 }}
                     />
                   </div>
                   <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                     <div
                       onClick={() => { setSelectedBookId(''); setIsDropdownOpen(false); }}
                       style={{ 
                         padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #E2E8F0', fontSize: 14,
                         background: selectedBookId === '' ? '#F3E8FF' : 'white',
                         color: selectedBookId === '' ? '#7C3AED' : '#4A5568',
                         fontWeight: selectedBookId === '' ? 600 : 400
                       }}
                     >
                       -- No Book (Unlink) --
                     </div>
                     {filteredBooks.map(book => (
                       <div
                         key={book.id}
                         onClick={() => { setSelectedBookId(book.id); setIsDropdownOpen(false); }}
                         style={{ 
                           padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #E2E8F0', fontSize: 14,
                           background: selectedBookId === book.id ? '#F3E8FF' : 'white',
                           color: selectedBookId === book.id ? '#7C3AED' : '#1A1A1A',
                           fontWeight: selectedBookId === book.id ? 600 : 400
                         }}
                       >
                         {book.title}
                       </div>
                     ))}
                     {filteredBooks.length === 0 && (
                       <div style={{ padding: '16px', textAlign: 'center', color: '#888', fontSize: 13 }}>
                         No books found.
                       </div>
                     )}
                   </div>
                 </div>
               )}
             </div>

             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 'auto' }}>
                <button 
                  onClick={() => setLinkModalOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#4A5568' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveLink}
                  disabled={isLinking}
                  style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#7C3AED', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                >
                  {isLinking ? 'Saving...' : 'Save Link'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* --- VIDEO PLAYER MODAL --- */}
      {selectedVideo && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ position: 'relative', width: '90%', maxWidth: '400px', aspectRatio: '9/16' }}>
            <button
              onClick={() => setSelectedVideo(null)}
              style={{
                position: 'absolute', top: -50, right: 0,
                background: 'white', border: 'none', borderRadius: '50%',
                width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={24} color="black" />
            </button>
            <video
              src={selectedVideo.video_url}
              controls
              autoPlay
              style={{ width: '100%', height: '100%', borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', background: 'black' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}