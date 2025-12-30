import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Plus, Search, Filter, Play, Trash2, Clock, X } from 'lucide-react';

export default function Videos() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for the video player modal
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  async function fetchVideos() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_shorts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteVideo(id) {
    if (!confirm('Are you sure you want to delete this video?')) return;
    try {
      const { error } = await supabase.from('app_shorts').delete().eq('id', id);
      if (error) throw error;
      setVideos(videos.filter(v => v.id !== id));
    } catch (error) {
      alert('Error deleting video');
    }
  }

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
            background: '#D4AF37', color: 'white', border: 'none',
            padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)'
          }}
        >
          <Plus size={18} /> Upload New Video
        </button>
      </div>

      {/* Search Bar */}
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
            <Plus size={32} color="#D4AF37" />
          </div>
          <h3 style={{ margin: '0 0 8px', color: '#1A1A1A' }}>No videos yet</h3>
          <p style={{ margin: 0, fontSize: 14 }}>Upload your first short to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 24 }}>
          {videos.map((video) => (
            <div key={video.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
              
              {/* Thumbnail Container (Clickable) */}
              <div 
                onClick={() => setSelectedVideo(video)} // <--- CLICK TO OPEN MODAL
                style={{ 
                  position: 'relative', 
                  aspectRatio: '9/16', 
                  borderRadius: 12, 
                  overflow: 'hidden', 
                  marginBottom: 16,
                  backgroundColor: '#000',
                  cursor: 'pointer',
                  group: 'thumbnail'
                }}
              >
                <img 
                  src={video.thumbnail_url} 
                  alt={video.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} 
                />
                {/* Play Button Overlay */}
                <div style={{ 
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0.8, transition: 'opacity 0.2s'
                }}>
                  <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={24} fill="white" stroke="white" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: '#1A1A1A' }}>{video.title}</h3>
                <div style={{ fontSize: 12, color: '#8898AA', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={12} />
                  {new Date(video.created_at).toLocaleDateString()}
                </div>
              </div>

              {/* Actions */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#4CAF50', fontWeight: 600, background: '#E8F5E9', padding: '4px 8px', borderRadius: 6 }}>
                  Active
                </span>
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

      {/* --- VIDEO PLAYER MODAL --- */}
      {selectedVideo && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ position: 'relative', width: '90%', maxWidth: '400px', aspectRatio: '9/16' }}>
            
            {/* Close Button */}
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

            {/* Video Player */}
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