"use strict";
(function (scope) {
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function https(value) {
    if (typeof value !== "string" || /[\x00-\x20<>"'\\]/.test(value)) return "";
    try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password ? u.href : ""; } catch { return ""; }
  }
  function imageUrl(value, demo = false) {
    if (demo && typeof value === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) return value;
    return https(value);
  }
  function cvUrl(value, demo = false) {
    if (demo && typeof value === "string" && /^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/.test(value)) return value;
    return https(value);
  }
  function galleryMarkup(values, name = "", demo = false) {
    const urls = (Array.isArray(values) ? values : []).slice(0, 4).map(v => imageUrl(v, demo)).filter(Boolean);
    if (!urls.length) return "";
    return '<section class="profile-gallery" aria-label="Galería de trabajos"><h3>Galería</h3><div class="media-gallery">' +
      urls.map((src, i) => '<figure><img src="' + escape(src) + '" alt="' + escape("Trabajo " + (i + 1) + (name ? " de " + name : "")) + '" loading="lazy" decoding="async" width="480" height="360"></figure>').join("") + '</div></section>';
  }
  function cvMarkup(value, professional, demo = false) {
    const url = professional ? cvUrl(value, demo) : "";
    return url ? '<a class="button secondary cv-download" href="' + escape(url) + '" rel="noopener noreferrer" download="curriculum.pdf">Descargar CV · PDF</a>' : "";
  }
  scope.MidiProfileMedia = Object.freeze({imageUrl, cvUrl, galleryMarkup, cvMarkup});
})(globalThis);

