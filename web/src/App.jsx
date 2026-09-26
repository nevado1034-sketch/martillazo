import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MarketplaceProvider } from './store/MarketplaceContext.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import CookieBanner from './components/layout/CookieBanner.jsx';
import HomePage from './pages/HomePage.jsx';
import BrowsePage from './pages/BrowsePage.jsx';
import ListingDetailPage from './pages/ListingDetailPage.jsx';
import PublishPage from './pages/PublishPage.jsx';

export default function App() {
  return (
    <ToastProvider>
      <MarketplaceProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/buscar" element={<BrowsePage />} />
            <Route path="/anuncio/:id" element={<ListingDetailPage />} />
            <Route path="/publicar" element={<PublishPage />} />
          </Routes>
          <CookieBanner />
        </BrowserRouter>
      </MarketplaceProvider>
    </ToastProvider>
  );
}
