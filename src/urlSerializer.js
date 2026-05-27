function serializeConfig(config) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(config)) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

function deserializeConfig(searchString, defaultConfig) {
  const params = new URLSearchParams(searchString);
  const config = { ...defaultConfig };
  for (const [key, defaultValue] of Object.entries(defaultConfig)) {
    if (!params.has(key)) continue;
    const raw = params.get(key);
    if (Array.isArray(defaultValue)) {
      config[key] = raw ? raw.split(',').filter(Boolean) : [];
    } else if (typeof defaultValue === 'number') {
      const n = Number(raw);
      config[key] = isNaN(n) ? defaultValue : n;
    } else {
      config[key] = raw;
    }
  }
  return config;
}

function buildShareUrl(config) {
  const base = window.location.origin + window.location.pathname;
  const qs = serializeConfig(config);
  return `${base}?${qs}`;
}

function syncUrl(config) {
  const qs = serializeConfig(config);
  const url = qs ? `?${qs}` : window.location.pathname;
  history.replaceState(null, '', url);
}

function copyShareLink(config) {
  const url = buildShareUrl(config);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
  }
  return url;
}
