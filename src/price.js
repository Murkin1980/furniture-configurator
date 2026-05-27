class PriceDisplay {
  constructor(container, options = {}) {
    this._container = typeof container === 'string' ? document.querySelector(container) : container;
    this._options = Object.assign({ currency: 'KZT' }, options);
    this._lastTotal = 0;

    this._build();
  }

  update(config) {
    const breakdown = calcPriceBreakdown(config);
    const currency = breakdown.product.currency || this._options.currency;

    this._render(breakdown, currency);

    if (breakdown.total !== this._lastTotal) {
      this._animateTotal();
      this._lastTotal = breakdown.total;
    }
  }

  _build() {
    this._root = document.createElement('div');
    this._root.className = 'price-panel';
    this._container.appendChild(this._root);
  }

  _render(breakdown, currency) {
    this._root.innerHTML = `
      <div class="price-total">
        <span class="price-total-label">Итого</span>
        <span class="price-total-value" data-role="total">${formatPrice(breakdown.total, currency)}</span>
      </div>
      <div class="price-breakdown">
        ${breakdown.items.map((item) => {
          if (item.type === 'base') {
            return `<div class="price-row price-row-base"><span>${escapeHtml(item.label)}</span><span class="price-val">${formatPrice(item.value, currency)}</span></div>`;
          }
          if (item.type === 'formula') {
            return `<div class="price-row price-row-formula"><span>${escapeHtml(item.label)}</span><span class="price-val">${formatPrice(item.value, currency)}</span></div>`;
          }
          const cls = item.modifier > 0 ? 'plus' : 'minus';
          const sign = item.modifier > 0 ? '+ ' : '− ';
          return `<div class="price-row price-row-option"><span>${escapeHtml(item.label)}</span><span class="price-val ${cls}">${sign}${formatPrice(Math.abs(item.modifier), currency)}</span></div>`;
        }).join('')}
        <div class="price-row price-row-total">
          <span>Общая стоимость</span>
          <span class="price-val">${formatPrice(breakdown.total, currency)}</span>
        </div>
      </div>
    `;
  }

  _animateTotal() {
    const el = this._root.querySelector('[data-role="total"]');
    if (el) {
      el.classList.remove('flip');
      void el.offsetWidth;
      el.classList.add('flip');
    }
  }
}