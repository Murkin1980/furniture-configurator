class OptionsPanel {
  constructor(container, options = {}) {
    this._container = typeof container === 'string' ? document.querySelector(container) : container;
    this._product = options.product || getProduct();
    this._config = options.config || getDefaultConfig(this._product.id);
    this._onChange = options.onChange || null;

    this._sanitizeConfig();
    this._build();
  }

  setConfig(config) {
    this._config = { ...config };
    this._sanitizeConfig();
    this._render();
  }

  _sanitizeConfig() {
    for (const opt of this._product.options) {
      const val = this._config[opt.id];
      if (val && !this._isAvailable(opt.id, val)) {
        const first = opt.values.find((v) => this._isAvailable(opt.id, v.id));
        if (first) this._config[opt.id] = first.id;
      }
    }
  }

  get config() {
    return { ...this._config };
  }

  destroy() {
    this._container.innerHTML = '';
  }

  _build() {
    this._root = document.createElement('div');
    this._root.className = 'options-panel';
    this._container.appendChild(this._root);
    this._render();
  }

  _render() {
    this._root.innerHTML = '';

    for (const opt of this._product.options) {
      const group = this._renderGroup(opt);
      this._root.appendChild(group);
    }
  }

  _renderGroup(opt) {
    const group = document.createElement('div');
    group.className = 'option-group';

    const label = document.createElement('div');
    label.className = 'option-group-label';
    label.textContent = opt.name;
    group.appendChild(label);

    const scrollWrap = document.createElement('div');
    scrollWrap.className = 'options-scroll-wrap';

    const valuesWrap = document.createElement('div');
    valuesWrap.className = 'option-group-values';

    const selectedVal = this._config[opt.id];

    for (const val of opt.values) {
      const disabled = !this._isAvailable(opt.id, val.id);
      const selected = selectedVal === val.id;

      if (opt.type === 'color') {
        valuesWrap.appendChild(this._buildSwatch(val, selected, disabled, opt));
      } else {
        valuesWrap.appendChild(this._buildButton(val, selected, disabled, opt));
      }
    }

    scrollWrap.appendChild(valuesWrap);
    group.appendChild(scrollWrap);
    return group;
  }

  _buildButton(val, selected, disabled, opt) {
    const btn = document.createElement('button');
    btn.className = 'option-btn' + (selected ? ' selected' : '');
    btn.disabled = disabled;
    btn.title = disabled ? 'Недоступно для выбранного материала' : val.name;

    const label = document.createElement('span');
    label.textContent = val.name;
    btn.appendChild(label);

    if (val.priceModifier !== 0) {
      const diff = document.createElement('span');
      diff.className = 'price-diff';
      diff.textContent = val.priceModifier > 0 ? `+${formatPrice(val.priceModifier)}` : `-${formatPrice(Math.abs(val.priceModifier))}`;
      btn.appendChild(diff);
    }

    btn.addEventListener('click', () => this._select(opt.id, val.id));
    return btn;
  }

  _buildSwatch(val, selected, disabled, opt) {
    const wrap = document.createElement('button');
    wrap.className = 'option-swatch' + (selected ? ' selected' : '');
    wrap.disabled = disabled;
    wrap.title = disabled ? 'Недоступно для выбранного материала' : val.name;

    const circle = document.createElement('div');
    circle.className = 'option-swatch-circle';
    circle.style.background = val.hex || '#ccc';
    wrap.appendChild(circle);

    const label = document.createElement('div');
    label.className = 'option-swatch-label';
    label.textContent = val.name;
    wrap.appendChild(label);

    wrap.addEventListener('click', () => this._select(opt.id, val.id));
    return wrap;
  }

  _isAvailable(optionId, valueId) {
    const opt = this._product.options.find((o) => o.id === optionId);
    if (!opt) return true;

    const val = opt.values.find((v) => v.id === valueId);
    if (!val) return true;

    if (val.availableFor && val.availableFor.length > 0) {
      const selectedMaterial = this._config.material;
      if (!val.availableFor.includes(selectedMaterial)) {
        return false;
      }
    }

    if (opt.dependsOn) {
      const parentVal = this._config[opt.dependsOn.option];
      const allowed = opt.dependsOn.values[parentVal];
      if (allowed && !allowed.includes(valueId)) {
        return false;
      }
    }

    return true;
  }

  _select(optionId, valueId) {
    if (!this._isAvailable(optionId, valueId)) return;

    this._config[optionId] = valueId;

    for (const opt of this._product.options) {
      if (opt.dependsOn && opt.dependsOn.option === optionId) {
        const currentVal = this._config[opt.id];
        if (currentVal && !this._isAvailable(opt.id, currentVal)) {
          const firstAvail = opt.values.find((v) => this._isAvailable(opt.id, v.id));
          if (firstAvail) this._config[opt.id] = firstAvail.id;
        }
      }
    }

    this._render();

    if (this._onChange) {
      this._onChange({ ...this._config });
    }
  }
}

function formatPrice(n) {
  const abs = Math.abs(n);
  if (abs >= 1000000) return (abs / 1000000).toFixed(1) + 'M';
  if (abs >= 1000) return (abs / 1000).toFixed(0) + 'K';
  return abs.toString();
}
