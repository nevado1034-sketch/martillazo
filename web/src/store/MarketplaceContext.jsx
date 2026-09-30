import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createListing, fetchListing, fetchListings } from '../api/listings.js';
import {
  createOffer,
  fetchListingOffers,
  fetchMyOffers,
} from '../api/offers.js';
import { useAuth } from './AuthContext.jsx';
import { mediaUrl } from '../api/config.js';

const MarketplaceContext = createContext(null);

function normalizeListing(listing) {
  if (!listing) return null;
  return {
    ...listing,
    images: (listing.images || []).map((u) => mediaUrl(u)),
    priceMode: listing.priceMode || listing.price_mode,
    availableToday: listing.availableToday ?? listing.available_today,
  };
}

export function MarketplaceProvider({ children }) {
  const { token } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshListings = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchListings(params);
      setListings((data || []).map(normalizeListing));
      return data;
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los anuncios');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshListings().catch(() => {});
  }, [refreshListings]);

  const getListing = useCallback(
    async (id) => {
      const data = await fetchListing(id, token);
      return normalizeListing(data);
    },
    [token],
  );

  const publishListing = useCallback(
    async (input) => {
      if (!token) throw new Error('Debes iniciar sesión para publicar');
      const created = normalizeListing(await createListing(token, input));
      setListings((prev) => [created, ...prev.filter((l) => l.id !== created.id)]);
      return created;
    },
    [token],
  );

  const makeOffer = useCallback(
    async ({ listingId, amount, message }) => {
      if (!token) throw new Error('Debes iniciar sesión para ofertar');
      return createOffer(token, listingId, { amount, message });
    },
    [token],
  );

  const loadOffers = useCallback(
    async (listingId) => {
      if (!token) return { offers: [], isSeller: false };
      return fetchListingOffers(token, listingId);
    },
    [token],
  );

  const loadMyOffers = useCallback(async () => {
    if (!token) return [];
    return fetchMyOffers(token);
  }, [token]);

  const value = useMemo(
    () => ({
      listings,
      loading,
      error,
      refreshListings,
      getListing,
      publishListing,
      makeOffer,
      loadOffers,
      loadMyOffers,
    }),
    [
      listings,
      loading,
      error,
      refreshListings,
      getListing,
      publishListing,
      makeOffer,
      loadOffers,
      loadMyOffers,
    ],
  );

  return (
    <MarketplaceContext.Provider value={value}>
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) {
    throw new Error('useMarketplace debe usarse dentro de MarketplaceContext');
  }
  return ctx;
}
