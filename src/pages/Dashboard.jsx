import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, BookOpen, Video, ArrowUpRight, TrendingUp, Clock } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ readers: 0, authors: 0, videos: 0, books: 0, readTimeHours: 0 });
  const [weeklyStats, setWeeklyStats] = useState({ newReaders: 0, newAuthors: 0, newBooks: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);

      // 1. GET TOTAL COUNTS
      const { count: readerCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'reader');
      const { count: authorCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'author');
      const { count: videoCount } = await supabase.from('app_shorts').select('*', { count: 'exact', head: true });
      const { count: bookCount } = await supabase.from('books').select('*', { count: 'exact', head: true });

      // 2. ESTIMATE READING TIME from reading_progress + chapter word counts
      let totalReadMinutes = 0;
      try {
        // Get all reading progress entries with their book's chapters
        const { data: progressData } = await supabase
          .from('reading_progress')
          .select('book_id, last_read_chapter');

        if (progressData && progressData.length > 0) {
          // For each progress entry, get word counts of chapters read
          const bookIds = [...new Set(progressData.map(p => p.book_id))];
          const { data: chaptersData } = await supabase
            .from('chapters')
            .select('book_id, chapter_number, word_count')
            .in('book_id', bookIds);

          if (chaptersData) {
            // Sum word counts of chapters each user has read through
            progressData.forEach(progress => {
              const readChapters = chaptersData.filter(
                c => c.book_id === progress.book_id && c.chapter_number <= (progress.last_read_chapter || 0)
              );
              const wordsRead = readChapters.reduce((sum, c) => sum + (c.word_count || 0), 0);
              totalReadMinutes += wordsRead / 200; // ~200 words per minute
            });
          }
        }
      } catch (e) {
        console.warn('Could not estimate reading time:', e);
      }

      setStats({
        readers: readerCount || 0,
        authors: authorCount || 0,
        videos: videoCount || 0,
        books: bookCount || 0,
        readTimeHours: Math.round(totalReadMinutes / 60),
      });

      // 3. WEEKLY CHANGES (profiles created in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('updated_at, role')
        .gte('updated_at', sevenDaysAgo.toISOString())
        .order('updated_at', { ascending: true });

      const weekReaders = (profiles || []).filter(p => p.role === 'reader').length;
      const weekAuthors = (profiles || []).filter(p => p.role === 'author').length;

      // New books this week
      const { count: newBooksCount } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .gte('submitted_at', sevenDaysAgo.toISOString());

      setWeeklyStats({
        newReaders: weekReaders,
        newAuthors: weekAuthors,
        newBooks: newBooksCount || 0,
      });

      // 4. CHART DATA
      const dailyData = processChartData(profiles || []);
      setChartData(dailyData);

    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }

  // Helper to group profiles by day
  function processChartData(profiles) {
    const days = {};

    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' }); // "Mon", "Tue"
      days[dateStr] = { name: dateStr, readers: 0, authors: 0 };
    }

    // Fill with real data
    profiles.forEach(p => {
      const date = new Date(p.updated_at);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      if (days[dayName]) {
        if (p.role === 'reader') days[dayName].readers++;
        if (p.role === 'author') days[dayName].authors++;
      }
    });

    return Object.values(days);
  }

  const formatWeekly = (count) => {
    if (count === 0) return 'No change';
    return `+${count} this week`;
  };

  return (
    <div>
      {/* Top Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
        <StatCard
          title="Total Readers"
          value={loading ? '...' : stats.readers}
          icon={<BookOpen size={24} />}
          percent={loading ? '' : formatWeekly(weeklyStats.newReaders)}
        />
        <StatCard
          title="Total Authors"
          value={loading ? '...' : stats.authors}
          icon={<Users size={24} />}
          percent={loading ? '' : formatWeekly(weeklyStats.newAuthors)}
        />
        <StatCard
          title="Active Videos"
          value={loading ? '...' : stats.videos}
          icon={<Video size={24} />}
          percent={loading ? '' : 'Live'}
        />
        <StatCard
          title="Total Books"
          value={loading ? '...' : stats.books}
          icon={<BookOpen size={24} />}
          percent={loading ? '' : formatWeekly(weeklyStats.newBooks)}
        />
        <StatCard
          title="Reading Time"
          value={loading ? '...' : `${stats.readTimeHours}h`}
          icon={<Clock size={24} />}
          percent="All users"
          isGold
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>

        {/* Main Line Chart */}
        <div className="card" style={{ minHeight: 400, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>User Growth (Last 7 Days)</h3>
            <span style={{ fontSize: 12, color: '#888' }}>Live Data</span>
          </div>

          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReaders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="readers" name="Readers" stroke="#7C3AED" strokeWidth={3} fillOpacity={1} fill="url(#colorReaders)" />
                <Area type="monotone" dataKey="authors" name="Authors" stroke="#1A1A1A" strokeWidth={3} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Bar Chart */}
        <div className="card" style={{ minHeight: 400, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0 }}>User Distribution</h3>
          </div>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 10 }} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: 8 }} />
                <Bar dataKey="readers" name="Readers" fill="#7C3AED" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="authors" name="Authors" fill="#E2E2E2" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

// Re-usable Stat Card Component with "Skytix" styling
function StatCard({ title, value, icon, percent, isGold }) {
  return (
    <div className="card" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      background: isGold ? 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)' : 'white',
      color: isGold ? 'white' : '#1A1A1A'
    }}>
      <div>
        <div style={{
          color: isGold ? 'rgba(255,255,255,0.8)' : '#8898AA',
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {title}
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>{value}</div>

        {percent && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 12,
            background: isGold ? 'rgba(255,255,255,0.2)' : '#F5F3FF',
            color: isGold ? 'white' : '#7C3AED',
            fontWeight: 700
          }}>
            <TrendingUp size={12} /> {percent}
          </div>
        )}
      </div>

      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: isGold ? 'rgba(255,255,255,0.2)' : '#F4F6F8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isGold ? 'white' : '#7C3AED'
      }}>
        {icon}
      </div>
    </div>
  );
}