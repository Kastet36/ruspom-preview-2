(() => {
  const track = document.querySelector('.gallery-track');
  const cards = [...track.querySelectorAll('.gallery-card')];
  const dialog = document.querySelector('.viewer');
  const viewerTrack = dialog.querySelector('.viewer-track');
  const slides = [...dialog.querySelectorAll('.viewer-slide')];
  const thumbsTrack = dialog.querySelector('.viewer-thumbs');
  const thumbs = [...dialog.querySelectorAll('.viewer-thumb')];
  const photos = cards.map(card => ({
    caption: card.querySelector('figcaption>span').textContent
  }));
  const previous = document.querySelector('[data-gallery-prev]');
  const next = document.querySelector('[data-gallery-next]');
  const viewerPrevious = dialog.querySelector('[data-viewer-prev]');
  const viewerNext = dialog.querySelector('[data-viewer-next]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(photos.length - 1, value));
  const format = value => String(value + 1).padStart(2, '0');
  let active = 0;
  let origin;
  let savedScroll = 0;
  let galleryFrame;
  let viewerFrame;
  const behavior = instant => instant || reduced.matches ? 'auto' : 'smooth';
  const step = () => cards[1].offsetLeft - cards[0].offsetLeft;

  function updateGallery() {
    const max = track.scrollWidth - track.clientWidth;
    previous.disabled = track.scrollLeft < 3;
    next.disabled = max - track.scrollLeft < 3;
    document.querySelector('.gallery-progress>span').style.width = Math.min(100, (track.scrollLeft + track.clientWidth) / track.scrollWidth * 100) + '%';
  }

  function moveGallery(direction) {
    const target = Math.round(track.scrollLeft / step()) + direction;
    track.scrollTo({ left: clamp(target) * step(), behavior: behavior(false) });
  }
  previous.addEventListener('click', () => moveGallery(-1));
  next.addEventListener('click', () => moveGallery(1));
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(galleryFrame);
    galleryFrame = requestAnimationFrame(updateGallery);
  }, { passive: true });
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      moveGallery(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });

  function loadImage(index) {
    if (index < 0 || index >= photos.length) return;
    const image = slides[index].querySelector('img');
    if (!image.getAttribute('src')) image.src = image.dataset.src;
  }

  function updateViewer(index) {
    active = clamp(index);
    loadImage(active - 1);
    loadImage(active);
    loadImage(active + 1);
    slides.forEach((slide, number) => {
      if (Math.abs(number - active) > 1) slide.querySelector('img').removeAttribute('src');
    });
    dialog.querySelector('[data-viewer-number]').textContent = format(active);
    dialog.querySelector('.viewer-caption').textContent = photos[active].caption;
    viewerPrevious.disabled = active === 0;
    viewerNext.disabled = active === photos.length - 1;
    thumbs.forEach((thumb, number) => thumb.setAttribute('aria-pressed', String(number === active)));
    const thumb = thumbs[active];
    thumbsTrack.scrollTo({ left: thumb.offsetLeft - thumbsTrack.offsetLeft - thumbsTrack.clientWidth / 2 + thumb.clientWidth / 2, behavior: behavior(false) });
  }

  function selectPhoto(index) {
    const selected = clamp(index);
    loadImage(selected);
    updateViewer(selected);
    viewerTrack.scrollTo({ left: selected * viewerTrack.clientWidth, behavior: 'auto' });
  }

  function openViewer(index, button) {
    origin = button;
    savedScroll = window.scrollY;
    document.documentElement.classList.add('viewer-open');
    document.body.style.position = 'fixed';
    document.body.style.top = -savedScroll + 'px';
    document.body.style.width = '100%';
    thumbs.forEach(thumb => {
      const image = thumb.querySelector('img');
      if (!image.getAttribute('src')) image.src = image.dataset.src;
    });
    dialog.showModal();
    selectPhoto(index);
    dialog.querySelector('.viewer-close').focus({ preventScroll: true });
  }

  document.querySelectorAll('[data-open]').forEach(button => {
    button.addEventListener('click', () => openViewer(Number(button.dataset.open), button));
  });
  viewerPrevious.addEventListener('click', () => selectPhoto(active - 1));
  viewerNext.addEventListener('click', () => selectPhoto(active + 1));
  thumbs.forEach(thumb => thumb.addEventListener('click', () => selectPhoto(Number(thumb.dataset.select))));
  viewerTrack.addEventListener('scroll', () => {
    cancelAnimationFrame(viewerFrame);
    viewerFrame = requestAnimationFrame(() => {
      if (!dialog.open || !viewerTrack.clientWidth) return;
      const index = clamp(Math.round(viewerTrack.scrollLeft / viewerTrack.clientWidth));
      if (index !== active) updateViewer(index);
    });
  }, { passive: true });
  document.addEventListener('keydown', event => {
    if (!dialog.open) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      selectPhoto(active + (event.key === 'ArrowLeft' ? -1 : 1));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      selectPhoto(event.key === 'Home' ? 0 : photos.length - 1);
    }
  });
  dialog.querySelector('.viewer-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('viewer-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    const old = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, savedScroll);
    document.documentElement.style.scrollBehavior = old;
    origin?.focus({ preventScroll: true });
  });

  // Touch uses the browser's native scrolling. Mouse dragging uses the same strips.
  function mouseDrag(element, getStep) {
    let drag;
    let suppressClick = false;
    element.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      drag = { x: event.clientX, left: element.scrollLeft, id: event.pointerId, moved: false };
    });
    element.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const distance = event.clientX - drag.x;
      if (!drag.moved && Math.abs(distance) < 6) return;
      if (!drag.moved) {
        drag.moved = true;
        element.setPointerCapture(event.pointerId);
        element.classList.add('dragging');
      }
      event.preventDefault();
      element.scrollLeft = drag.left - distance;
    });
    function finish(event) {
      if (!drag || event.pointerId !== drag.id) return;
      const moved = drag.moved;
      drag = null;
      element.classList.remove('dragging');
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
      if (moved) {
        suppressClick = true;
        const unit = getStep();
        element.scrollTo({ left: Math.round(element.scrollLeft / unit) * unit, behavior: behavior(false) });
        setTimeout(() => { suppressClick = false; }, 0);
      }
    }
    element.addEventListener('pointerup', finish);
    element.addEventListener('pointercancel', finish);
    element.addEventListener('pointerleave', event => { if (drag && !drag.moved) finish(event); });
    element.addEventListener('click', event => {
      if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    element.addEventListener('dragstart', event => event.preventDefault());
  }
  mouseDrag(track, step);
  mouseDrag(viewerTrack, () => viewerTrack.clientWidth);

  const reviewTrack = document.querySelector('.map-reviews-track');
  if (reviewTrack) {
    const reviewPrevious = document.querySelector('[data-review-prev]');
    const reviewNext = document.querySelector('[data-review-next]');
    const reviewCount = document.querySelector('.map-reviews-count');
    const reviewStep = () => reviewTrack.children[1].offsetLeft - reviewTrack.children[0].offsetLeft;
    const reviewMax = () => reviewTrack.scrollWidth - reviewTrack.clientWidth;
    const scrollReview = left => reviewTrack.scrollTo({ left: Math.max(0, Math.min(reviewMax(), left)), behavior: behavior(false) });
    function updateReviews() {
      reviewPrevious.disabled = reviewTrack.scrollLeft < 3;
      reviewNext.disabled = reviewMax() - reviewTrack.scrollLeft < 3;
      reviewCount.textContent = String(Math.round(reviewTrack.scrollLeft / reviewStep()) + 1).padStart(2, '0') + ' / 05';
    }
    const moveReview = direction => scrollReview((Math.round(reviewTrack.scrollLeft / reviewStep()) + direction) * reviewStep());
    reviewPrevious.addEventListener('click', () => moveReview(-1));
    reviewNext.addEventListener('click', () => moveReview(1));
    reviewTrack.addEventListener('scroll', updateReviews, { passive: true });
    reviewTrack.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') scrollReview(0);
      else if (event.key === 'End') scrollReview(reviewMax());
      else moveReview(event.key === 'ArrowLeft' ? -1 : 1);
    });
    mouseDrag(reviewTrack, reviewStep);
    let wheelTimer;
    reviewTrack.addEventListener('wheel', event => {
      if (event.ctrlKey) return;
      let delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      else if (event.deltaMode === 2) delta *= reviewTrack.clientWidth;
      if (!delta || (delta < 0 && reviewTrack.scrollLeft <= 1) || (delta > 0 && reviewMax() - reviewTrack.scrollLeft <= 1)) return;
      event.preventDefault();
      reviewTrack.classList.add('wheeling');
      reviewTrack.scrollLeft += delta;
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        reviewTrack.classList.remove('wheeling');
        scrollReview(Math.round(reviewTrack.scrollLeft / reviewStep()) * reviewStep());
      }, 160);
    }, { passive: false });
    new ResizeObserver(updateReviews).observe(reviewTrack);
    updateReviews();
  }

  const videoTrack = document.querySelector('.video-track');
  const videoPrevious = document.querySelector('[data-video-prev]');
  const videoNext = document.querySelector('[data-video-next]');
  const videoDialog = document.querySelector('.video-viewer');
  let videos = [...videoTrack.querySelectorAll('.video-card')].map(card => ({
    title: 'Видеоотзыв', poster: card.querySelector('img').getAttribute('src'), embedUrl: null
  }));
  let videoOrigin;
  let videoScroll = 0;
  let videoFrame;
  const videoStep = () => videoTrack.children.length > 1
    ? videoTrack.children[1].offsetLeft - videoTrack.children[0].offsetLeft
    : videoTrack.clientWidth;

  function updateVideos() {
    videoPrevious.disabled = videoTrack.scrollLeft < 3;
    videoNext.disabled = videoTrack.scrollWidth - videoTrack.clientWidth - videoTrack.scrollLeft < 3;
    document.querySelector('.video-progress>span').style.width = Math.min(100,
      (videoTrack.scrollLeft + videoTrack.clientWidth) / videoTrack.scrollWidth * 100) + '%';
  }
  function moveVideo(direction) {
    const index = Math.round(videoTrack.scrollLeft / videoStep()) + direction;
    videoTrack.scrollTo({ left: Math.max(0, Math.min(videos.length - 1, index)) * videoStep(), behavior: behavior(false) });
  }
  videoPrevious.addEventListener('click', () => moveVideo(-1));
  videoNext.addEventListener('click', () => moveVideo(1));
  videoTrack.addEventListener('scroll', () => {
    cancelAnimationFrame(videoFrame);
    videoFrame = requestAnimationFrame(updateVideos);
  }, { passive: true });
  videoTrack.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    moveVideo(event.key === 'ArrowLeft' ? -1 : 1);
  });
  mouseDrag(videoTrack, videoStep);
  new ResizeObserver(updateVideos).observe(videoTrack);
  updateVideos();

  fetch('assets/cinema/videos.json').then(response => {
    if (!response.ok) throw new Error('Video data unavailable');
    return response.json();
  }).then(items => {
    if (!Array.isArray(items) || !items.length) return;
    const template = videoTrack.querySelector('.video-card');
    if (!template) return;
    videos = items;
    videoTrack.replaceChildren(...items.map((item, index) => {
      const card = template.cloneNode(true);
      const button = card.querySelector('[data-video]');
      button.dataset.video = String(index);
      button.setAttribute('aria-label', item.embedUrl ? 'Смотреть: ' + item.title : item.title + ': видео скоро');
      card.querySelector('img').src = item.poster;
      card.querySelector('figcaption>span').textContent = item.title;
      card.querySelector('.video-soon').hidden = Boolean(item.embedUrl);
      return card;
    }));
    updateVideos();
  }).catch(() => { /* The static placeholder gallery remains available. */ });

  videoTrack.addEventListener('click', event => {
    const button = event.target.closest('[data-video]');
    if (!button) return;
    const item = videos[Number(button.dataset.video)];
    if (!item?.embedUrl) {
      showNotice('Видео появится здесь после добавления.');
      return;
    }
    let url;
    try { url = new URL(item.embedUrl); } catch { return; }
    if (url.protocol !== 'https:' || !['vk.com', 'vkvideo.ru'].includes(url.hostname) || url.pathname !== '/video_ext.php') return;
    const frame = document.createElement('iframe');
    frame.src = url.href;
    frame.title = item.title;
    frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    videoDialog.querySelector('.video-player').replaceChildren(frame);
    videoDialog.querySelector('.video-viewer-title').textContent = item.title;
    videoOrigin = button;
    videoScroll = window.scrollY;
    document.documentElement.classList.add('viewer-open');
    document.body.style.position = 'fixed';
    document.body.style.top = -videoScroll + 'px';
    document.body.style.width = '100%';
    videoDialog.showModal();
    videoDialog.querySelector('.video-close').focus({ preventScroll: true });
  });
  videoDialog.querySelector('.video-close').addEventListener('click', () => videoDialog.close());
  videoDialog.addEventListener('close', () => {
    videoDialog.querySelector('.video-player').replaceChildren();
    document.documentElement.classList.remove('viewer-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    const old = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, videoScroll);
    document.documentElement.style.scrollBehavior = old;
    videoOrigin?.focus({ preventScroll: true });
  });

  const observer = new ResizeObserver(() => {
    updateGallery();
    if (dialog.open) viewerTrack.scrollTo({ left: active * viewerTrack.clientWidth, behavior: 'auto' });
  });
  observer.observe(track);
  observer.observe(viewerTrack);
  updateGallery();

  const notice = document.querySelector('.preview-notice');
  let timer;
  function showNotice(message) {
    notice.textContent = message;
    notice.classList.add('visible');
    clearTimeout(timer);
    timer = setTimeout(() => notice.classList.remove('visible'), 5000);
  }
  document.querySelectorAll('[data-catalog]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      document.querySelector('#catalogue').scrollIntoView({ behavior: behavior(false), block: 'start' });
      document.querySelector('#catalogue-title').focus({ preventScroll: true });
    });
  });
  document.querySelector('[data-catalog-request]').addEventListener('click', () => {
    showNotice('Получение каталога подключим после согласования.');
  });

  const comparison = document.querySelector('[data-finish-comparison]');
  if (!comparison) return;
  const comparisonRange = comparison.querySelector('.finish-range');
  const beforeLabel = comparison.querySelector('.finish-state-before');
  const afterLabel = comparison.querySelector('.finish-state-after');
  let comparisonDrag;

  function reveal(value) {
    const amount = Math.max(0, Math.min(100, Math.round(Number(value))));
    comparisonRange.value = String(amount);
    comparison.style.setProperty('--reveal', amount + '%');
    comparisonRange.setAttribute('aria-valuetext', amount === 0
      ? 'С отделкой — всё изображение'
      : amount === 100 ? 'Тёплый контур — всё изображение'
        : 'Тёплый контур — ' + amount + ' процентов изображения, с отделкой — ' + (100 - amount) + ' процентов');
    beforeLabel.style.opacity = String(Math.min(1, amount / 16));
    afterLabel.style.opacity = String(Math.min(1, (100 - amount) / 16));
  }
  function revealAt(clientX) {
    const bounds = comparison.getBoundingClientRect();
    reveal((clientX - bounds.left) / bounds.width * 100);
  }
  comparisonRange.addEventListener('input', () => reveal(comparisonRange.value));
  comparison.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    comparisonDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, active: event.pointerType === 'mouse' };
    if (comparisonDrag.active) {
      event.preventDefault();
      comparison.setPointerCapture(event.pointerId);
      comparison.classList.add('is-dragging');
      comparisonRange.focus({ preventScroll: true });
      revealAt(event.clientX);
    }
  });
  comparison.addEventListener('pointermove', event => {
    if (!comparisonDrag || comparisonDrag.id !== event.pointerId) return;
    if (!comparisonDrag.active) {
      const dx = Math.abs(event.clientX - comparisonDrag.x);
      const dy = Math.abs(event.clientY - comparisonDrag.y);
      if (dy > 8 && dy > dx) { comparisonDrag = null; return; }
      if (dx < 8 || dx <= dy) return;
      comparisonDrag.active = true;
      comparison.setPointerCapture(event.pointerId);
      comparison.classList.add('is-dragging');
      comparisonRange.focus({ preventScroll: true });
    }
    event.preventDefault();
    revealAt(event.clientX);
  });
  function endComparisonDrag(event) {
    if (!comparisonDrag || comparisonDrag.id !== event.pointerId) return;
    if (event.type === 'pointerup') revealAt(event.clientX);
    if (comparison.hasPointerCapture(event.pointerId)) comparison.releasePointerCapture(event.pointerId);
    comparisonDrag = null;
    comparison.classList.remove('is-dragging');
  }
  comparison.addEventListener('pointerup', endComparisonDrag);
  comparison.addEventListener('pointercancel', endComparisonDrag);
  comparison.addEventListener('lostpointercapture', () => {
    comparisonDrag = null;
    comparison.classList.remove('is-dragging');
  });
  comparison.addEventListener('dragstart', event => event.preventDefault());
  reveal(comparisonRange.value);
})();
