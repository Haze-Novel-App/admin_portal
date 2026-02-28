// import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import Login from './pages/Login';
// import AdminLayout from './components/AdminLayout';
// import Dashboard from './pages/Dashboard';
// import Videos from './pages/Videos';      
// import Settings from './pages/Settings'; 
// import UploadShorts from './pages/UploadShorts'; // <--- Import this
// import ReviewDashboard from './pages/review/ReviewDashboard'; // <--- Import this

// function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<Login />} />
        
//         <Route path="/dashboard" element={<AdminLayout />}>
//           <Route index element={<Dashboard />} />
          
//           {/* Video Management Routes */}
//           <Route path="videos" element={<Videos />} />
//           <Route path="videos/new" element={<UploadShorts />} /> 
//           <Route path="books-review" element={<ReviewDashboard />} /> 
          
//           <Route path="settings" element={<Settings />} />
//         </Route>
//       </Routes>
//     </BrowserRouter>
//   );
// }

// export default App;














import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './pages/Login';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import Videos from './pages/Videos';      
import Settings from './pages/Settings'; 
import UploadShorts from './pages/UploadShorts';
import ReviewDashboard from './pages/review/ReviewDashboard';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* If session exists, "/" sends you to dashboard. Otherwise, show Login. */}
        <Route 
          path="/" 
          element={session ? <Navigate to="/dashboard" replace /> : <Login />} 
        />
        
        {/* PROTECTED ROUTES: If no session, any /dashboard access redirects to "/" (Login) */}
        <Route 
          path="/dashboard" 
          element={session ? <AdminLayout /> : <Navigate to="/" replace />}
        >
          <Route index element={<Dashboard />} />
          <Route path="videos" element={<Videos />} />
          <Route path="videos/new" element={<UploadShorts />} /> 
          <Route path="books-review" element={<ReviewDashboard />} /> 
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch-all to prevent blank screens */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;