// Меню разделов на узком экране: кнопка открывает и закрывает список, переход по ссылке его закрывает.
(function () {
  var button = document.querySelector('.menu-btn');
  var top = document.querySelector('.top');
  if (!button || !top) return;

  function setOpen(open) {
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    top.classList.toggle('top--open', open);
  }

  button.addEventListener('click', function () {
    setOpen(button.getAttribute('aria-expanded') !== 'true');
  });
  document.querySelectorAll('#menu a').forEach(function (link) {
    link.addEventListener('click', function () { setOpen(false); });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setOpen(false);
  });
})();
