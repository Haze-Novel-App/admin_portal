// import { useState, useRef } from 'react';
// import { supabase } from '../supabaseClient';
// import { useDropzone } from 'react-dropzone';
// import { UploadCloud, X, Play, Film, CheckCircle, AlertCircle } from 'lucide-react';

// export default function UploadShorts() {
//   const [file, setFile] = useState(null);
//   const [thumbnailBlob, setThumbnailBlob] = useState(null);
//   const [thumbnailPreview, setThumbnailPreview] = useState(null);
//   const [title, setTitle] = useState('');
//   const [uploading, setUploading] = useState(false);
//   const [error, setError] = useState('');

//   // Ref to a hidden video element to process the file
//   const videoRef = useRef(null);

//   // 1. Handle File Selection & Validation
//   const onDrop = (acceptedFiles) => {
//     setError('');
//     const selected = acceptedFiles[0];
//     if (!selected) return;

//     // Size Check (e.g., Max 50MB)
//     if (selected.size > 50 * 1024 * 1024) {
//       setError('File is too large. Max 50MB allowed for Shorts.');
//       return;
//     }

//     setFile(selected);

//     // Create a local URL to preview and process the video
//     const videoUrl = URL.createObjectURL(selected);
//     if (videoRef.current) {
//       videoRef.current.src = videoUrl;
//     }
//   };

//   // 2. Process Video (Duration Check & Thumbnail Generation)
//   const handleVideoLoaded = () => {
//     const video = videoRef.current;

//     // Duration Check
//     if (video.duration > 65) { // Allow slightly over 60s buffer
//       setError('Video is too long. Shorts must be under 60 seconds.');
//       setFile(null);
//       return;
//     }

//     // Auto-Generate Thumbnail at 1.0 second mark
//     video.currentTime = 1.0;
//   };

//   const handleSeeked = () => {
//     // This runs when the video jumps to 1.0s
//     const video = videoRef.current;
//     const canvas = document.createElement('canvas');
//     canvas.width = video.videoWidth;
//     canvas.height = video.videoHeight;

//     const ctx = canvas.getContext('2d');
//     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

//     // Convert to Blob for uploading
//     canvas.toBlob((blob) => {
//       setThumbnailBlob(blob);
//       setThumbnailPreview(URL.createObjectURL(blob));
//     }, 'image/jpeg', 0.8);
//   };

//   // 3. Upload Logic
//   const handleUpload = async () => {
//     if (!file || !title || !thumbnailBlob) return;
//     setUploading(true);

//     try {
//       const timestamp = Date.now();
//       const videoPath = `shorts/${timestamp}_${file.name}`;
//       const thumbPath = `thumbnails/${timestamp}_cover.jpg`;

//       // A. Upload Video
//       const { error: vidError } = await supabase.storage.from('videos').upload(videoPath, file);
//       if (vidError) throw vidError;

//       // B. Upload Thumbnail
//       const { error: thumbError } = await supabase.storage.from('videos').upload(thumbPath, thumbnailBlob);
//       if (thumbError) throw thumbError;

//       // C. Get Public URLs
//       const { data: { publicUrl: videoUrl } } = supabase.storage.from('videos').getPublicUrl(videoPath);
//       const { data: { publicUrl: thumbUrl } } = supabase.storage.from('videos').getPublicUrl(thumbPath);

//       // D. Save to DB
//       const { error: dbError } = await supabase.from('app_shorts').insert([{
//         title,
//         video_url: videoUrl,
//         thumbnail_url: thumbUrl,
//         is_active: true
//       }]);

//       if (dbError) throw dbError;

//       // Reset
//       alert('Short uploaded successfully!');
//       setFile(null);
//       setTitle('');
//       setThumbnailPreview(null);

//     } catch (err) {
//       alert('Upload failed: ' + err.message);
//     } finally {
//       setUploading(false);
//     }
//   };

//   const { getRootProps, getInputProps, isDragActive } = useDropzone({
//     onDrop,
//     accept: { 'video/mp4': ['.mp4', '.mov'] },
//     maxFiles: 1
//   });

//   return (
//     <div style={{ maxWidth: '800px', margin: '0 auto' }}>
//       <h2 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Upload Short</h2>

//       <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>

//         {/* LEFT COLUMN: Inputs */}
//         <div className="card">
//           <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#555' }}>Video Title</label>
//           <input
//             type="text"
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//             placeholder="e.g. New Fantasy Arrivals!"
//             className="input" // Make sure to define this class in your CSS or use inline styles
//             style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd', marginBottom: 20 }}
//           />

//           {/* Hidden Video Element for Processing */}
//           <video
//             ref={videoRef}
//             style={{ display: 'none' }}
//             onLoadedMetadata={handleVideoLoaded}
//             onSeeked={handleSeeked}
//             muted
//           />

