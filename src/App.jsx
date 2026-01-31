import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import Videos from './pages/Videos';      
import Settings from './pages/Settings'; 
import UploadShorts from './pages/UploadShorts'; // <--- Import this
import ReviewDashboard from './pages/review/ReviewDashboard'; // <--- Import this

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route path="/dashboard" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          
          {/* Video Management Routes */}
          <Route path="videos" element={<Videos />} />
          <Route path="videos/new" element={<UploadShorts />} /> 
          <Route path="books-review" element={<ReviewDashboard />} /> 
          
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;