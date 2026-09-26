import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { MOCK_LISTINGS } from '../data/mockListings.js';
import { readJSON, writeJSON } from '../utils/storage.js';

const MarketplaceContext = createContext(null);

function loadUserListings() {
  return readJSON('listings', []);
}

function loadOffers() {
  return readJSON('offers', []);
}

export function MarketplaceProvider({ children }) {
  const [userListings, setUserListings] = useState(loadUserListings);
  const [offers, setOffers] = useState(loadOffers);

  const listings = useMemo(
    () => [...userListings, ...MOCK_LISTINGS],
    [userListings],
  );

  const getListing = useCallback(
    (id) => listings.find((l) => l.id === id) ?? null,
    [listings],
  );

  const publishListing = useCallback((payload) => {
    const listing = {
      ...payload,
      id: `u-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      seller: payload.seller ?? {
        id: 'u-yo',
        name: 'Tú',
        rating: 5,
        reviews: 0,
        verified: false,
      },
      distanceKm: payload.distanceKm ?? 0.5,
    };
    setUserListings((prev) => {
      const next = [listing, ...prev];
      writeJSON('listings', next);
      return next;
    });
    return listing;
  }, []);

  const makeOffer = useCallback(({ listingId, amount, message, buyerName }) => {
    const offer = {
      id: `o-${Date.now().toString(36)}`,
      listingId,
      amount: Number(amount),
      message: message?.trim() || '',
      buyerName: buyerName?.trim() || 'Comprador',
      status: 'pendiente',
      createdAt: new Date().toISOString(),
    };
    setOffers((prev) => {
      const next = [offer, ...prev];
      writeJSON('offers', next);
      return next;
    });
    return offer;
  }, []);

  const offersForListing = useCallback(
    (listingId) => offers.filter((o) => o.listingId === listingId),
    [offers],
  );

  const value = useMemo(
    () => ({
      listings,
      userListings,
      offers,
      getListing,
      publishListing,
      makeOffer,
      offersForListing,
    }),
    [
      listings,
      userListings,
      offers,
      getListing,
      publishListing,
      makeOffer,
      offersForListing,
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
    throw new Error('useMarketplace debe usarse dentro de MarketplaceProvider');
  }
  return ctx;
}