//           {/* Dropzone Area */}
//           <div {...getRootProps()} style={{
//             border: '2px dashed #ddd',
//             borderRadius: 12,
//             padding: 40,
//             textAlign: 'center',
//             cursor: 'pointer',
//             backgroundColor: isDragActive ? '#F9FAFB' : 'white',
//             transition: 'all 0.2s'
//           }}>
//             <input {...getInputProps()} />
//             <div style={{ background: '#F4F6F8', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
//               <UploadCloud size={24} color="#7C3AED" />
//             </div>
//             <p style={{ fontWeight: 600, color: '#333' }}>Click or drag video here</p>
//             <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>MP4 or MOV, Max 60s</p>
//           </div>

//           {error && (
//             <div style={{ marginTop: 16, padding: 12, background: '#FFF4F4', color: '#D32F2F', borderRadius: 8, display: 'flex', gap: 8, fontSize: 14 }}>
//               <AlertCircle size={18} /> {error}
//             </div>
//           )}

//           <button
//             onClick={handleUpload}
//             disabled={uploading || !file}
//             style={{
//               width: '100%',
//               marginTop: 24,
//               padding: 14,
//               background: '#7C3AED',
//               color: 'white',
//               border: 'none',
//               borderRadius: 10,
//               fontSize: 16,
//               fontWeight: 600,
//               cursor: uploading || !file ? 'not-allowed' : 'pointer',
//               opacity: uploading || !file ? 0.6 : 1
//             }}
//           >
//             {uploading ? 'Uploading & Processing...' : 'Publish Short'}
//           </button>
//         </div>

//         {/* RIGHT COLUMN: Preview */}
//         <div>
//           <div style={{ fontWeight: 600, marginBottom: 12, color: '#555' }}>Mobile Preview</div>
//           <div style={{
//             width: '100%',
//             aspectRatio: '9/16',
//             background: '#1a1a1a',
//             borderRadius: 20,
//             overflow: 'hidden',
//             position: 'relative',
//             border: '4px solid #333',
//             boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
//           }}>
//             {thumbnailPreview ? (
//               <>
//                 <img src={thumbnailPreview} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
//                 <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.8))' }} />
//                 <div style={{ position: 'absolute', bottom: 20, left: 16, right: 16, color: 'white' }}>
//                   <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{title || 'Video Title'}</div>
//                   <div style={{ fontSize: 12, opacity: 0.8 }}>Admin • Just now</div>
//                 </div>
//                 <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//                   <Play size={24} fill="white" stroke="none" />
//                 </div>
//               </>
//             ) : (
//               <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
//                 <Film size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
//                 <div style={{ fontSize: 12 }}>Preview Area</div>
//               </div>
//             )}
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }












import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, Play, Film, CheckCircle, AlertCircle, Book, Search, ChevronDown } from 'lucide-react';

