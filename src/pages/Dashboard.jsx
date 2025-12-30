import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, BookOpen, Video, ArrowUpRight, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ readers: 0, authors: 0, videos: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);

      // 1. GET TOTAL COUNTS (The fast way)
      // count: 'exact' gives us the number without downloading all rows
      const { count: readerCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'reader');
      const { count: authorCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'author');
      const { count: videoCount } = await supabase.from('app_shorts').select('*', { count: 'exact', head: true });

      setStats({ 
        readers: readerCount || 0, 
        authors: authorCount || 0, 
        videos: videoCount || 0 
      });

      // 2. GET CHART DATA (Growth last 7 days)
      // We fetch "created_at" for all profiles created in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('created_at, role')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Process data for the chart
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
      const date = new Date(p.created_at);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      if (days[dayName]) {
        if (p.role === 'reader') days[dayName].readers++;
        if (p.role === 'author') days[dayName].authors++;
      }
    });

    return Object.values(days);
  }

  return (
    <div>
      {/* Top Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 30 }}>
        <StatCard 
          title="Total Readers" 
          value={loading ? '...' : stats.readers} 
          icon={<BookOpen size={24} />} 
          percent={loading ? '' : "+2 this week"} 
        />
        <StatCard 
          title="Total Authors" 
          value={loading ? '...' : stats.authors} 
          icon={<Users size={24} />} 
          percent={loading ? '' : "+1 this week"} 
        />
        <StatCard 
          title="Active Videos" 
          value={loading ? '...' : stats.videos} 
          icon={<Video size={24} />} 
          percent="Live" 
        />
        <StatCard 
          title="Revenue" 
          value="$0.00" 
          icon={<TrendingUp size={24} />} 
          percent="Coming Soon" 
          isGold 
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        
        {/* Main Line Chart */}
        <div className="card" style={{ height: 400, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 20, display:'flex', justifyContent:'space-between' }}>
            <h3 style={{ margin:0 }}>User Growth (Last 7 Days)</h3>
            <span style={{ fontSize: 12, color: '#888' }}>Live Data</span>
          </div>
          
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReaders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#888', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill:'#888', fontSize: 12}} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="readers" name="Readers" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorReaders)" />
                <Area type="monotone" dataKey="authors" name="Authors" stroke="#1A1A1A" strokeWidth={3} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Bar Chart */}
        <div className="card" style={{ height: 400, display: 'flex', flexDirection: 'column' }}>
           <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin:0 }}>User Distribution</h3>
          </div>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#888', fontSize: 10}} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: 8 }}/>
                <Bar dataKey="readers" name="Readers" fill="#D4AF37" radius={[4, 4, 0, 0]} barSize={20} />
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
      background: isGold ? 'linear-gradient(135deg, #D4AF37 0%, #F3C647 100%)' : 'white',
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
            background: isGold ? 'rgba(255,255,255,0.2)' : '#FFF9E6', 
            color: isGold ? 'white' : '#D4AF37',
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
        color: isGold ? 'white' : '#D4AF37'
      }}>
        {icon}
      </div>
    </div>
  );
}