"use strict";

const ratingDialog = byId("rating-dialog");
const ratingForm = byId("rating-form");
const scoreFormat = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
let ratingDraft = null;
let openedRatingLink = "";

function ratingMarkup(profile) {
  const count = profile.ratingCount || 0;
  const score = count ? scoreFormat.format(profile.rating) : "";
  const countLabel = count === 1 ? "1 calificación" : count + " calificaciones";
  const summary = count ? score + " de 5, " + countLabel : "Sin calificaciones";
  return `<span class="rating-summary" role="img" aria-label="${summary}">
    <span class="rating-display" aria-hidden="true">★★★★★<span style="width:${count ? Math.max(0, Math.min(100, profile.rating * 20)) : 0}%">★★★★★</span></span>
    <span aria-hidden="true">${count ? `<strong>${score}</strong> (${count})` : summary}</span>
  </span>`;
}

byId("rating-stars").innerHTML = [1, 2, 3, 4, 5].map((value) => `
  <label class="rating-choice">
    <input type="radio" name="score" value="${value}" class="sr-only" required>
    <span aria-hidden="true">★</span><span class="sr-only">${value} ${value === 1 ? "estrella" : "estrellas"}</span>
  </label>`).join("");

function showRating(id, score = "", hired = false) {
  const profile = findProfile(id);
  const available = Boolean(profile?.canRate && backend);
  ratingDraft = available ? { id, score, hired } : null;
  ratingForm.reset();
  ratingForm.hidden = !available;
  byId("rating-profile").textContent = available ? profile.name : "Esta ficha no está disponible para calificar.";
  if (score) ratingForm.elements.score.value = score;
  byId("rating-hired").checked = hired;
  feedback("rating-message");
  showPanel(ratingDialog);
}

function openLinkedRating() {
  const hash = location.hash;
  if (hash === openedRatingLink || catalogLoading || catalogProblem) return;
  openedRatingLink = hash;
  const link = new URLSearchParams(hash.slice(1));
  if (link.has("resena")) showRating(link.get("perfil"));
}
window.addEventListener("hashchange", openLinkedRating);

function resumeRating() {
  if (!ratingDraft) return showAccess();
  const { id, score, hired } = ratingDraft;
  showRating(id, score, hired);
}

ratingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const id = ratingDraft?.id;
  if (!id) return;
  const score = ratingForm.elements.score.value;
  const hired = byId("rating-hired").checked;
  void runAction(ratingDialog, "rating-message", async () => {
    if (!hired) throw Error("Confirmá que contrataste este servicio.");
    if (!score) throw Error("Elegí entre 1 y 5 estrellas.");
    ratingDraft = { id, score, hired };
    if (!sessionUser) {
      await showAccess("rating");
      return;
    }

    await backend.rate(id, Number(score), hired);
    if (new URLSearchParams(location.hash.slice(1)).has("resena")) {
      history.replaceState(null, "", "#perfil=" + id);
      openedRatingLink = location.hash;
    }
    ratingDraft = null;
    await refreshDirectory();
    if (ratingDialog.open) {
      ratingDialog.close();
      const profile = findProfile(id);
      if (profile) {
        openProfile(profile);
        byId("profile-status").textContent = "Tu calificación se publicó.";
      }
    }
  }, "No se pudo publicar la calificación.");
});
