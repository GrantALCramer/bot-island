import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
const HatGallery = React.lazy(() => import('./HatGallery.jsx'));
import './styles.css';
const Gallery = lazy(() => import('./AvatarGallery.jsx'));
const qs = new URLSearchParams(location.search);
createRoot(document.getElementById('root')).render(qs.has('hatgallery') ? <Suspense fallback={null}><HatGallery /></Suspense> : qs.has('avgallery') ? <Suspense fallback={null}><Gallery /></Suspense> : <App />);

// Register the installable service worker (network-first; never caches /api).
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
