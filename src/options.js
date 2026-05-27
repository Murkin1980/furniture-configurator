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
      if (opt.type === 'multicheck') {
        if (!Array.isArray(val)) this._config[opt.id] = [];
        continue;
      }
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

    if (this._product.type === 'parametric') {
      const dims = this._renderDimensions();
      this._root.appendChild(dims);
    }

    for (const opt of this._product.options) {
      const group = this._renderGroup(opt);
      this._root.appendChild(group);
    }
  }

  _renderDimensions() {
    const constraints = getDimensionConstraints(this._product.paramGroup);
    if (!constraints) return document.createDocumentFragment();

    const section = document.createElement('div');
    section.className = 'dims-section';

    const label = document.createElement('div');
    label.className = 'option-group-label';
    label.textContent = 'Габариты (мм)';
    section.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'dims-grid';

    for (const [key, dim] of Object.entries(constraints)) {
      const wrap = document.createElement('div');
      wrap.className = 'dim-control';

      const dimLabel = document.createElement('label');
      dimLabel.className = 'dim-label';
      dimLabel.textContent = dim.label;
      wrap.appendChild(dimLabel);

      const row = document.createElement('div');
      row.className = 'dim-row';

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = dim.min;
      slider.max = dim.max;
      slider.step = dim.step;
      slider.value = this._config[key] ?? dim.default;
      slider.className = 'dim-slider';
      slider.addEventListener('input', () => {
        this._config[key] = parseInt(slider.value, 10);
        numInput.value = slider.value;
        this._onChange({ ...this._config });
      });

      const numInput = document.createElement('input');
      numInput.type = 'number';
      numInput.min = dim.min;
      numInput.max = dim.max;
      numInput.step = dim.step;
      numInput.value = slider.value;
      numInput.className = 'dim-number';
      numInput.addEventListener('change', () => {
        let v = parseInt(numInput.value, 10);
        if (isNaN(v)) v = dim.default;
        v = Math.max(dim.min, Math.min(dim.max, v));
        numInput.value = v;
        slider.value = v;
        this._config[key] = v;
        this._onChange({ ...this._config });
      });

      row.appendChild(slider);
      row.appendChild(numInput);
      wrap.appendChild(row);
      grid.appendChild(wrap);
    }

    section.appendChild(grid);
    return section;
  }

  _renderGroup(opt) {
    const group = document.createElement('div');
    group.className = 'option-group';

    const label = document.createElement('div');
    label.className = 'option-group-label';
    label.textContent = opt.name;
    group.appendChild(label);

    if (opt.type === 'counter') {
      group.appendChild(this._renderCounter(opt));
    } else if (opt.type === 'multicheck') {
      group.appendChild(this._renderMultiCheck(opt));
    } else {
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
    }

    return group;
  }

  _renderCounter(opt) {
    const wrap = document.createElement('div');
    wrap.className = 'counter-control';

    const btnMinus = document.createElement('button');
    btnMinus.className = 'counter-btn';
    btnMinus.textContent = '−';
    btnMinus.addEventListener('click', () => this._adjustCounter(opt, -1));

    const value = document.createElement('span');
    value.className = 'counter-value';
    value.textContent = this._config[opt.id] ?? opt.default ?? 0;

    const btnPlus = document.createElement('button');
    btnPlus.className = 'counter-btn';
    btnPlus.textContent = '+';
    btnPlus.addEventListener('click', () => this._adjustCounter(opt, 1));

    wrap.appendChild(btnMinus);
    wrap.appendChild(value);
    wrap.appendChild(btnPlus);
    return wrap;
  }

  _adjustCounter(opt, delta) {
    const cur = this._config[opt.id] ?? opt.default ?? 0;
    const next = Math.max(opt.min ?? 0, Math.min(opt.max ?? 99, cur + delta));
    this._config[opt.id] = next;
    this._render();
    if (this._onChange) this._onChange({ ...this._config });
  }

  _renderMultiCheck(opt) {
    const wrap = document.createElement('div');
    wrap.className = 'multicheck-wrap';

    const selected = this._config[opt.id] || [];

    for (const val of opt.values) {
      const isChecked = selected.includes(val.id);
      const chk = document.createElement('label');
      chk.className = 'multicheck-item' + (isChecked ? ' checked' : '');

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = isChecked;
      cb.addEventListener('change', () => {
        const arr = [...(this._config[opt.id] || [])];
        if (cb.checked) {
          if (!arr.includes(val.id)) arr.push(val.id);
        } else {
          this._config[opt.id] = arr.filter((v) => v !== val.id);
        }
        this._config[opt.id] = arr;
        this._render();
        if (this._onChange) this._onChange({ ...this._config });
      });

      const name = document.createElement('span');
      name.textContent = val.name;

      chk.appendChild(cb);
      chk.appendChild(name);
      wrap.appendChild(chk);
    }

    return wrap;
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
