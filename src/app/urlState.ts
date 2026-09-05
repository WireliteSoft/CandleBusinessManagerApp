export function getBatchIdFromUrl() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('batchId');
}

export function getBlockedReasonFromUrl() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('reason') || '';
}

export function getBlockedIdentifierFromUrl() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('identifier') || '';
}

export function getAppealTicketIdFromUrl() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('ticket') || '';
}

export function getAppealAccessKeyFromUrl() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('key') || '';
}

export function getBlockedTypeFromUrl() {
  if (typeof window === 'undefined') return '';
  const value = (new URLSearchParams(window.location.search).get('type') || '').toLowerCase();
  if (value === 'banned' || value === 'disabled') return value;
  return '';
}

export function getStoreSlugFromUrl() {
  if (typeof window === 'undefined') return '';
  const match = window.location.pathname.match(/^\/store\/([^/]+)$/i);
  return match?.[1] ? decodeURIComponent(match[1]) : '';
}

export function isPath(path: string) {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.toLowerCase() === path;
}

export function redirectToPath(path: string) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.toLowerCase() === path.toLowerCase()) return;
  window.history.replaceState({}, '', path);
  window.location.reload();
}
