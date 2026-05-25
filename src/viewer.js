class ViewerCore {
  constructor(container, options = {}) {
    this._container = typeof container === 'string' ? document.querySelector(container) : container;
    this._options = Object.assign({ animation: 'fade', onAngleChange: null }, options);
    this._angle = 0;
    this._images = [];
    this._touchStartX = 0;
    this._animating = false;

    this._build();
    this._bindEvents();
  }

  get angle() { return this._angle; }

  setImages(images) {
    this._images = images;
    this._render();
  }

  setAngle(angle, animate = true) {
    if (this._animating) return;
    angle = ((angle % 8) + 8) % 8;
    if (angle === this._angle) return;
    this._angle = angle;
    this._render(animate);
    if (this._options.onAngleChange) this._options.onAngleChange(angle);
  }

  prev() { this.setAngle(this._angle - 1); }
  next() { this.setAngle(this._angle + 1); }

  destroy() {
    this._unbindEvents();
    this._container.innerHTML = '';
  }

  _build() {
    this._container.innerHTML = `
      <div class="viewer">
        <div class="viewer-image-wrap" data-role="wrap">
          <div class="viewer-slide" data-role="slide"></div>
        </div>
        <button class="viewer-nav viewer-nav-prev" data-role="prev" aria-label="Предыдущий ракурс">‹</button>
        <button class="viewer-nav viewer-nav-next" data-role="next" aria-label="Следующий ракурс">›</button>
        <div class="viewer-dots" data-role="dots"></div>
      </div>
    `;

    this._els = {
      wrap: this._container.querySelector('[data-role="wrap"]'),
      slide: this._container.querySelector('[data-role="slide"]'),
      prev: this._container.querySelector('[data-role="prev"]'),
      next: this._container.querySelector('[data-role="next"]'),
      dots: this._container.querySelector('[data-role="dots"]'),
    };
  }

  _render(animate = false) {
    const img = this._images[this._angle];
    const label = ANGLE_LABELS[this._angle];

    const prevSlide = this._els.slide;
    const newSlide = document.createElement('div');
    newSlide.className = 'viewer-slide';
    newSlide.innerHTML = img || '<div style="padding:40px;color:#999">Нет изображения</div>';

    if (animate) {
      const direction = 1;
      newSlide.classList.add('slide-enter');
      prevSlide.classList.add('slide-exit');
      this._animating = true;

      const onEnd = () => {
        prevSlide.removeEventListener('animationend', onEnd);
        prevSlide.remove();
        this._animating = false;
      };
      prevSlide.addEventListener('animationend', onEnd);
    } else {
      prevSlide.remove();
    }

    this._els.wrap.appendChild(newSlide);
    this._els.slide = newSlide;
    this._els.wrap.setAttribute('aria-label', label);

    this._renderDots();
  }

  _renderDots() {
    this._els.dots.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const dot = document.createElement('button');
      dot.className = 'viewer-dot' + (i === this._angle ? ' active' : '');
      dot.setAttribute('aria-label', ANGLE_LABELS[i]);
      dot.dataset.index = i;
      dot.addEventListener('click', () => this.setAngle(i, true));
      this._els.dots.appendChild(dot);
    }
  }

  _bindEvents() {
    this._onPrev = () => this.prev();
    this._onNext = () => this.next();
    this._onKeydown = (e) => {
      if (e.key === 'ArrowLeft') { this.prev(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { this.next(); e.preventDefault(); }
    };
    this._onTouchStart = (e) => { this._touchStartX = e.touches[0].clientX; };
    this._onTouchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - this._touchStartX;
      if (Math.abs(dx) > 40) {
        dx > 0 ? this.prev() : this.next();
      }
    };

    this._els.prev.addEventListener('click', this._onPrev);
    this._els.next.addEventListener('click', this._onNext);
    document.addEventListener('keydown', this._onKeydown);
    this._els.wrap.addEventListener('touchstart', this._onTouchStart, { passive: true });
    this._els.wrap.addEventListener('touchend', this._onTouchEnd, { passive: true });
  }

  _unbindEvents() {
    this._els.prev.removeEventListener('click', this._onPrev);
    this._els.next.removeEventListener('click', this._onNext);
    document.removeEventListener('keydown', this._onKeydown);
    this._els.wrap.removeEventListener('touchstart', this._onTouchStart);
    this._els.wrap.removeEventListener('touchend', this._onTouchEnd);
  }
}

const ANGLE_LABELS = [
  'Вид спереди',
  'Передний правый угол',
  'Вид справа',
  'Задний правый угол',
  'Вид сзади',
  'Задний левый угол',
  'Вид слева',
  'Передний левый угол',
];
