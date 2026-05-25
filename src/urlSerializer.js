function serializeConfig(config) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(config)) {
    if (value != null && value !== '') {
      params.set(key, value);
    }
  }
  return params.toString();
}

function deserializeConfig(searchString, defaultConfig) {
  const params = new URLSearchParams(searchString);
  const config = { ...defaultConfig };
  for (const [key] of Object.entries(defaultConfig)) {
    if (params.has(key)) {
      config[key] = params.get(key);
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
