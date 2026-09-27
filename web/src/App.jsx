import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext.jsx';
import { MarketplaceProvider } from './store/MarketplaceContext.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import CookieBanner from './components/layout/CookieBanner.jsx';
import AuthModal from './components/auth/AuthModal.jsx';
import HomePage from './pages/HomePage.jsx';
import BrowsePage from './pages/BrowsePage.jsx';
import ListingDetailPage from './pages/ListingDetailPage.jsx';
import PublishPage from './pages/PublishPage.jsx';
import MyOffersPage from './pages/MyOffersPage.jsx';
import MyListingsPage from './pages/MyListingsPage.jsx';
import AuthEntryPage from './pages/AuthEntryPage.jsx';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MarketplaceProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/buscar" element={<BrowsePage />} />
              <Route path="/anuncio/:id" element={<ListingDetailPage />} />
              <Route path="/publicar" element={<PublishPage />} />
              <Route path="/mis-ofertas" element={<MyOffersPage />} />
              <Route path="/mis-anuncios" element={<MyListingsPage />} />
              <Route path="/registro" element={<AuthEntryPage mode="register" />} />
              <Route path="/entrar" element={<AuthEntryPage mode="login" />} />
              <Route path="/login" element={<AuthEntryPage mode="login" />} />
            </Routes>
            <AuthModal />
            <CookieBanner />
          </BrowserRouter>
        </MarketplaceProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
