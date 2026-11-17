// Ленты и просмотр фото.
// Лента (.rail): когда карточки не помещаются в ширину, под ней появляются стрелки и точки;
// когда помещаются (широкий экран — сетка), их нет. Пальцем лента листается и без скрипта.
// Просмотр (.gallery): нажатие на место под фото открывает его крупно в <dialog>;
// закрывают крестик, Esc и клик мимо, фокус возвращается туда, откуда открыли.
// Поведение кнопок шага и просмотра — по образцу kat-site (filmstrip.js, site.js).
(function () {
  'use strict';

  var ICON = function (id) {
    return '<svg class="icon" aria-hidden="true"><use href="' + id + '"/></svg>';
  };

  /* ── ленты ── */
  document.querySelectorAll('.rail').forEach(function (rail) {
    var track = rail.querySelector('.rail__track');
    if (!track) return;
    var items = Array.prototype.slice.call(track.children);

    var nav = document.createElement('div');
    nav.className = 'rail__nav';
    nav.innerHTML =
      '<button class="rail__btn" type="button" data-step="-1" aria-label="Poprzednie">' + ICON('#i-chevron-left') + '</button>' +
      '<div class="rail__dots"></div>' +
      '<button class="rail__btn" type="button" data-step="1" aria-label="Następne">' + ICON('#i-chevron-right') + '</button>';
    rail.appendChild(nav);

    var dotsBox = nav.querySelector('.rail__dots');
    var dots = items.map(function (item, i) {
      var dot = document.createElement('button');
      dot.className = 'rail__dot';
      dot.type = 'button';
      dot.setAttribute('aria-label', (i + 1) + ' / ' + items.length);
      dot.addEventListener('click', function () { goTo(i); });
      dotsBox.appendChild(dot);
      return dot;
    });
    var back = nav.querySelector('[data-step="-1"]');
    var next = nav.querySelector('[data-step="1"]');

    // Карточка ставится по центру ленты: считаем по центрам, а не по левым краям
    function offsetToCenter(item) {
      var t = track.getBoundingClientRect();
      var r = item.getBoundingClientRect();
      return (r.left + r.width / 2) - (t.left + track.clientWidth / 2);
    }

    function current() {
      var best = 0;
      items.forEach(function (item, i) {
        if (Math.abs(offsetToCenter(item)) < Math.abs(offsetToCenter(items[best]))) best = i;
      });
      return best;
    }

    function paint() {
      var max = track.scrollWidth - track.clientWidth;
      rail.classList.toggle('rail--scroll', max > 4);
      var at = current();
      dots.forEach(function (d, i) { d.setAttribute('aria-current', i === at ? 'true' : 'false'); });
      back.disabled = track.scrollLeft < 4;
      next.disabled = track.scrollLeft > max - 4;
    }

    function goTo(i) {
      i = Math.max(0, Math.min(items.length - 1, i));
      var to = track.scrollLeft + offsetToCenter(items[i]);
      var from = track.scrollLeft;
      track.scrollTo({ left: to, behavior: 'smooth' });
      // плавная прокрутка не сработала — доезжаем рывком: кнопка обязана двигать ленту
      setTimeout(function () {
        if (Math.abs(track.scrollLeft - from) < 2 && Math.abs(to - from) > 2) { track.scrollLeft = to; paint(); }
      }, 350);
    }

    back.addEventListener('click', function () { goTo(current() - 1); });
    next.addEventListener('click', function () { goTo(current() + 1); });
    track.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  });

  /* ── просмотр фото ── */
  var slots = Array.prototype.slice.call(document.querySelectorAll('.gallery button.photo-slot'));
  if (!slots.length || typeof HTMLDialogElement === 'undefined') return;

  var box = document.createElement('dialog');
  box.className = 'lightbox';
  box.setAttribute('aria-label', 'Zdjęcie');
  box.innerHTML =
    '<button class="lightbox__btn lightbox__close" type="button" aria-label="Zamknij">' + ICON('#i-x') + '</button>' +
    '<div class="lightbox__stage">' +
      '<button class="lightbox__btn" type="button" data-step="-1" aria-label="Poprzednie">' + ICON('#i-chevron-left') + '</button>' +
      '<div class="lightbox__view"></div>' +
      '<button class="lightbox__btn" type="button" data-step="1" aria-label="Następne">' + ICON('#i-chevron-right') + '</button>' +
    '</div>' +
    '<p class="lightbox__count"></p>';
  document.body.appendChild(box);

  var view = box.querySelector('.lightbox__view');
  var count = box.querySelector('.lightbox__count');
  var index = 0;
  var lastFocus = null;

  function show(i) {
    index = (i + slots.length) % slots.length;
    var copy = slots[index].cloneNode(true);
    var plain = document.createElement('div');
    plain.className = copy.className;
    plain.innerHTML = copy.innerHTML;
    view.innerHTML = '';
    view.appendChild(plain);
    count.textContent = (index + 1) + ' / ' + slots.length;
  }

  function open(i) {
    lastFocus = document.activeElement;
    show(i);
    box.showModal();
    box.querySelector('.lightbox__close').focus({ preventScroll: true });
  }

  function close() { box.close(); }

  box.addEventListener('close', function () {
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  });

  slots.forEach(function (slot, i) {
    slot.addEventListener('click', function () { open(i); });
  });
  box.querySelector('.lightbox__close').addEventListener('click', close);
  box.querySelectorAll('[data-step]').forEach(function (b) {
    b.addEventListener('click', function () { show(index + Number(b.dataset.step)); });
  });
  // клик мимо: по самому окну (затемнению), а не по его содержимому
  box.addEventListener('click', function (e) { if (e.target === box) close(); });
  box.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
  });

  /* листание пальцем */
  var x0 = null;
  box.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 48) show(index + (dx < 0 ? 1 : -1));
    x0 = null;
  }, { passive: true });
})();
