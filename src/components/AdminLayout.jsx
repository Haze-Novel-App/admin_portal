import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Video, Settings, LogOut, Bell, Search, User } from 'lucide-react';
import styles from './AdminLayout.module.css';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>✦</div> 
          Shelfie Admin
        </div>

        <nav>
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={location.pathname === '/dashboard'}
            onClick={() => navigate('/dashboard')}
          />
          <NavItem 
            icon={<Video size={20} />} 
            label="Videos" 
            active={location.pathname === '/dashboard/videos'}
            onClick={() => navigate('/dashboard/videos')}
          />
          <NavItem 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={location.pathname === '/dashboard/settings'}
            onClick={() => navigate('/dashboard/settings')}
          />
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <NavItem 
            icon={<LogOut size={20} />} 
            label="Logout" 
            onClick={() => {/* logout logic */}}
          />
        </div>
      </aside>

      {/* Main Area */}
      <div className={styles.main}>
        {/* Top Header */}
        <header className={styles.topbar}>
          <h1 className={styles.pageTitle}>Overview</h1>
          
          <div className={styles.profileSection}>
            <div className={styles.searchBar}>
              <Search size={16} style={{display:'inline', marginRight: 8}}/> Search...
            </div>
            <div style={{background: 'white', padding: 10, borderRadius: '50%', boxShadow: '0 2px 10px rgba(0,0,0,0.05)'}}>
              <Bell size={20} color="#555" />
            </div>
            <div style={{display:'flex', alignItems:'center', gap: 10}}>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:'bold', fontSize: 14}}>Admin User</div>
                <div style={{fontSize: 12, color:'#888'}}>Super Admin</div>
              </div>
              <div style={{width: 40, height: 40, background: '#D4AF37', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white'}}>
                <User size={20} />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div 
      onClick={onClick} 
      className={`${styles.navItem} ${active ? styles.active : ''}`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}