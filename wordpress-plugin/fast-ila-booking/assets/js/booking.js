/**
 * Fast-ILA Booking — iframe resizer.
 *
 * The embedded app posts {fastila:height, value} messages to its parent
 * whenever the document body grows or shrinks. Listen for them and resize
 * any iframe in the page whose origin matches the message source.
 */
(function () {
  if (typeof window === 'undefined') return;

  function frameForSource(source) {
    var frames = document.querySelectorAll('iframe.fast-ila-booking-frame');
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === source) return frames[i];
    }
    return null;
  }

  window.addEventListener('message', function (ev) {
    if (!ev || !ev.data) return;
    var data = ev.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { return; }
    }
    if (!data || data.channel !== 'fastila') return;

    var frame = frameForSource(ev.source);
    if (!frame) return;

    // Only resize when the wrap opted in via data-auto-height
    var wrap = frame.closest('.fast-ila-booking-wrap');
    if (wrap && wrap.getAttribute('data-auto-height') !== '1') return;

    if (data.type === 'height' && typeof data.value === 'number') {
      frame.style.height = Math.max(400, Math.ceil(data.value)) + 'px';
    } else if (data.type === 'scroll-top') {
      var rect = frame.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + rect.top - 40, behavior: 'smooth' });
    }
  }, false);
})();
