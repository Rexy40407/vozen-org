(() => {
  const route = document.documentElement.dataset.legacyProductRoute;
  if (!route || window.location.protocol === 'file:') return;
  const target = new URL(`/${route}/`, window.location.origin);
  target.search = window.location.search;
  target.hash = window.location.hash;
  window.location.replace(target.href);
})();
