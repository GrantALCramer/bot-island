import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
const Gallery = lazy(() => import('./AvatarGallery.jsx'));
const gallery = new URLSearchParams(location.search).has('avgallery');
createRoot(document.getElementById('root')).render(gallery ? <Suspense fallback={null}><Gallery /></Suspense> : <App />);

// Register the installable service worker (network-first; never caches /api).
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
