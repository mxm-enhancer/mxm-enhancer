// ==UserScript==
// @name         Musixmatch Power Enhancer
// @namespace    https://github.com/mxm-enhancer/mxm-enhancer
// @version      2026.07.08.1847
// @description  Enhances Musixmatch with source IDs, track badges, ISRC info, Curators shortcuts, and search-result metadata overlays across /album, /lyrics, /artist, /search, and curators pages. Supports SPA navigation (Next.js).
// @author       mxm-enhancer
// @license      Copyright (c) 2026 mxm-enhancer — forks/contributions allowed, redistribution not permitted
// @homepageURL  https://github.com/mxm-enhancer/mxm-enhancer
// @supportURL   https://github.com/mxm-enhancer/mxm-enhancer/issues
// @updateURL    https://raw.githubusercontent.com/mxm-enhancer/mxm-enhancer/refs/heads/main/musixmatch-power-enhancer.user.js
// @downloadURL  https://raw.githubusercontent.com/mxm-enhancer/mxm-enhancer/refs/heads/main/musixmatch-power-enhancer.user.js
// @icon         https://raw.githubusercontent.com/mxm-enhancer/mxm-enhancer/refs/heads/main/img/icon.png
// @match        https://www.musixmatch.com/*
// @match        https://curators.musixmatch.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(function () {
  'use strict';
  const ALLOW_DEBUG_ACTIONS = (() => {
    try {
      return localStorage.getItem('mxmEnhancerDebug') === 'true';
    } catch (e) {
      return false;
    }
  })();
  const ROOT_ID = 'mxm-album-external-ids-box';
  const CURATORS_BOX_ID = 'mxm-ext-curators-track-box';
  const RELEASE_DATE_ID = 'mxm-ext-release-date';
  const LAST_EDIT_DATE_ID = 'mxm-ext-last-edit-date';
  const LYRICS_STATS_COLUMN_ATTR = 'data-mxm-ext-stats-column';
  const ALBUM_RELEASE_META_ATTR = 'data-mxm-ext-album-release';
  const ALBUM_META_BASE_ATTR = 'data-mxm-ext-base-text';
  const TRACKS_ATTR = 'data-mxm-ext-injected';
  const NAV_EVENT = 'mxm:navigate';
  const RETRY_INTERVAL_MS = 300;
  const RETRY_MAX_ATTEMPTS = 30;
  const NAV_DEBOUNCE_MS = 200;
  const TRACK_OBSERVER_DEBOUNCE_MS = 200;
  const COLORS = {
    spotifyGreen: '#1DB954',
    appleRed: '#fc3c44',
    amazonMusic: '#25D1DA',
    border: 'rgba(255, 255, 255, 0.1)',
    surface: 'rgba(255, 255, 255, 0.04)',
    text: 'rgba(255, 255, 255, 0.92)',
    textMuted: 'rgba(255, 255, 255, 0.48)',
  };
  const ICONS = {
    map: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>',
    external:
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    export:
      '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
    spotify:
      '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>',
    apple:
      '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 0 0-1.877-.726 10.496 10.496 0 0 0-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208A4.45 4.45 0 0 0 .09 4.7C.04 5.013.01 5.33 0 5.649v13.189c.01.31.04.63.09.94.174 1.097.63 2.05 1.4 2.824.99.99 2.21 1.38 3.56 1.405a1350.74 1350.74 0 0 0 3.95.008H17.03c.46-.005.91-.017 1.37-.065 1.46-.144 2.716-.7 3.66-1.824.69-.832 1.06-1.81 1.15-2.88.02-.27.03-.54.03-.82V6.64c-.01-.17-.02-.344-.046-.516zm-7.498 7.068-4.818 2.784-.003.002a.658.658 0 0 1-.33.09.661.661 0 0 1-.66-.663V7.61c0-.366.296-.662.66-.662.116 0 .23.03.333.09l4.818 2.784a.665.665 0 0 1 0 1.37z"/></svg>',
    addLyrics:
      '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    flagLyrics:
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    flagSync:
      '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    flagStructure:
      '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    flagInstrumental:
      '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    mxmLyrics:
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>',
    mxmAlbum: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>',
    curatorsTool:
      '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    calendar:
      '<path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10zM7 13h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"/>',
    clock:
      '<path d="M19.03 7.39l.77-.77c.367-.367.396-.959.032-1.33l-.12-.121c-.366-.362-.951-.331-1.315.033l-.777.778A8.962 8.962 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9a8.994 8.994 0 0 0 7.03-14.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7zm1-11v4a1 1 0 0 1-2 0V9a1 1 0 0 1 2 0zM9 2a1 1 0 0 1 1-1h4a1 1 0 0 1 0 2h-4a1 1 0 0 1-1-1z"/>',
    disk: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  };
  function createEl(tag, opts = {}) {
    const el = document.createElement(tag);
    if (opts.className) el.className = opts.className;
    if (opts.text !== undefined) el.textContent = String(opts.text);
    if (opts.html !== undefined) el.innerHTML = opts.html;
    if (opts.attrs) {
      for (const [k, v] of Object.entries(opts.attrs)) {
        if (v !== null && v !== undefined) el.setAttribute(k, String(v));
      }
    }
    if (opts.style) Object.assign(el.style, opts.style);
    return el;
  }
  let _tip = null;
  function getSharedTip() {
    if (!_tip) {
      _tip = document.createElement('span');
      _tip.style.cssText = `position:fixed;background:rgba(20,20,20,0.95);color:${COLORS.text};font-size:11px;font-family:sans-serif;white-space:nowrap;padding:3px 7px;border-radius:5px;pointer-events:none;opacity:0;transition:opacity 0.12s;z-index:2147483647;border:1px solid ${COLORS.border}`;
      document.body.appendChild(_tip);
    } else if (!_tip.parentNode) {
      document.body.appendChild(_tip);
    }
    return _tip;
  }
  function addTooltip(el, text) {
    el.addEventListener('mouseenter', () => {
      const tip = getSharedTip();
      tip.textContent = text;
      const rect = el.getBoundingClientRect();
      tip.style.left = '-9999px';
      tip.style.top = '-9999px';
      tip.style.opacity = '1';
      requestAnimationFrame(() => {
        const tw = tip.offsetWidth;
        const th = tip.offsetHeight;
        let left = rect.left + rect.width / 2 - tw / 2;
        let top = rect.top - th - 6;
        if (left < 4) left = 4;
        if (left + tw > window.innerWidth - 4)
          left = window.innerWidth - tw - 4;
        if (top < 4) top = rect.bottom + 6;
        tip.style.left = `${left}px`;
        tip.style.top = `${top}px`;
      });
    });
    el.addEventListener('mouseleave', () => {
      if (_tip) _tip.style.opacity = '0';
    });
  }
  function injectStyles() {
    if (document.getElementById('mxm-ext-styles')) return;
    const style = document.createElement('style');
    style.id = 'mxm-ext-styles';
    style.textContent = [
      `.mxm-ext-panel{padding:10px;border:1px solid ${COLORS.border};border-radius:14px;background:rgba(20,20,20,0.6);backdrop-filter:blur(6px);color:${COLORS.text};flex-shrink:0;box-sizing:border-box;font-size:13px;line-height:1.4;font-family:inherit}`,
      `.mxm-ext-tabs{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden;background:${COLORS.surface}}`,
      `.mxm-ext-tab{border:0;background:transparent;color:${COLORS.textMuted};padding:8px 6px;cursor:pointer;font-weight:600;font-size:12px;transition:color .15s,background .15s;user-select:none}`,
      `.mxm-ext-content{margin-top:10px}`,
      `.mxm-ext-col{display:flex;flex-direction:column}`,
      `.mxm-ext-empty{color:${COLORS.textMuted};font-size:12px;padding:8px 4px;text-align:center}`,
      '.mxm-ext-row{display:flex;align-items:center;gap:8px;padding:7px 4px;cursor:pointer;border-radius:6px;transition:background 0.12s}',
      '.mxm-ext-row:hover{background:rgba(255,255,255,0.05)!important}',
      `.mxm-ext-id{flex:1;font-size:12px;font-family:monospace;color:${COLORS.text};word-break:break-all;transition:color .15s;user-select:none;cursor:pointer}`,
      `.mxm-ext-map{color:${COLORS.textMuted};font-size:13px;text-decoration:none;line-height:1;flex-shrink:0;transition:color .12s;display:flex;align-items:center}`,
      '.mxm-ext-open{opacity:0.7;font-size:14px;text-decoration:none;line-height:1;flex-shrink:0;transition:opacity .12s;padding:2px 0}',
      '.mxm-ext-btn:hover{opacity:1!important}',
      `.mxm-ext-footer{margin-top:10px;padding-top:8px;border-top:1px solid ${COLORS.border};display:flex;align-items:center;gap:6px}`,
      `.mxm-ext-track-wrap{position:absolute;right:8px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:5px;z-index:9;pointer-events:auto;background:inherit}`,
      `.mxm-ext-track-id{font-size:10px;font-family:monospace;color:${COLORS.textMuted};white-space:nowrap;flex-shrink:0}`,
      '.mxm-ext-flags{display:flex;align-items:center;gap:3px;flex-shrink:0}',
      `.mxm-ext-sep{width:1px;height:12px;background:${COLORS.border};flex-shrink:0}`,
      '.mxm-ext-flag-wrap{display:flex;align-items:center;flex-shrink:0;cursor:default}',
      '.mxm-ext-flag-svg{flex-shrink:0;cursor:default;pointer-events:none}',
      '.mxm-ext-track-link{display:flex;align-items:center;opacity:0.7;text-decoration:none;flex-shrink:0;transition:opacity .12s}',
      `.mxm-ext-addlyrics{display:flex;align-items:center;color:${COLORS.textMuted};opacity:.7;text-decoration:none;flex-shrink:0;transition:opacity .12s}`,
      `[${LYRICS_STATS_COLUMN_ATTR}]{flex-direction:column!important;align-items:flex-start!important;gap:2px!important;width:100%}`,
      `*{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.18) transparent}`,
      `*::-webkit-scrollbar{width:6px;height:6px}`,
      `*::-webkit-scrollbar-track{background:transparent}`,
      `*::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.18);border-radius:4px}`,
      `*::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.36)}`,
      `*::-webkit-scrollbar-corner{background:transparent}`,
    ].join('');
    document.head.appendChild(style);
  }
  function resetInjectedState(removePanel = true) {
    if (removePanel) {
      const existing = document.getElementById(ROOT_ID);
      if (existing) existing.remove();
      const releaseDate = document.getElementById(RELEASE_DATE_ID);
      if (releaseDate) releaseDate.remove();
      const lastEditDate = document.getElementById(LAST_EDIT_DATE_ID);
      if (lastEditDate) lastEditDate.remove();
      document
        .querySelectorAll(`[${LYRICS_STATS_COLUMN_ATTR}]`)
        .forEach((el) => {
          el.removeAttribute(LYRICS_STATS_COLUMN_ATTR);
        });
      document
        .querySelectorAll(`[${ALBUM_RELEASE_META_ATTR}]`)
        .forEach((el) => {
          const base = el.getAttribute(ALBUM_META_BASE_ATTR);
          if (base) el.textContent = base;
          el.removeAttribute(ALBUM_RELEASE_META_ATTR);
          el.removeAttribute(ALBUM_META_BASE_ATTR);
        });
    }
    if (_lyricsDomObserver) {
      _lyricsDomObserver.disconnect();
      _lyricsDomObserver = null;
    }
    if (_artistDomObserver) {
      _artistDomObserver.disconnect();
      _artistDomObserver = null;
    }
    if (window._mxmTrackObserver) {
      window._mxmTrackObserver.disconnect();
      window._mxmTrackObserver = null;
    }
    document
      .querySelectorAll(`[${TRACKS_ATTR}]`)
      .forEach((el) => el.removeAttribute(TRACKS_ATTR));
  }
  function normalizeIds(value) {
    if (Array.isArray(value)) {
      return value
        .filter((item) => item !== null && item !== undefined)
        .map((item) => String(item).trim())
        .filter(Boolean);
    }
    if (value === null || value === undefined) {
      return [];
    }
    const single = String(value).trim();
    return single ? [single] : [];
  }
  function readAlbumData() {
    try {
      const components = window.next?.router?.components;
      if (components) {
        for (const key of Object.keys(components)) {
          const albumData =
            components[key]?.props?.pageProps?.data?.albumGet?.data;
          if (albumData?.externalIds) return albumData;
        }
      }
    } catch (e) {}
    console.warn('[mxm-ext-ids] No album data found in router.components');
    return null;
  }
  function readTrackData() {
    try {
      const components = window.next?.router?.components;
      if (components) {
        for (const key of Object.keys(components)) {
          const trackData =
            components[key]?.props?.pageProps?.data?.trackInfo?.data?.track;
          if (trackData?.commonTrackId) return trackData;
        }
      }
    } catch (e) {}
    console.warn('[mxm-ext-ids] No track data found in router.components');
    return null;
  }
  function readArtistData() {
    try {
      const components = window.next?.router?.components;
      if (components) {
        for (const key of Object.keys(components)) {
          const artistData =
            components[key]?.props?.pageProps?.data?.artistGet?.data;
          if (artistData?.id) return artistData;
        }
      }
    } catch (e) {}
    console.warn('[mxm-ext-ids] No artist data found in router.components');
    return null;
  }
  function readSearchTracks() {
    const collectedTracks = [];
    const seen = new Set();
    function pushTrack(track) {
      if (!track || typeof track !== 'object') return;
      if (!track.commontrack_vanity_id) return;
      const key = String(
        track.commontrack_id ?? track.track_id ?? track.commontrack_vanity_id,
      );
      if (seen.has(key)) return;
      seen.add(key);
      collectedTracks.push(track);
    }
    try {
      const components = window.next?.router?.components;
      if (components) {
        for (const key of Object.keys(components)) {
          const bodyData =
            components[key]?.props?.pageProps?.data?.openSearch?.data
              ?.opensearchTrackSearch?.body;
          if (!bodyData) continue;
          if (Array.isArray(bodyData.tracks)) {
            bodyData.tracks.forEach(pushTrack);
          }
          const bestMatch = bodyData.bestMatch;
          if (bestMatch?.type === 'track') {
            pushTrack(bestMatch);
          }
        }
      }
    } catch (e) {}
    if (collectedTracks.length) return collectedTracks;
    console.warn(
      '[mxm-ext-ids] No openSearch tracks found in router.components',
    );
    return null;
  }
  function buildServiceUrl(service, idValue) {
    const encodedId = encodeURIComponent(idValue);
    if (service === 'spotify') {
      return `https://open.spotify.com/album/${encodedId}`;
    }
    if (service === 'amazon') {
      return `https://music.amazon.com/albums/${encodedId}`;
    }
    return `https://music.apple.com/album/id/${encodedId}`;
  }
  function buildTrackServiceUrl(service, idValue) {
    const encodedId = encodeURIComponent(idValue);
    if (service === 'spotify') {
      return `https://open.spotify.com/track/${encodedId}`;
    }
    return `https://music.apple.com/song/id/${encodedId}`;
  }
  function buildArtistServiceUrl(service, idValue) {
    const encodedId = encodeURIComponent(idValue);
    if (service === 'spotify') {
      return `https://open.spotify.com/artist/${encodedId}`;
    }
    return `https://music.apple.com/artist/id/${encodedId}`;
  }
  function findCoverImage(albumData) {
    const imageTokens = [albumData?.coverImage500x500, albumData?.coverImage]
      .filter(Boolean)
      .map((url) => url.split('/').pop())
      .filter(
        (token) =>
          token && !token.startsWith('default') && !token.startsWith('nocover'),
      );
    if (imageTokens.length) {
      const found = Array.from(document.querySelectorAll('img')).find((img) => {
        const src = [
          img.currentSrc,
          img.src,
          img.getAttribute('src'),
          img.getAttribute('srcset'),
        ]
          .filter(Boolean)
          .join(' ');
        return imageTokens.some((token) => src.includes(token));
      });
      if (found) return found;
    }
    for (const img of document.querySelectorAll('main img, #__next img, img')) {
      const rect = img.getBoundingClientRect();
      if (rect.width >= 80 && rect.width <= 400 && rect.height >= 80) {
        const ratio = rect.width / rect.height;
        if (ratio >= 0.7 && ratio <= 1.4) return img;
      }
    }
    for (const svg of document.querySelectorAll('svg[viewBox="0 0 24 24"]')) {
      let el = svg.parentElement;
      let steps = 0;
      while (el && el !== document.body && steps < 5) {
        const rect = el.getBoundingClientRect();
        if (rect.width >= 80 && rect.width <= 400 && rect.height >= 80) {
          const ratio = rect.width / rect.height;
          if (ratio >= 0.7 && ratio <= 1.4) return el;
        }
        el = el.parentElement;
        steps++;
      }
    }
    return null;
  }
  function findColumnContainer(coverImage) {
    let current = coverImage;
    while (current.parentElement && current.parentElement !== document.body) {
      const parent = current.parentElement;
      const ps = window.getComputedStyle(parent);
      const isRowFlex =
        ps.display === 'flex' && !ps.flexDirection.startsWith('column');
      const isGrid = ps.display === 'grid';
      if ((isRowFlex || isGrid) && parent.children.length > 1) {
        return current;
      }
      current = parent;
    }
    return null;
  }
  function isAlbumPage(path) {
    return path.startsWith('/album/');
  }
  function isLyricsPage(path) {
    return path.startsWith('/lyrics/');
  }
  function isArtistPage(path) {
    return path.startsWith('/artist/');
  }
  function isSearchPage(path) {
    return path.startsWith('/search');
  }
  function isTargetPage(path) {
    return (
      isAlbumPage(path) ||
      isLyricsPage(path) ||
      isArtistPage(path) ||
      isSearchPage(path)
    );
  }
  function findContributeWidget() {
    const headings = document.querySelectorAll(
      'h1,h2,h3,h4,h5,h6,[role="heading"]',
    );
    for (const el of headings) {
      if (el.textContent.trim() !== 'Contribute') continue;
      const parent1 = el.parentElement;
      const parent2 = parent1?.parentElement;
      return parent2 || parent1 || el;
    }
    return null;
  }
  function findLyricsInfoBlock() {
    const verifyLink = document.querySelector('a[href*="webverify"]');
    if (verifyLink) {
      let el = verifyLink.parentElement;
      let steps = 0;
      while (el && el !== document.body && steps < 10) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 200) return el;
        el = el.parentElement;
        steps++;
      }
      return verifyLink.parentElement;
    }
    return null;
  }
  function formatReleaseDate(isoDate) {
    if (!isoDate) return null;
    try {
      const date = new Date(isoDate);
      if (Number.isNaN(date.getTime())) return null;
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(date);
    } catch (e) {
      return null;
    }
  }
  function formatLastEditDate(isoDate) {
    if (!isoDate) return null;
    try {
      const date = new Date(isoDate);
      if (Number.isNaN(date.getTime())) return null;
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    } catch (e) {
      return null;
    }
  }
  function findLyricsStatsRow() {
    function isStatsRow(node) {
      return (
        node?.classList?.contains('r-18u37iz') &&
        node.classList.contains('r-1s2bzr4') &&
        [...node.querySelectorAll('[dir="auto"]')].some((n) =>
          /\bcontributions\b|\bago\b/i.test(n.textContent ?? ''),
        )
      );
    }
    for (const el of document.querySelectorAll('[dir="auto"]')) {
      const text = el.textContent?.trim() ?? '';
      if (!/\bcontributions\b/i.test(text) && !/\bago\b/i.test(text)) continue;
      let node = el;
      for (let i = 0; i < 16; i++) {
        node = node.parentElement;
        if (!node) break;
        if (isStatsRow(node)) return node;
      }
    }
    for (const row of document.querySelectorAll('.r-1s2bzr4.r-18u37iz')) {
      if (isStatsRow(row)) return row;
    }
    const anchor = findContributeWidget() || findLyricsInfoBlock();
    if (anchor) {
      let container = anchor;
      for (let i = 0; i < 18; i++) {
        container = container.parentElement;
        if (!container || container === document.body) break;
        for (const row of container.querySelectorAll('.r-1s2bzr4.r-18u37iz')) {
          if (isStatsRow(row)) return row;
        }
      }
    }
    return null;
  }
  function prepareLyricsStatsColumn(statsRow) {
    if (!statsRow.classList.contains('r-1s2bzr4')) return;
    if (statsRow.getAttribute(LYRICS_STATS_COLUMN_ATTR)) return;
    statsRow.setAttribute(LYRICS_STATS_COLUMN_ATTR, '1');
  }
  function findLyricsAgoChip(statsRow) {
    for (const wrapper of statsRow.children) {
      if (wrapper.id === RELEASE_DATE_ID || wrapper.id === LAST_EDIT_DATE_ID) {
        continue;
      }
      const text = wrapper.textContent ?? '';
      if (/\bago\b/i.test(text)) return wrapper;
    }
    return null;
  }
  function createNativeLyricsStatChip(svgPath, text) {
    const outer = createEl('div', { className: 'css-g5y9jx' });
    const tabWrap = createEl('div', {
      className: 'css-g5y9jx r-1otgn73',
      attrs: { tabindex: '0' },
    });
    tabWrap.style.cursor = 'default';
    const shell = createEl('div', {
      className:
        'css-g5y9jx r-1awozwy r-1fuqb1j r-18u37iz r-1472mwg r-1777fci r-ddtstp r-1j93nrh r-1udh08x r-3o4zer',
    });
    const row = createEl('div', {
      className: 'css-g5y9jx r-1awozwy r-18u37iz',
    });
    const iconWrap = createEl('div', { className: 'css-g5y9jx r-1d4mawv' });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('fill', 'var(--mxm-contentPrimary)');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '16');
    svg.innerHTML = svgPath;
    iconWrap.appendChild(svg);
    const label = createEl('div', {
      className: 'css-146c3p1 r-fdjqy7 r-n6v787 r-1cwl3u0 r-lrvibr',
      text,
      attrs: { dir: 'auto' },
    });
    label.style.color = 'var(--mxm-contentPrimary)';
    row.appendChild(iconWrap);
    row.appendChild(label);
    shell.appendChild(row);
    tabWrap.appendChild(shell);
    outer.appendChild(tabWrap);
    return outer;
  }
  function injectLyricsStatChip(
    statsRow,
    chipId,
    svgPath,
    formatted,
    tooltip,
    insertBefore = null,
  ) {
    if (!formatted) return false;
    const existing = document.getElementById(chipId);
    if (existing) {
      const label = existing.querySelector('[dir="auto"]');
      if (label?.textContent === formatted) return true;
      existing.remove();
    }
    prepareLyricsStatsColumn(statsRow);
    const chip = createNativeLyricsStatChip(svgPath, formatted);
    chip.id = chipId;
    addTooltip(chip, tooltip);
    if (insertBefore?.parentElement === statsRow) {
      statsRow.insertBefore(chip, insertBefore);
    } else {
      statsRow.appendChild(chip);
    }
    return true;
  }
  function injectLyricsStatChips(trackData) {
    const statsRow = findLyricsStatsRow();
    if (!statsRow) return false;
    const releaseFormatted = formatReleaseDate(trackData?.releaseDate);
    const editFormatted = formatLastEditDate(trackData?.lastEditDate);
    if (!releaseFormatted && !editFormatted) return false;
    const agoChip = findLyricsAgoChip(statsRow);
    let injected = false;
    if (
      injectLyricsStatChip(
        statsRow,
        RELEASE_DATE_ID,
        ICONS.calendar,
        releaseFormatted,
        `Released ${releaseFormatted}`,
        agoChip,
      )
    ) {
      injected = true;
    }
    if (
      injectLyricsStatChip(
        statsRow,
        LAST_EDIT_DATE_ID,
        ICONS.clock,
        editFormatted,
        `Last edited ${editFormatted}`,
        agoChip,
      )
    ) {
      injected = true;
    }
    return injected;
  }
  function findAlbumMetadataLine() {
    for (const el of document.querySelectorAll('[dir="auto"]')) {
      const text = el.textContent?.trim() ?? '';
      if (
        /^(Album|Single|EP|Compilation)\b/i.test(text) &&
        text.includes('•') &&
        /\btracks?\b/i.test(text)
      ) {
        return el;
      }
    }
    return null;
  }
  function injectAlbumReleaseDate(albumData) {
    const formatted = formatReleaseDate(albumData?.releaseDate);
    if (!formatted) return false;
    const meta = findAlbumMetadataLine();
    if (!meta) return false;
    if (meta.getAttribute(ALBUM_RELEASE_META_ATTR) === formatted) return true;
    if (!meta.hasAttribute(ALBUM_META_BASE_ATTR)) {
      meta.setAttribute(ALBUM_META_BASE_ATTR, meta.textContent.trim());
    }
    const baseText = meta.getAttribute(ALBUM_META_BASE_ATTR);
    meta.textContent = `${baseText} • ${formatted}`;
    meta.setAttribute(ALBUM_RELEASE_META_ATTR, formatted);
    return true;
  }
  function lyricsChipPending(chipId, isoDate, formatter = formatReleaseDate) {
    return !document.getElementById(chipId) && !!formatter(isoDate);
  }
  function lyricsInjectComplete(pageData) {
    const panelDone =
      !!document.getElementById(ROOT_ID) ||
      !(findContributeWidget() || findLyricsInfoBlock());
    const releaseDone = !lyricsChipPending(
      RELEASE_DATE_ID,
      pageData?.releaseDate,
      formatReleaseDate,
    );
    const editDone = !lyricsChipPending(
      LAST_EDIT_DATE_ID,
      pageData?.lastEditDate,
      formatLastEditDate,
    );
    return panelDone && releaseDone && editDone;
  }
  function findGenresHeading() {
    const headings = document.querySelectorAll(
      'h1,h2,h3,h4,h5,h6,[role="heading"]',
    );
    for (const el of headings) {
      if (el.textContent.trim() !== 'Leaderboard') continue;
      const parent1 = el.parentElement;
      const parent2 = parent1?.parentElement;
      return parent2 || parent1 || el;
    }
    return null;
  }
  let _lyricsDomObserver = null;
  function waitForContributeWidgetThenInject(pageData) {
    function tryInjectAll() {
      if (!document.getElementById(ROOT_ID)) {
        const widget = findContributeWidget() || findLyricsInfoBlock();
        if (widget) renderBox(pageData, null, widget);
      }
      injectLyricsStatChips(pageData);
    }
    tryInjectAll();
    if (lyricsInjectComplete(pageData)) return;
    if (_lyricsDomObserver) return;
    _lyricsDomObserver = new MutationObserver(() => {
      tryInjectAll();
      if (lyricsInjectComplete(pageData)) {
        _lyricsDomObserver.disconnect();
        _lyricsDomObserver = null;
      }
    });
    _lyricsDomObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
  let _artistDomObserver = null;
  function waitForGenresHeadingThenInject(pageData) {
    if (document.getElementById(ROOT_ID)) return;
    const widget = findGenresHeading();
    if (widget) {
      renderBox(pageData, null, widget);
      return;
    }
    if (_artistDomObserver) return;
    _artistDomObserver = new MutationObserver(() => {
      if (document.getElementById(ROOT_ID)) {
        _artistDomObserver.disconnect();
        _artistDomObserver = null;
        return;
      }
      const w = findGenresHeading();
      if (w) {
        _artistDomObserver.disconnect();
        _artistDomObserver = null;
        renderBox(pageData, null, w);
      }
    });
    _artistDomObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
  function getServiceAccent(service) {
    if (service === 'spotify') return COLORS.spotifyGreen;
    if (service === 'amazon') return COLORS.amazonMusic;
    return COLORS.appleRed;
  }
  function createList(service, ids, isTrack = false, isArtist = false) {
    const accentColor = getServiceAccent(service);
    if (!ids.length) {
      const empty = createEl('div', {
        className: 'mxm-ext-empty',
        text: 'No data',
      });
      return empty;
    }
    const container = createEl('div', { className: 'mxm-ext-col' });
    ids.forEach((idValue, idx) => {
      const url = isTrack
        ? buildTrackServiceUrl(service, idValue)
        : isArtist
          ? buildArtistServiceUrl(service, idValue)
          : buildServiceUrl(service, idValue);
      const row = createEl('div', { className: 'mxm-ext-row' });
      if (idx < ids.length - 1) {
        row.style.borderBottom = `1px solid ${COLORS.border}`;
      }
      const idSpan = createEl('span', {
        className: 'mxm-ext-id',
        text: idValue,
      });
      addTooltip(idSpan, 'Click to copy');
      idSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard
          .writeText(idValue)
          .then(() => {
            idSpan.style.color = accentColor;
            setTimeout(() => {
              idSpan.style.color = COLORS.text;
            }, 400);
          })
          .catch(() => {});
      });
      row.appendChild(idSpan);
      if (service === 'spotify' && !isArtist) {
        const mapBtn = createEl('a', {
          className: 'mxm-ext-map',
          html: ICONS.map,
        });
        const spotifyUri = isTrack
          ? `spotify:track:${idValue}`
          : `spotify:album:${idValue}`;
        mapBtn.href = `https://spotify-availability-map.com/?album=${encodeURIComponent(spotifyUri)}`;
        mapBtn.target = '_blank';
        mapBtn.rel = 'noopener noreferrer';
        addTooltip(mapBtn, 'Spotify Availability Map');
        mapBtn.addEventListener('click', (e) => e.stopPropagation());
        mapBtn.addEventListener('mouseenter', () => {
          mapBtn.style.color = accentColor;
        });
        mapBtn.addEventListener('mouseleave', () => {
          mapBtn.style.color = COLORS.textMuted;
        });
        row.appendChild(mapBtn);
      }
      const openBtn = createEl('a', {
        className: 'mxm-ext-btn mxm-ext-open',
        html: ICONS.external,
      });
      openBtn.href = url;
      openBtn.target = '_blank';
      openBtn.rel = 'noopener noreferrer';
      addTooltip(openBtn, 'Open in new tab');
      openBtn.style.color = accentColor;
      openBtn.addEventListener('click', (e) => e.stopPropagation());
      row.appendChild(openBtn);
      row.addEventListener('click', () =>
        window.open(url, '_blank', 'noopener'),
      );
      container.appendChild(row);
    });
    return container;
  }
  function renderBox(albumData, coverImage, insertAfterEl) {
    if (document.getElementById(ROOT_ID)) {
      return;
    }
    const isTrack = !!albumData?._isTrack;
    const isArtist = !!albumData?._isArtist;
    const isAlbum = !isTrack && !isArtist;
    const spotifyIds = normalizeIds(
      isTrack
        ? albumData?.commontrackSpotifyIds
        : albumData?.externalIds?.spotify,
    );
    const itunesIds = normalizeIds(
      isTrack
        ? albumData?.commontrackItunesIds
        : albumData?.externalIds?.itunes,
    );
    const amazonIds = isAlbum
      ? normalizeIds(albumData?.externalIds?.amazon_music)
      : [];
    const showAmazonTab = isAlbum;
    let colContainer = null;
    let coverChild = coverImage;
    if (!insertAfterEl) {
      colContainer = findColumnContainer(coverImage);
      if (colContainer) {
        while (
          coverChild.parentElement &&
          coverChild.parentElement !== colContainer
        ) {
          coverChild = coverChild.parentElement;
        }
      }
    }
    const root = createEl('section', { className: 'mxm-ext-panel' });
    root.id = ROOT_ID;
    root.setAttribute('aria-label', 'Musixmatch album external IDs');
    root.style.marginTop = '10px';
    if (insertAfterEl) {
      root.style.width = '100%';
      root.style.boxSizing = 'border-box';
    } else {
      const panelWidth =
        Math.round(coverChild.getBoundingClientRect().width) + 20;
      root.style.width = `${panelWidth}px`;
    }
    const tabs = createEl('div', { className: 'mxm-ext-tabs' });
    if (showAmazonTab) {
      tabs.style.gridTemplateColumns = '1fr 1fr 1fr';
    }
    function makeTab(label, accentColor) {
      const btn = createEl('button', {
        className: 'mxm-ext-tab',
        text: label,
      });
      btn.type = 'button';
      btn._accent = accentColor;
      return btn;
    }
    const spotifyTab = makeTab('Spotify', COLORS.spotifyGreen);
    spotifyTab.style.borderRight = `1px solid ${COLORS.border}`;
    const appleTab = makeTab('Apple', COLORS.appleRed);
    if (showAmazonTab) {
      appleTab.style.borderRight = `1px solid ${COLORS.border}`;
    }
    const amazonTab = showAmazonTab
      ? makeTab('Amazon', COLORS.amazonMusic)
      : null;
    tabs.appendChild(spotifyTab);
    tabs.appendChild(appleTab);
    if (amazonTab) tabs.appendChild(amazonTab);
    root.appendChild(tabs);
    const content = createEl('div', { className: 'mxm-ext-content' });
    root.appendChild(content);
    function setTabActive(btn, active) {
      if (!btn) return;
      if (active) {
        btn.style.background = btn._accent + '22';
        btn.style.color = btn._accent;
      } else {
        btn.style.background = 'transparent';
        btn.style.color = COLORS.textMuted;
      }
    }
    function renderService(service) {
      content.innerHTML = '';
      const ids =
        service === 'spotify'
          ? spotifyIds
          : service === 'amazon'
            ? amazonIds
            : itunesIds;
      content.appendChild(createList(service, ids, isTrack, isArtist));
      setTabActive(spotifyTab, service === 'spotify');
      setTabActive(appleTab, service === 'itunes');
      setTabActive(amazonTab, service === 'amazon');
    }
    spotifyTab.addEventListener('click', () => renderService('spotify'));
    appleTab.addEventListener('click', () => renderService('itunes'));
    if (amazonTab) {
      amazonTab.addEventListener('click', () => renderService('amazon'));
    }
    renderService('spotify');
    const albumIdFooter = createEl('div', { className: 'mxm-ext-footer' });
    const albumIdLabel = createEl('span', {
      text: isTrack ? 'Abstrack' : isArtist ? 'Artist ID' : 'Album ID',
    });
    albumIdLabel.style.cssText = `font-size:11px;color:${COLORS.textMuted};flex-shrink:0`;
    const albumIdValue = createEl('span', {
      text: String(isTrack ? albumData.commonTrackId : albumData.id),
    });
    albumIdValue.style.cssText = `font-size:11px;font-family:monospace;color:${COLORS.text}`;
    let exportBtn = null;
    if (ALLOW_DEBUG_ACTIONS) {
      exportBtn = createEl('button', {
        html: ICONS.export,
        className: 'mxm-ext-btn',
      });
      exportBtn.type = 'button';
      exportBtn.style.cssText = `background:transparent;border:0;padding:2px;cursor:pointer;color:${COLORS.textMuted};display:flex;align-items:center;flex-shrink:0;opacity:0.5;transition:opacity 0.15s,color 0.15s;margin-left:auto`;
      addTooltip(exportBtn, 'Copy DEBUG data');
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard
          .writeText(JSON.stringify(albumData, null, 2))
          .then(() => {
            exportBtn.style.color = COLORS.spotifyGreen;
            exportBtn.style.opacity = '1';
            setTimeout(() => {
              exportBtn.style.color = COLORS.textMuted;
              exportBtn.style.opacity = '0.5';
            }, 800);
          })
          .catch(() => {});
      });
    }
    const _copyIdVal = String(isTrack ? albumData.commonTrackId : albumData.id);
    albumIdFooter.style.cursor = 'pointer';
    albumIdFooter.style.userSelect = 'none';
    addTooltip(albumIdValue, 'Click to copy');
    albumIdFooter.addEventListener('click', (e) => {
      if (exportBtn && (e.target === exportBtn || exportBtn.contains(e.target)))
        return;
      navigator.clipboard
        .writeText(_copyIdVal)
        .then(() => {
          albumIdValue.style.color = COLORS.spotifyGreen;
          setTimeout(() => {
            albumIdValue.style.color = COLORS.text;
          }, 400);
        })
        .catch(() => {});
    });
    albumIdFooter.appendChild(albumIdLabel);
    albumIdFooter.appendChild(albumIdValue);
    if (exportBtn) albumIdFooter.appendChild(exportBtn);
    root.appendChild(albumIdFooter);
    if (insertAfterEl) {
      insertAfterEl.insertAdjacentElement('afterend', root);
      return;
    }
    if (!colContainer) {
      coverImage.insertAdjacentElement('afterend', root);
      return;
    }
    if (coverChild.parentElement === colContainer) {
      coverChild.insertAdjacentElement('afterend', root);
    } else {
      colContainer.appendChild(root);
    }
  }
  function hideNativeAddLyrics() {
    document
      .querySelectorAll('button[href*="curators.musixmatch.com/tool"]')
      .forEach((btn) => {
        const grandparent = btn.parentElement?.parentElement;
        if (grandparent && grandparent.style.display !== 'none') {
          grandparent.style.display = 'none';
        }
      });
  }
  function buildTrackMap(albumData) {
    const map = new Map();
    if (!Array.isArray(albumData?.trackList)) return map;
    for (const track of albumData.trackList) {
      if (track?.vanityId) map.set(track.vanityId, track);
    }
    return map;
  }
  function safeDecodePart(part) {
    if (!part) return '';
    try {
      return decodeURIComponent(part);
    } catch (e) {
      return part;
    }
  }
  function normalizeVanityId(vanityId) {
    return String(vanityId || '')
      .trim()
      .replace(/^\/lyrics\//, '')
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => safeDecodePart(part).toLowerCase())
      .join('/');
  }
  function extractLyricsVanityId(rawHref) {
    if (!rawHref || !rawHref.includes('/lyrics/')) return '';
    try {
      const url = new URL(rawHref, window.location.origin);
      const path = url.pathname;
      const idx = path.indexOf('/lyrics/');
      if (idx < 0) return '';
      return normalizeVanityId(path.slice(idx + '/lyrics/'.length));
    } catch (e) {
      const cleanHref = String(rawHref).split(/[?#]/)[0];
      const idx = cleanHref.indexOf('/lyrics/');
      if (idx < 0) return '';
      return normalizeVanityId(cleanHref.slice(idx + '/lyrics/'.length));
    }
  }
  function buildSearchTrackMap(tracks) {
    const map = new Map();
    if (!Array.isArray(tracks)) return map;
    for (const track of tracks) {
      const vanityKey = normalizeVanityId(track?.commontrack_vanity_id);
      if (!vanityKey || map.has(vanityKey)) continue;
      map.set(vanityKey, track);
    }
    return map;
  }
  function isPlayerLikeContainer(el) {
    if (!el || el === document.body) return false;
    const ps = window.getComputedStyle(el);
    if (ps.position === 'fixed' || ps.position === 'sticky') return true;

    if (el.querySelector('input[type="range"], [role="slider"], progress')) {
      return true;
    }
    return false;
  }
  function findTrackRow(linkEl) {
    let el = linkEl.parentElement;
    if (!el) return linkEl;
    let steps = 0;
    while (el && el !== document.body && steps < 10) {
      const ps = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const isFlexOrGrid = ps.display === 'flex' || ps.display === 'grid';
      const reasonableHeight = rect.height > 0 && rect.height < 150;
      const reasonableWidth = rect.width > 200;
      if (
        isFlexOrGrid &&
        reasonableHeight &&
        reasonableWidth &&
        !isPlayerLikeContainer(el)
      ) {
        return el;
      }
      el = el.parentElement;
      steps++;
    }
    return linkEl.parentElement;
  }
  function createFlagIcon(svgPath, active, activeColor, label) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', active ? activeColor : COLORS.textMuted);
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.classList.add('mxm-ext-flag-svg');
    svg.innerHTML = svgPath;
    const wrap = createEl('span', { className: 'mxm-ext-flag-wrap' });
    wrap.appendChild(svg);
    addTooltip(wrap, label);
    return wrap;
  }
  function appendSeparator(parent) {
    const separator = createEl('span', { className: 'mxm-ext-sep' });
    parent.appendChild(separator);
  }
  function isTruthyFlag(value) {
    if (value === true) return true;
    if (value === false || value === null || value === undefined) return false;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return (
        normalized === '1' || normalized === 'true' || normalized === 'yes'
      );
    }
    return Number(value) === 1;
  }
  function hasSyncedSubtitlesFlag(track) {
    return (
      isTruthyFlag(track?.hasSync) ||
      isTruthyFlag(track?.hasSubtitles) ||
      isTruthyFlag(track?.has_sync) ||
      isTruthyFlag(track?.has_subtitles)
    );
  }
  function createTrackServiceLink(service, idValue) {
    const link = document.createElement('a');
    if (service === 'spotify') {
      link.href = `https://open.spotify.com/track/${encodeURIComponent(idValue)}`;
      link.className = 'mxm-ext-btn mxm-ext-track-link';
      link.style.color = COLORS.spotifyGreen;
      link.title = `Open in Spotify (${idValue})`;
      link.innerHTML = ICONS.spotify;
    } else {
      link.href = `https://music.apple.com/song/id/${encodeURIComponent(idValue)}`;
      link.className = 'mxm-ext-btn mxm-ext-track-link';
      link.style.color = COLORS.appleRed;
      link.title = `Open in Apple Music (${idValue})`;
      link.innerHTML = ICONS.apple;
    }
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.addEventListener('click', (e) => e.stopPropagation());
    return link;
  }
  function createTrackBadges(track) {
    const frag = document.createDocumentFragment();
    const wrapper = createEl('div', { className: 'mxm-ext-track-wrap' });
    if (track.commonTrackId) {
      const idSpan = createEl('span', {
        className: 'mxm-ext-track-id',
        text: String(track.commonTrackId),
      });
      idSpan.title = 'Abstrack';
      wrapper.appendChild(idSpan);
    }
    const flagsDiv = createEl('div', { className: 'mxm-ext-flags' });
    if (!track.hasLyrics && track.commonTrackId && track.vanityId) {
      const referrer = encodeURIComponent(
        `https://www.musixmatch.com/lyrics/${track.vanityId}`,
      );
      const addLyricsLink = createEl('a', {
        className: 'mxm-ext-btn mxm-ext-addlyrics',
        html: ICONS.addLyrics,
      });
      addLyricsLink.href = `https://curators.musixmatch.com/tool?mode=edit&commontrack_id=${track.commonTrackId}&referrer=${referrer}`;
      addLyricsLink.target = '_blank';
      addLyricsLink.rel = 'noopener noreferrer';
      addLyricsLink.addEventListener('click', (e) => e.stopPropagation());
      addTooltip(addLyricsLink, 'Add lyrics');
      flagsDiv.appendChild(addLyricsLink);
    }
    if (track.hasLyrics) {
      flagsDiv.appendChild(
        createFlagIcon(ICONS.flagLyrics, true, COLORS.text, 'Lyrics'),
      );
    }
    if (hasSyncedSubtitlesFlag(track)) {
      flagsDiv.appendChild(
        createFlagIcon(ICONS.flagSync, true, '#a78bfa', 'Synced'),
      );
    }
    if (track.hasTrackStructure) {
      flagsDiv.appendChild(
        createFlagIcon(ICONS.flagStructure, true, '#60a5fa', 'Track structure'),
      );
    }
    if (track.isInstrumental) {
      flagsDiv.appendChild(
        createFlagIcon(ICONS.flagInstrumental, true, '#f59e0b', 'Instrumental'),
      );
    }
    if (flagsDiv.childElementCount > 0) {
      if (wrapper.childElementCount > 0) {
        const sep1 = document.createElement('span');
        sep1.style.cssText = `width:1px;height:12px;background:${COLORS.border};flex-shrink:0`;
        wrapper.appendChild(sep1);
      }
      wrapper.appendChild(flagsDiv);
    }
    let hasSep = false;
    function ensureServiceSeparator() {
      if (hasSep || wrapper.childElementCount === 0) return;
      appendSeparator(wrapper);
      hasSep = true;
    }
    const spotifyIds = normalizeIds(track.commontrackSpotifyIds);
    if (spotifyIds.length) {
      ensureServiceSeparator();
      wrapper.appendChild(createTrackServiceLink('spotify', spotifyIds[0]));
    }
    const itunesIds = normalizeIds(track.commontrackItunesIds);
    if (itunesIds.length) {
      ensureServiceSeparator();
      wrapper.appendChild(createTrackServiceLink('itunes', itunesIds[0]));
    }
    frag.appendChild(wrapper);
    return frag;
  }
  function createSearchTrackBadges(track) {
    const frag = document.createDocumentFragment();
    const wrapper = createEl('div', { className: 'mxm-ext-track-wrap' });
    if (track.commontrack_id) {
      const idSpan = createEl('span', {
        className: 'mxm-ext-track-id',
        text: String(track.commontrack_id),
      });
      idSpan.title = 'Abstrack';
      wrapper.appendChild(idSpan);
    }
    if (track.track_isrc) {
      if (wrapper.childElementCount > 0) {
        appendSeparator(wrapper);
      }
      const isrcSpan = createEl('span', {
        className: 'mxm-ext-track-id',
        text: String(track.track_isrc),
      });
      isrcSpan.title = 'ISRC';
      wrapper.appendChild(isrcSpan);
    }
    const flagsDiv = createEl('div', { className: 'mxm-ext-flags' });
    if (Number(track.has_lyrics) === 1) {
      flagsDiv.appendChild(
        createFlagIcon(ICONS.flagLyrics, true, COLORS.text, 'Lyrics'),
      );
    }
    if (hasSyncedSubtitlesFlag(track)) {
      flagsDiv.appendChild(
        createFlagIcon(ICONS.flagSync, true, '#a78bfa', 'Synced'),
      );
    }
    if (Number(track.has_track_structure) === 1) {
      flagsDiv.appendChild(
        createFlagIcon(ICONS.flagStructure, true, '#60a5fa', 'Track structure'),
      );
    }
    if (flagsDiv.childElementCount > 0) {
      if (wrapper.childElementCount > 0) {
        appendSeparator(wrapper);
      }
      wrapper.appendChild(flagsDiv);
    }
    frag.appendChild(wrapper);
    return frag;
  }
  function injectTrackEnhancements(albumData) {
    if (window._mxmTrackObserver) {
      window._mxmTrackObserver.disconnect();
      window._mxmTrackObserver = null;
    }
    const trackMap = buildTrackMap(albumData);
    if (!trackMap.size) return;
    function tryInjectAll() {
      for (const [vanityId, track] of trackMap.entries()) {
        const encodedSlug = vanityId
          .split('/')
          .map((s) => encodeURIComponent(s))
          .join('/');
        const trackOnly = vanityId.split('/')[1] || '';
        const encodedTrackOnly = encodeURIComponent(trackOnly);
        const link =
          document.querySelector(`a[href*="/lyrics/${vanityId}"]`) ||
          document.querySelector(`a[href*="/lyrics/${encodedSlug}"]`) ||
          (trackOnly && document.querySelector(`a[href$="/${trackOnly}"]`)) ||
          (encodedTrackOnly &&
            encodedTrackOnly !== trackOnly &&
            document.querySelector(`a[href$="/${encodedTrackOnly}"]`));
        if (!link) continue;
        const row = findTrackRow(link);
        if (!row || row.hasAttribute(TRACKS_ATTR)) continue;
        row.setAttribute(TRACKS_ATTR, '1');
        const rowPs = window.getComputedStyle(row);
        if (rowPs.position === 'static') row.style.position = 'relative';
        row.appendChild(createTrackBadges(track));
      }
      hideNativeAddLyrics();
    }
    tryInjectAll();
    let debounce = null;
    const observer = new MutationObserver(() => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        tryInjectAll();
        const total = document.querySelectorAll(`[${TRACKS_ATTR}]`).length;
        if (total >= trackMap.size) {
          observer.disconnect();
          window._mxmTrackObserver = null;
        }
      }, TRACK_OBSERVER_DEBOUNCE_MS);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window._mxmTrackObserver = observer;
  }
  function injectSearchTrackEnhancements(searchTracks) {
    if (window._mxmTrackObserver) {
      window._mxmTrackObserver.disconnect();
      window._mxmTrackObserver = null;
    }
    const trackMap = buildSearchTrackMap(searchTracks);
    if (!trackMap.size) return;
    function tryInjectAll() {
      const links = document.querySelectorAll('a[href*="/lyrics/"]');
      for (const link of links) {
        const vanityFromHref = extractLyricsVanityId(
          link.getAttribute('href') || link.href,
        );
        if (!vanityFromHref) continue;
        const track = trackMap.get(vanityFromHref);
        if (!track) continue;
        const row = findTrackRow(link);
        if (!row || row.hasAttribute(TRACKS_ATTR)) continue;
        row.setAttribute(TRACKS_ATTR, '1');
        const rowPs = window.getComputedStyle(row);
        if (rowPs.position === 'static') row.style.position = 'relative';
        row.appendChild(createSearchTrackBadges(track));
      }
    }
    tryInjectAll();
    let debounce = null;
    const observer = new MutationObserver(() => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        tryInjectAll();
      }, TRACK_OBSERVER_DEBOUNCE_MS);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window._mxmTrackObserver = observer;
  }
  function isErrorPage() {
    return document.body?.textContent?.includes('Nobody said it was easy');
  }
  function boot() {
    if (isErrorPage()) return false;
    if (isSearchPage(window.location.pathname)) {
      const searchTracks = readSearchTracks();
      if (!searchTracks?.length) {
        return false;
      }
      injectSearchTrackEnhancements(searchTracks);
      return true;
    }
    if (isLyricsPage(window.location.pathname)) {
      const trackData = readTrackData();
      if (!trackData?.commonTrackId) {
        console.warn('[mxm-ext-ids] No track data found in router.components');
        return false;
      }
      trackData._isTrack = true;
      waitForContributeWidgetThenInject(trackData);
      return true;
    }
    if (isArtistPage(window.location.pathname)) {
      const artistData = readArtistData();
      if (!artistData?.externalIds) {
        console.warn('[mxm-ext-ids] No artist data found in router.components');
        return false;
      }
      artistData._isArtist = true;
      waitForGenresHeadingThenInject(artistData);
      return true;
    }
    const albumData = readAlbumData();
    if (!albumData?.externalIds) {
      console.warn('[mxm-ext-ids] No externalIds found in album data');
      return false;
    }
    injectAlbumReleaseDate(albumData);
    const coverImage = findCoverImage(albumData);
    if (!coverImage) {
      console.warn('[mxm-ext-ids] Could not find cover image element in DOM');
      return injectAlbumReleaseDate(albumData);
    }
    renderBox(albumData, coverImage);
    injectTrackEnhancements(albumData);
    return true;
  }
  function startBoot() {
    resetInjectedState(true);
    injectStyles();
    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      const done = boot();
      if (done || attempts >= RETRY_MAX_ATTEMPTS) {
        window.clearInterval(interval);
      }
    }, RETRY_INTERVAL_MS);
    boot();
  }
  if (isTargetPage(window.location.pathname)) {
    startBoot();
  }
  function patchHistoryMethod(methodName) {
    const original = history[methodName];
    history[methodName] = function (...args) {
      const result = original.apply(this, args);
      window.dispatchEvent(new Event(NAV_EVENT));
      return result;
    };
  }
  function findSyncingModal() {
    const TITLE_MARKERS = ['No audio source found', 'Syncing not possible'];
    const BODY_MARKER = "Syncing isn't possible for this track";
    const normalizeApostrophe = (s) => s.replace(/[\u2018\u2019]/g, "'");
    const isTitleMarker = (text) =>
      TITLE_MARKERS.includes(normalizeApostrophe(text).trim());
    const isBodyMarker = (text) =>
      normalizeApostrophe(text).includes(BODY_MARKER);
    const findModalRoot = (markerEl) => {
      let node = markerEl;
      for (let i = 0; i < 15; i++) {
        node = node.parentElement;
        if (!node || node === document.body) break;
        if (node.classList.contains('r-1rnoaur')) return node;
        const hasGotIt = [...node.querySelectorAll('[dir="auto"]')].some(
          (n) => n.textContent.trim() === 'Got it',
        );
        if (hasGotIt && node.contains(markerEl)) return node;
      }
      return null;
    };
    for (const el of document.querySelectorAll('[dir="auto"]')) {
      const text = el.textContent;
      if (!isTitleMarker(text) && !isBodyMarker(text)) continue;
      const modal = findModalRoot(el);
      if (modal) return modal;
    }
    return null;
  }
  function findFormatSuggestionsContainer() {
    const SECTION_TITLES = ['Format Suggestions', 'Start your contribution'];
    const headingNodes = document.querySelectorAll('[dir="auto"]');
    for (const el of headingNodes) {
      const text = el.textContent?.trim();
      if (!SECTION_TITLES.includes(text)) continue;
      let node = el;
      for (let i = 0; i < 18; i++) {
        node = node.parentElement;
        if (!node || node === document.body) break;
        if (
          node.classList.contains('r-16y2uox') &&
          node.classList.contains('r-1q142lx')
        ) {
          return node.parentElement || node;
        }
      }
    }

    for (const el of headingNodes) {
      if (el.textContent?.trim() !== 'Start your contribution') continue;
      let node = el.parentElement;
      for (let i = 0; i < 10; i++) {
        if (!node || node === document.body) break;
        if (node.nextElementSibling) {
          return node.parentElement || node;
        }
        node = node.parentElement;
      }
    }
    return null;
  }
  function renderCuratorsBox(track, targetContainer = null) {
    if (document.getElementById(CURATORS_BOX_ID)) return;
    const container = targetContainer ?? findFormatSuggestionsContainer();
    if (!container) return;
    const spotifyIds = normalizeIds(track.commontrack_spotify_ids);
    const itunesIds = normalizeIds(track.commontrack_itunes_ids);
    const isrcs = normalizeIds(
      Array.isArray(track.commontrack_isrcs)
        ? track.commontrack_isrcs.flat()
        : track.commontrack_isrcs,
    );
    const root = createEl('section', { className: 'mxm-ext-panel' });
    root.id = CURATORS_BOX_ID;
    root.style.cssText = 'margin-top:10px;width:100%;box-sizing:border-box';
    root.setAttribute('aria-label', 'Track external IDs');
    const tabs = createEl('div', { className: 'mxm-ext-tabs' });
    function makeTab(label, accentColor) {
      const btn = createEl('button', { className: 'mxm-ext-tab', text: label });
      btn.type = 'button';
      btn._accent = accentColor;
      return btn;
    }
    const spotifyTab = makeTab('Spotify', COLORS.spotifyGreen);
    spotifyTab.style.borderRight = `1px solid ${COLORS.border}`;
    const appleTab = makeTab('Apple', COLORS.appleRed);
    tabs.appendChild(spotifyTab);
    tabs.appendChild(appleTab);
    root.appendChild(tabs);
    const content = createEl('div', { className: 'mxm-ext-content' });
    root.appendChild(content);
    function setTabActive(btn, active) {
      btn.style.background = active ? btn._accent + '22' : 'transparent';
      btn.style.color = active ? btn._accent : COLORS.textMuted;
    }
    function renderService(service) {
      content.innerHTML = '';
      const ids = service === 'spotify' ? spotifyIds : itunesIds;
      content.appendChild(createList(service, ids, true));
      setTabActive(spotifyTab, service === 'spotify');
      setTabActive(appleTab, service !== 'spotify');
    }
    spotifyTab.addEventListener('click', () => renderService('spotify'));
    appleTab.addEventListener('click', () => renderService('itunes'));
    renderService('spotify');
    function makeFooterRow(
      labelText,
      valueText,
      accentColor,
      withExportBtn,
      isHtml = false,
    ) {
      const row = createEl('div', { className: 'mxm-ext-footer' });
      row.style.cursor = 'pointer';
      row.style.userSelect = 'none';
      const lbl = createEl('span', { text: labelText });
      lbl.style.cssText = `font-size:11px;color:${COLORS.textMuted};flex-shrink:0`;
      const val = createEl(
        'span',
        isHtml ? { html: valueText } : { text: valueText },
      );
      val.style.cssText = `font-size:11px;font-family:monospace;color:${COLORS.text}`;
      addTooltip(val, 'Click to copy');
      row.addEventListener('click', (e) => {
        if (
          withExportBtn &&
          (e.target === withExportBtn || withExportBtn.contains(e.target))
        )
          return;
        if (e.target.tagName === 'A') return;
        navigator.clipboard
          .writeText(val.textContent)
          .then(() => {
            val.style.color = accentColor;
            setTimeout(() => {
              val.style.color = COLORS.text;
            }, 400);
          })
          .catch(() => {});
      });
      row.appendChild(lbl);
      row.appendChild(val);
      if (withExportBtn) row.appendChild(withExportBtn);
      return row;
    }
    let exportBtn = null;
    if (ALLOW_DEBUG_ACTIONS) {
      exportBtn = createEl('button', {
        html: ICONS.export,
        className: 'mxm-ext-btn',
      });
      exportBtn.type = 'button';
      exportBtn.style.cssText = `background:transparent;border:0;padding:2px;cursor:pointer;color:${COLORS.textMuted};display:flex;align-items:center;flex-shrink:0;opacity:0.5;transition:opacity 0.15s,color 0.15s;margin-left:auto`;
      addTooltip(exportBtn, 'Copy DEBUG data');
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard
          .writeText(JSON.stringify(track, null, 2))
          .then(() => {
            exportBtn.style.color = COLORS.spotifyGreen;
            exportBtn.style.opacity = '1';
            setTimeout(() => {
              exportBtn.style.color = COLORS.textMuted;
              exportBtn.style.opacity = '0.5';
            }, 800);
          })
          .catch(() => {});
      });
    }
    root.appendChild(
      makeFooterRow(
        'Abstrack',
        String(track.commontrack_id),
        COLORS.spotifyGreen,
        exportBtn,
      ),
    );
    if (track.track_isrc) {
      root.appendChild(
        makeFooterRow('ISRC', track.track_isrc, '#f59e0b', null),
      );
    }
    if (isrcs.length) {
      root.appendChild(
        makeFooterRow('ISRCs', isrcs.join(', '), '#f59e0b', null),
      );
    }

    if (track.lyrics_published_status !== undefined) {
      const lockStatusMap = {
        1: 'verified by musixmatch, published',
        2: 'verified by musixmatch, published, staff locked(instrumental/upvoted)',
        3: 'verified by musixmatch, published, staff locked',
        4: 'verified by musixmatch, published, upvoted',
        5: 'curator verified, published',
        6: 'MAYBE curator verified, published, upvoted',
        8: 'verified by community, published(locked/unlocked)',
        9: 'not verified, published(locked/unlocked)',
        13: 'artist verified, published',
        14: 'verified by artist, published (propably edited by specialist)',
        15: 'verified by curator, not published',
        16: 'verified by community/verified by artist, not published',
      };
      const status = track.lyrics_published_status;
      let valText = lockStatusMap[status];
      let isHtml = false;
      if (!valText) {
        valText = `${status} (<a href="https://github.com/mxm-enhancer/mxm-enhancer/issues/new" target="_blank" style="color:#f59e0b;text-decoration:underline">report issue</a>)`;
        isHtml = true;
      }
      root.appendChild(
        makeFooterRow('Published state', valText, '#f59e0b', null, isHtml),
      );
    }

    const quickRow = createEl('div', { className: 'mxm-ext-footer' });
    quickRow.style.cssText = 'gap:4px;flex-wrap:wrap';
    const qlLabel = createEl('span', { text: 'Open' });
    qlLabel.style.cssText = `font-size:11px;color:${COLORS.textMuted};flex-shrink:0;margin-right:2px`;
    quickRow.appendChild(qlLabel);
    function makeQLink(iconSvg, href, tooltip, accentColor) {
      const a = createEl('a', { className: 'mxm-ext-btn mxm-ext-open' });
      a.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>`;
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.color = accentColor;
      a.style.padding = '2px 4px';
      a.addEventListener('click', (e) => e.stopPropagation());
      addTooltip(a, tooltip);
      return a;
    }
    quickRow.appendChild(
      makeQLink(
        ICONS.mxmLyrics,
        `https://www.musixmatch.com/lyrics/1/${track.commontrack_id}`,
        'Open lyrics on Musixmatch',
        COLORS.text,
      ),
    );
    if (track.album_id) {
      quickRow.appendChild(
        makeQLink(
          ICONS.mxmAlbum,
          `https://www.musixmatch.com/album/1/${track.album_id}`,
          'Open album on Musixmatch',
          COLORS.text,
        ),
      );
    }
    quickRow.appendChild(
      makeQLink(
        ICONS.curatorsTool,
        `https://curators.musixmatch.com/tool?commontrack_id=${track.commontrack_id}`,
        'Open in Curators Tool',
        '#a78bfa',
      ),
    );
    root.appendChild(quickRow);
    container.appendChild(root);
  }
  let _curatorsDomObserver = null;
  let _lastCuratorsTrack = null;

  function _injectOrMoveBox(track) {
    const modal = findSyncingModal();
    if (modal) {
      const existing = document.getElementById(CURATORS_BOX_ID);
      if (existing && !modal.contains(existing)) {
        modal.appendChild(existing);
      } else if (!existing) {
        renderCuratorsBox(track, modal);
      }
      return;
    }

    if (!document.getElementById(CURATORS_BOX_ID)) {
      if (findFormatSuggestionsContainer()) {
        renderCuratorsBox(track);
      }
    }
  }
  function waitForFormatSuggestionsThenInject(track) {
    if (_lastCuratorsTrack?.commontrack_id !== track.commontrack_id) {
      const old = document.getElementById(CURATORS_BOX_ID);
      if (old) old.remove();
    }
    _lastCuratorsTrack = track;
    _injectOrMoveBox(track);
    if (_curatorsDomObserver) return;
    _curatorsDomObserver = new MutationObserver(() => {
      if (_lastCuratorsTrack) _injectOrMoveBox(_lastCuratorsTrack);
    });
    _curatorsDomObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
  const DRAFTS_BTN_ID = 'mxm-ext-drafts-btn';
  function exportDrafts() {
    const drafts = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('storage\\draft-')) {
        drafts[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(drafts, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
    a.download = `mxm-drafts-${dateStr}_${timeStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function importDrafts(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const drafts = JSON.parse(e.target.result);
        const keys = Object.keys(drafts);
        let hasConflict = false;
        for (const key of keys) {
          if (localStorage.getItem(key)) {
            hasConflict = true;
            break;
          }
        }
        if (hasConflict) {
          if (
            !window.confirm(
              'Some of the loaded drafts already exist in the browser. Do you want to overwrite them?',
            )
          ) {
            return;
          }
        }
        for (const [key, value] of Object.entries(drafts)) {
          localStorage.setItem(key, value);
        }
        const lookupKey = 'storage\\draftsLookup';
        let lookup = {};
        try {
          const stored = localStorage.getItem(lookupKey);
          if (stored) lookup = JSON.parse(stored);
        } catch (err) {}
        const now = Date.now();
        for (const key of keys) {
          const rawKey = key.replace(/^storage\\/, '');
          lookup[rawKey] = now;
        }
        localStorage.setItem(lookupKey, JSON.stringify(lookup));
        window.alert(
          'Drafts loaded successfully! The page will refresh in 5 seconds.',
        );
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      } catch (err) {
        console.error('[mxm-ext-ids] Failed to parse drafts JSON', err);
        window.alert('Error loading the JSON file.');
      }
    };
    reader.readAsText(file);
  }
  function injectDraftsIcon() {
    if (document.getElementById(DRAFTS_BTN_ID)) return;
    const coverWrapper = document.querySelector(
      '.css-g5y9jx.r-1awozwy.r-izgom.r-1xfd6ze.r-h3s6tt.r-1777fci.r-1udh08x.r-rwqe4o',
    );
    if (!coverWrapper || !coverWrapper.parentElement) return;
    const topBar = coverWrapper.parentElement;

    const container = createEl('div', { attrs: { id: DRAFTS_BTN_ID } });
    container.style.cssText =
      'position:relative;display:flex;align-items:center;margin-right:12px;z-index:999;';

    const iconWrap = createEl('div', {
      className: 'css-g5y9jx r-1otgn73',
      html: `
        <div class="css-g5y9jx r-1awozwy r-1udnf30 r-18u37iz r-h3s6tt r-1777fci r-ddtstp r-1j93nrh r-1udh08x r-3o4zer" style="transition: background 0.2s; width: 40px; height: 40px; border-radius: 50%; justify-content: center;">
          <div class="css-g5y9jx r-1awozwy r-18u37iz">
            <div class="css-g5y9jx">
              <svg fill="none" stroke="var(--mxm-contentPrimary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" height="24" viewBox="0 0 24 24" width="24">
                ${ICONS.disk}
              </svg>
            </div>
          </div>
        </div>
      `,
    });
    iconWrap.style.cursor = 'pointer';
    const innerCircle = iconWrap.querySelector('.r-1awozwy');
    iconWrap.onmouseover = () =>
      (innerCircle.style.background = 'rgba(255,255,255,0.1)');
    iconWrap.onmouseout = () => (innerCircle.style.background = 'transparent');
    const menu = createEl('div', {
      className: 'mxm-ext-panel',
    });
    menu.style.cssText =
      'position:absolute;top:100%;left:0;margin-top:8px;display:none;flex-direction:column;min-width:180px;gap:4px;padding:6px;box-shadow:0 10px 30px rgba(0,0,0,0.8);background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);border-radius:12px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
    const btnStyle =
      'background:transparent;border:none;color:var(--mxm-contentPrimary, #fff);padding:10px 14px;text-align:left;cursor:pointer;border-radius:8px;width:100%;font-size:13px;font-family:inherit;font-weight:500;white-space:nowrap;transition:background 0.15s;';
    const exportBtn = createEl('button', {
      html: '<div style="display:flex;align-items:center;gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download drafts</div>',
    });
    exportBtn.style.cssText = btnStyle;
    exportBtn.onmouseover = () =>
      (exportBtn.style.background = 'rgba(255,255,255,0.1)');
    exportBtn.onmouseout = () => (exportBtn.style.background = 'transparent');
    exportBtn.onclick = () => {
      menu.style.display = 'none';
      exportDrafts();
    };
    const importBtn = createEl('button', {
      html: '<div style="display:flex;align-items:center;gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Load drafts</div>',
    });
    importBtn.style.cssText = btnStyle;
    importBtn.onmouseover = () =>
      (importBtn.style.background = 'rgba(255,255,255,0.1)');
    importBtn.onmouseout = () => (importBtn.style.background = 'transparent');
    importBtn.onclick = () => {
      menu.style.display = 'none';
      fileInput.click();
    };
    const fileInput = createEl('input', {
      attrs: { type: 'file', accept: '.json' },
    });
    fileInput.style.display = 'none';
    fileInput.onchange = (e) => {
      if (e.target.files.length > 0) {
        importDrafts(e.target.files[0]);
      }
      e.target.value = '';
    };
    menu.appendChild(exportBtn);
    menu.appendChild(importBtn);
    container.appendChild(iconWrap);
    container.appendChild(menu);
    container.appendChild(fileInput);
    let menuOpen = false;
    iconWrap.onclick = (e) => {
      e.stopPropagation();
      menuOpen = !menuOpen;
      menu.style.display = menuOpen ? 'flex' : 'none';
    };
    document.addEventListener('click', (e) => {
      if (menuOpen && !container.contains(e.target)) {
        menuOpen = false;
        menu.style.display = 'none';
      }
    });
    topBar.insertBefore(container, coverWrapper);
  }
  if (location.hostname === 'curators.musixmatch.com') {
    setInterval(() => {
      injectDraftsIcon();
    }, 1000);
    const _origFetch = window.fetch;
    window.fetch = async function (...args) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url ?? '');
      const res = await _origFetch.apply(this, args);
      if (url.includes('track.get')) {
        res
          .clone()
          .json()
          .then((data) => {
            const track = data?.message?.body?.track;
            if (!track) {
              console.warn(
                '[mxm-ext-ids] track.get: no track data in response body',
              );
              return;
            }
            waitForFormatSuggestionsThenInject(track);
          })
          .catch((e) =>
            console.error('[mxm-ext-ids] track.get parse error', e),
          );
      }
      return res;
    };
    injectStyles();
  }
  patchHistoryMethod('pushState');
  patchHistoryMethod('replaceState');
  window.addEventListener('popstate', () => {
    window.dispatchEvent(new Event(NAV_EVENT));
  });
  let navDebounce = null;
  window.addEventListener(NAV_EVENT, () => {
    clearTimeout(navDebounce);
    navDebounce = setTimeout(() => {
      if (isTargetPage(window.location.pathname)) {
        startBoot();
      } else {
        resetInjectedState(true);
      }
    }, NAV_DEBOUNCE_MS);
  });
})();
