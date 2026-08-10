import { useState } from 'react';
import { clearDemoSession, loadDemoSession, saveDemoSession } from './api/auth.js';
import { ToastProvider } from './components/Toast.jsx';
import Home from './pages/Home.jsx';
import MyAuctions from './pages/MyAuctions.jsx';
import AuctionDetail from './pages/AuctionDetail.jsx';
import Profile from './pages/Profile.jsx';

function AppRoutes() {
  const [session, setSession] = useState(loadDemoSession);
  const [view, setView] = useState('home');
  const [selectedAuctionId, setSelectedAuctionId] = useState(null);

  const handleSession = (next) => {
    saveDemoSession(next);
    setSession(next);
  };

  const handleLogout = () => {
    clearDemoSession();
    setSession(null);
    setView('home');
  };

  const openDetail = (auctionId) => {
    setSelectedAuctionId(auctionId);
    setView('detail');
  };

  const backToHome = () => {
    setSelectedAuctionId(null);
    setView('home');
  };

  if (view === 'detail' && selectedAuctionId) {
    return (
      <AuctionDetail
        session={session}
        onSession={handleSession}
        onLogout={handleLogout}
        onNavigateMine={() => setView('mine')}
        onNavigateProfile={() => setView('profile')}
        onNavigateHome={backToHome}
        onBack={backToHome}
        auctionId={selectedAuctionId}
      />
    );
  }

  if (view === 'mine') {
    return (
      <MyAuctions
        session={session}
        onBack={backToHome}
        onOpenDetail={openDetail}
      />
    );
  }

  if (view === 'profile') {
    return (
      <Profile
        session={session}
        onSession={handleSession}
        onLogout={handleLogout}
        onNavigateHome={backToHome}
        onNavigateMine={() => setView('mine')}
        onOpenDetail={openDetail}
      />
    );
  }

  return (
    <Home
      session={session}
      onSession={handleSession}
      onLogout={handleLogout}
      onNavigateMine={() => setView('mine')}
      onNavigateProfile={() => setView('profile')}
      onOpenDetail={openDetail}
    />
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}
