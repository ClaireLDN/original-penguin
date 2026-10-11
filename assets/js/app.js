/* Original Penguin site: language toggle, content rendering, media slideshows.
   Content lives in /content/*.json and is edited through /admin (Decap CMS). */
(() => {
  const DAY = 86400000;
  const page = document.body.dataset.page; // "timeline" | "team" | "sponsors"

  /* ---------- Interface translations (posts, team and sponsors come from the CMS) ---------- */
  const T = {
    en: {
      nav_timeline: "Timeline",
      nav_team: "Team",
      nav_sponsors: "Sponsors & Contact",
      hero_eyebrow: "Red Bull Flugtag Miami · 31 Oct 2026",
      hero_title: "Born to Waddle.<br><span>Built to Fly.</span>",
      hero_sub: "Follow the Original Penguin team as we build a flying machine, from day one to launch day.",
      countdown_label: "days to take off",
      follow_ig: "Follow on Instagram",
      feed_title: "Follow the build, step by step",
      feed_sub: "Every step of the build, newest first.",
      day_label: "Day",
      view_ig: "View on Instagram",
      empty_feed: "The first build posts are coming soon.",
      team_title: "The team",
      team_sub: "Meet the people behind the penguin.",
      team_empty: "Team details coming soon.",
      role_tbc: "Role to come",
      bio_tbc: "Bio coming soon.",
      contact_title: "Let's connect",
      contact_sub: "Want to sponsor, collaborate, or just say hi? Drop us a line.",
      email_btn: "Email the team",
      ig_btn: "Follow on Instagram",
      footer_tag: "Original Penguin team · Red Bull Flugtag Miami 2026",
      load_error: "Content could not be loaded. Please refresh the page.",
      slide_prev: "Previous",
      slide_next: "Next",
      slide_n: "Show item"
    },
    fr: {
      nav_timeline: "Actualités",
      nav_team: "Équipe",
      nav_sponsors: "Sponsors & Contact",
      hero_eyebrow: "Red Bull Flugtag Miami · 31 oct. 2026",
      hero_title: "Born to Waddle.<br><span>Built to Fly.</span>",
      hero_sub: "Suivez l'équipe Original Penguin pendant la construction d'une machine volante, du premier jour au jour du décollage.",
      countdown_label: "jours avant le décollage",
      follow_ig: "Suivre sur Instagram",
      feed_title: "Suivez la construction, étape par étape",
      feed_sub: "Chaque étape de la construction, des plus récentes aux plus anciennes.",
      day_label: "Jour",
      view_ig: "Voir sur Instagram",
      empty_feed: "Les premières publications arrivent bientôt.",
      team_title: "L'équipe",
      team_sub: "Découvrez les personnes derrière le pingouin.",
      team_empty: "Les informations sur l'équipe arrivent bientôt.",
      role_tbc: "Rôle à venir",
      bio_tbc: "Biographie bientôt disponible.",
      contact_title: "Restons en contact",
      contact_sub: "Vous voulez sponsoriser, collaborer ou simplement dire bonjour ? Écrivez-nous.",
      email_btn: "Écrire à l'équipe",
      ig_btn: "Suivre sur Instagram",
      footer_tag: "Équipe Original Penguin · Red Bull Flugtag Miami 2026",
      load_error: "Le contenu n'a pas pu être chargé. Merci de rafraîchir la page.",
      slide_prev: "Précédent",
      slide_next: "Suivant",
      slide_n: "Afficher l'élément"
    }
  };

  // English by default; the visitor's choice is remembered.
  let lang = localStorage.getItem("op-lang") === "fr" ? "fr" : "en";
  const t = (k) => T[lang][k] ?? T.en[k] ?? k;

  /* ---------- Helpers ---------- */
  const esc = (s = "") =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pick = (obj, base) => obj[`${base}_${lang}`] || obj[`${base}_en`] || "";
  const parseDay = (iso) => new Date(`${iso}T12:00:00`);
  const fmtDate = (iso) =>
    parseDay(iso).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short", year: "numeric" });
  const initials = (name = "") =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  const ytId = (url = "") => {
    const m = String(url).match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
    return m ? m[1] : null;
  };
  const domainOf = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };

  async function getJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${path} ${res.status}`);
    return res.json();
  }

  /* ---------- Static text + links ---------- */
  function applyStatic(site) {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.innerHTML = t(el.dataset.i18n);
    });
    const toggle = document.getElementById("langToggle");
    if (toggle) {
      toggle.textContent = lang === "en" ? "FR" : "EN";
      toggle.setAttribute("aria-label", lang === "en" ? "Passer en français" : "Switch to English");
    }
    if (site) {
      document.querySelectorAll("[data-ig]").forEach((a) => {
        a.href = site.instagram_url;
        a.target = "_blank";
        a.rel = "noopener";
      });
      document.querySelectorAll("[data-ig-handle]").forEach((el) => (el.textContent = site.instagram_handle));
      document.querySelectorAll("[data-email]").forEach((a) => (a.href = `mailto:${site.email}`));
      document.querySelectorAll("[data-email-text]").forEach((el) => (el.textContent = site.email));
    }
  }

  /* ---------- Media slideshow (photos, videos, YouTube) ---------- */
  // Posts use a "media" list. Older posts with a single image/video are shown as a one-item list.
  function mediaItems(p) {
    if (Array.isArray(p.media) && p.media.length) return p.media;
    const items = [];
    if (p.video) items.push(ytId(p.video) ? { youtube: p.video } : { file: p.video, poster: p.image });
    if (p.image) items.push({ file: p.image });
    return items;
  }

  function slideMedia(m, alt) {
    if (m.youtube && ytId(m.youtube)) {
      return `<iframe src="https://www.youtube-nocookie.com/embed/${ytId(m.youtube)}" title="${esc(alt)}" loading="lazy" allowfullscreen></iframe>`;
    }
    if (!m.file) return "";
    if (/\.(mp4|webm|mov)$/i.test(m.file)) {
      return `<video controls preload="metadata"${m.poster ? ` poster="${esc(m.poster)}"` : ""} src="${esc(m.file)}"></video>`;
    }
    return `<img src="${esc(m.file)}" alt="${esc(alt)}" decoding="async">`;
  }

  function sliderHTML(items, alt) {
    const slides = items.map((m) => `<figure class="slide">${slideMedia(m, alt)}</figure>`).join("");
    if (items.length <= 1) return `<div class="slider"><div class="slides">${slides}</div></div>`;
    const dots = items
      .map((_, i) => `<button type="button" class="sl-dot${i === 0 ? " is-active" : ""}" data-go="${i}" aria-label="${t("slide_n")} ${i + 1}"></button>`)
      .join("");
    return `
      <div class="slider">
        <div class="slides" tabindex="0" aria-label="${esc(alt)}">${slides}</div>
        <button type="button" class="sl-btn sl-prev" data-dir="-1" aria-label="${t("slide_prev")}">‹</button>
        <button type="button" class="sl-btn sl-next" data-dir="1" aria-label="${t("slide_next")}">›</button>
        <div class="sl-dots">${dots}</div>
      </div>`;
  }

  /* ---------- Fullscreen video (iPhone uses its own video fullscreen) ---------- */
  function goFullscreen(v) {
    try {
      if (v.requestFullscreen) v.requestFullscreen();
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    } catch (err) {
      /* the browser refused: the video simply plays inline */
    }
  }

  /* ---------- Timeline ---------- */
  function postHTML(p, dayNumber) {
    const title = pick(p, "title");
    const text = pick(p, "text");
    const ig = p.instagram_url
      ? `<a class="ig-link" href="${esc(p.instagram_url)}" target="_blank" rel="noopener">${t("view_ig")} →</a>`
      : "";
    return `
      <article class="post">
        <div class="post-media">${sliderHTML(mediaItems(p), title)}</div>
        <div class="post-body">
          <p class="post-meta">
            ${dayNumber ? `<span class="pill">${t("day_label")} ${dayNumber}</span>` : ""}
            <time datetime="${esc(p.date)}">${fmtDate(p.date)}</time>
          </p>
          <h3>${esc(title)}</h3>
          <p>${esc(text).replace(/\n/g, "<br>")}</p>
          ${ig}
        </div>
      </article>`;
  }

  function renderTimeline(data) {
    const feed = document.getElementById("feed");
    if (!feed) return;
    // "Day N" counts build updates in chronological order (1st post = Day 1), not calendar days.
    const chronological = [...data.posts.posts].sort((a, b) => parseDay(a.date) - parseDay(b.date));
    const dayOf = new Map(chronological.map((p, i) => [p, i + 1]));
    // Newest first. Reversing the chronological list keeps posts from the same day in upload order.
    const posts = [...chronological].reverse();
    feed.innerHTML = posts.length
      ? posts.map((p) => postHTML(p, dayOf.get(p))).join("")
      : `<div class="empty">${t("empty_feed")}</div>`;

    const days = document.getElementById("days");
    if (days) {
      const left = Math.max(0, Math.ceil((parseDay(data.site.event_date) - Date.now()) / DAY));
      days.textContent = left;
    }
  }

  // Slideshow controls use event delegation, bound once, so they survive re-renders.
  function bindSliders() {
    const feed = document.getElementById("feed");
    if (!feed || feed.dataset.bound) return;
    feed.dataset.bound = "1";

    feed.addEventListener("click", (e) => {
      const video = e.target.closest("video");
      if (video) {
        if (video.paused) {
          goFullscreen(video);
          video.play().catch(() => {});
        } else {
          video.pause();
        }
        return;
      }
      const slider = e.target.closest(".slider");
      if (!slider) return;
      const slides = slider.querySelector(".slides");
      const step = e.target.closest("[data-dir]");
      const dot = e.target.closest("[data-go]");
      if (step) slides.scrollBy({ left: Number(step.dataset.dir) * slides.clientWidth, behavior: "smooth" });
      if (dot) slides.scrollTo({ left: Number(dot.dataset.go) * slides.clientWidth, behavior: "smooth" });
    });

    // Keep the dots in sync with swipes, and pause videos that leave the screen.
    feed.addEventListener(
      "scroll",
      (e) => {
        if (!e.target.classList || !e.target.classList.contains("slides")) return;
        const slides = e.target;
        const slider = slides.closest(".slider");
        const idx = Math.round(slides.scrollLeft / slides.clientWidth);
        slider.querySelectorAll(".sl-dot").forEach((d, i) => d.classList.toggle("is-active", i === idx));
        slides.querySelectorAll(".slide").forEach((s, i) => {
          if (i !== idx) s.querySelectorAll("video").forEach((v) => v.pause());
        });
      },
      true
    );
  }

  /* ---------- Team ---------- */
  function memberHTML(m, i) {
    const name = m.name || `Team member ${i + 1}`;
    const avatar = m.photo
      ? `<img src="${esc(m.photo)}" alt="${esc(name)}" loading="lazy">`
      : `<span aria-hidden="true">${esc(initials(name))}</span>`;
    return `
      <article class="member">
        <div class="avatar">${avatar}</div>
        <h3>${esc(name)}</h3>
        <p class="role">${esc(pick(m, "role") || t("role_tbc"))}</p>
        <p>${esc(pick(m, "bio") || t("bio_tbc")).replace(/\n/g, "<br>")}</p>
      </article>`;
  }

  function renderTeam(data) {
    const grid = document.getElementById("team");
    if (!grid) return;
    const members = data.team.team || [];
    grid.innerHTML = members.length ? members.map(memberHTML).join("") : `<div class="empty">${t("team_empty")}</div>`;
  }

  /* ---------- Sponsors ---------- */
  function sponsorHTML(s) {
    const logo = s.logo
      ? `<img src="${esc(s.logo)}" alt="${esc(s.name)} logo" loading="lazy">`
      : `<span class="wordmark">${esc(s.name)}</span>`;
    const site = s.url
      ? `<a class="btn btn-ghost" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(domainOf(s.url))} <span aria-hidden="true">↗</span></a>`
      : "";
    return `
      <article class="sponsor">
        <div class="sponsor-logo">${logo}</div>
        <p class="tier">${esc(pick(s, "tier"))}</p>
        <h3>${esc(s.name)}</h3>
        <p>${esc(pick(s, "description"))}</p>
        ${site}
      </article>`;
  }

  function renderSponsors(data) {
    const grid = document.getElementById("sponsors");
    if (!grid) return;
    grid.innerHTML = (data.sponsors.sponsors || []).map(sponsorHTML).join("");
  }

  /* ---------- Language toggle ---------- */
  function setLang(next) {
    lang = next;
    localStorage.setItem("op-lang", next);
    init(); // re-render with the new language
  }

  /* ---------- Boot ---------- */
  let cache = null;
  async function init() {
    try {
      if (!cache) {
        const [site, posts, team, sponsors] = await Promise.all([
          getJSON("content/site.json"),
          getJSON("content/posts.json"),
          getJSON("content/team.json"),
          getJSON("content/sponsors.json")
        ]);
        cache = { site, posts, team, sponsors };
      }
      applyStatic(cache.site);
      if (page === "timeline") {
        renderTimeline(cache);
        bindSliders();
      }
      if (page === "team") renderTeam(cache);
      if (page === "sponsors") renderSponsors(cache);
    } catch (err) {
      console.error(err);
      const main = document.getElementById("main");
      if (main) main.insertAdjacentHTML("afterbegin", `<div class="empty">${t("load_error")}</div>`);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("langToggle");
    if (toggle) toggle.addEventListener("click", () => setLang(lang === "en" ? "fr" : "en"));
    init();
  });
})();