export default function UploadShorts() {
  const [file, setFile] = useState(null);
  const [thumbnailBlob, setThumbnailBlob] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Book Linking States
  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Ref to a hidden video element to process the file
  const videoRef = useRef(null);

  // Fetch books on mount
  useEffect(() => {
    async function fetchBooks() {
      const { data, error } = await supabase
        .from('books')
        .select('id, title')
        .order('title');
      
      if (!error && data) {
        setBooks(data);
      }
    }
    fetchBooks();
  }, []);

  // 1. Handle File Selection & Validation
  const onDrop = (acceptedFiles) => {
    setError('');
    const selected = acceptedFiles[0];
    if (!selected) return;

    // Size Check (e.g., Max 50MB)
    if (selected.size > 50 * 1024 * 1024) {
      setError('File is too large. Max 50MB allowed for Shorts.');
      return;
    }

    setFile(selected);

    // Create a local URL to preview and process the video
    const videoUrl = URL.createObjectURL(selected);
    if (videoRef.current) {
      videoRef.current.src = videoUrl;
    }
  };

  // 2. Process Video (Duration Check & Thumbnail Generation)
  const handleVideoLoaded = () => {
    const video = videoRef.current;

    // Duration Check
    if (video.duration > 65) { // Allow slightly over 60s buffer
      setError('Video is too long. Shorts must be under 60 seconds.');
      setFile(null);
      return;
    }

    // Auto-Generate Thumbnail at 1.0 second mark
    video.currentTime = 1.0;
  };

  const handleSeeked = () => {
    // This runs when the video jumps to 1.0s
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to Blob for uploading
    canvas.toBlob((blob) => {
      setThumbnailBlob(blob);
      setThumbnailPreview(URL.createObjectURL(blob));
    }, 'image/jpeg', 0.8);
  };

  // 3. Upload Logic
  const handleUpload = async () => {
    if (!file || !title || !thumbnailBlob) return;
    setUploading(true);

    try {
      const timestamp = Date.now();
      const videoPath = `shorts/${timestamp}_${file.name}`;
      const thumbPath = `thumbnails/${timestamp}_cover.jpg`;

      // A. Upload Video
      const { error: vidError } = await supabase.storage.from('videos').upload(videoPath, file);
      if (vidError) throw vidError;

      // B. Upload Thumbnail
      const { error: thumbError } = await supabase.storage.from('videos').upload(thumbPath, thumbnailBlob);
      if (thumbError) throw thumbError;

      // C. Get Public URLs
      const { data: { publicUrl: videoUrl } } = supabase.storage.from('videos').getPublicUrl(videoPath);
      const { data: { publicUrl: thumbUrl } } = supabase.storage.from('videos').getPublicUrl(thumbPath);

      // D. Save to DB with Book Link
      const { error: dbError } = await supabase.from('app_shorts').insert([{
        title,
        video_url: videoUrl,
        thumbnail_url: thumbUrl,
        is_active: true,
        book_id: selectedBookId || null // Attach the book_id here
      }]);

      if (dbError) throw dbError;

      // Reset
      alert('Short uploaded successfully!');
      setFile(null);
      setTitle('');
      setSelectedBookId('');
      setSearchQuery('');
      setThumbnailPreview(null);

    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/mp4': ['.mp4', '.mov'] },
    maxFiles: 1
  });

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedBookTitle = books.find(b => b.id === selectedBookId)?.title;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Upload Short</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>

        {/* LEFT COLUMN: Inputs */}
        <div className="card" style={{ position: 'relative' }}>
          
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#555' }}>Video Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New Fantasy Arrivals!"
            className="input"
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd', marginBottom: 20 }}
          />

          {/* NEW: Searchable Book Dropdown */}
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#555' }}>Link to Book (Optional)</label>
          <div style={{ position: 'relative', marginBottom: 20 }}>
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
                {selectedBookId ? selectedBookTitle : 'Select a book to link...'}
              </div>
              <ChevronDown size={16} color="#888" />
            </div>

            {/* Transparent overlay to handle closing dropdown when clicking outside */}
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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

          {/* Hidden Video Element for Processing */}
          <video
            ref={videoRef}
            style={{ display: 'none' }}
            onLoadedMetadata={handleVideoLoaded}
            onSeeked={handleSeeked}
            muted
          />

          {/* Dropzone Area */}
          <div {...getRootProps()} style={{
            border: '2px dashed #ddd',
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragActive ? '#F9FAFB' : 'white',
            transition: 'all 0.2s'
          }}>
            <input {...getInputProps()} />
            <div style={{ background: '#F4F6F8', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <UploadCloud size={24} color="#7C3AED" />
            </div>
            <p style={{ fontWeight: 600, color: '#333' }}>Click or drag video here</p>
            <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>MP4 or MOV, Max 60s</p>
            {file && (
               <div style={{ marginTop: 12, fontSize: 14, color: '#4CAF50', fontWeight: 600 }}>
                 <CheckCircle size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                 {file.name} selected
               </div>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 16, padding: 12, background: '#FFF4F4', color: '#D32F2F', borderRadius: 8, display: 'flex', gap: 8, fontSize: 14 }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || !file || !title}
            style={{
              width: '100%',
              marginTop: 24,
              padding: 14,
              background: '#7C3AED',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 600,
              cursor: uploading || !file || !title ? 'not-allowed' : 'pointer',
              opacity: uploading || !file || !title ? 0.6 : 1
            }}
          >
            {uploading ? 'Uploading & Processing...' : 'Publish Short'}
          </button>
        </div>

        {/* RIGHT COLUMN: Preview */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: 12, color: '#555' }}>Mobile Preview</div>
          <div style={{
            width: '100%',
            aspectRatio: '9/16',
            background: '#1a1a1a',
            borderRadius: 20,
            overflow: 'hidden',
            position: 'relative',
            border: '4px solid #333',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            {thumbnailPreview ? (
              <>
                <img src={thumbnailPreview} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.8))' }} />
                
                {/* Book Link Preview Badge */}
                {selectedBookId && (
                  <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '6px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, color: 'white', fontSize: 12, fontWeight: 600 }}>
                     <Book size={12} /> Linked: {selectedBookTitle}
                  </div>
                )}

                <div style={{ position: 'absolute', bottom: 20, left: 16, right: 16, color: 'white' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{title || 'Video Title'}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Admin • Just now</div>
                </div>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={24} fill="white" stroke="none" />
                </div>
              </>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
                <Film size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                <div style={{ fontSize: 12 }}>Preview Area</div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}