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
import MySalesPage from './pages/MySalesPage.jsx';
import AuthEntryPage from './pages/AuthEntryPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import HelpPage from './pages/HelpPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import CookiePage from './pages/CookiePage.jsx';
import MyOrdersPage from './pages/MyOrdersPage.jsx';
import OrderDetailPage from './pages/OrderDetailPage.jsx';
import OAuthCallbackPage from './pages/OAuthCallbackPage.jsx';

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
              <Route path="/mis-ventas" element={<MySalesPage />} />
              <Route path="/mis-pedidos" element={<MyOrdersPage />} />
              <Route path="/pedido/:id" element={<OrderDetailPage />} />
              <Route path="/configuracion" element={<SettingsPage />} />
              <Route path="/ayuda" element={<HelpPage />} />
              <Route path="/terminos" element={<TermsPage />} />
              <Route path="/privacidad" element={<PrivacyPage />} />
              <Route path="/cookies" element={<CookiePage />} />
              <Route path="/recuperar" element={<ForgotPasswordPage />} />
              <Route path="/restablecer" element={<ResetPasswordPage />} />
              <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
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
