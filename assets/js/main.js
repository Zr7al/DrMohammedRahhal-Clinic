// assets/js/main.js
(() => {
  "use strict";

  /* =========================================================
     CONFIG
  ========================================================= */
  const CONFIG = {
    timezone: "Asia/Amman",
    openDays: [0, 1, 2, 3, 4, 6], // Sun–Thu + Sat · Fri closed
    openMin: 10 * 60,
    closeMin: 19 * 60,
    revealThreshold: 0.12,
    staggerMs: 120,
    headerOffsetExtra: 10,
    toTopShowY: 420,
    heroParallaxFactor: 0.28,
    progressBar: true,
    activeNav: true,
    lazyLoadImages: true,
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =========================================================
     HELPERS
  ========================================================= */
  const qs  = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const rafThrottle = (fn) => {
    let ticking = false;
    return (...args) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; fn(...args); });
    };
  };

  const lockScroll = (lock) => { document.body.style.overflow = lock ? "hidden" : ""; };

  const getHeaderOffset = () => {
    const header = qs("#siteHeader");
    return (header ? header.offsetHeight : 80) + CONFIG.headerOffsetExtra;
  };

  const safeFocus = (el) => { try { el && el.focus && el.focus({ preventScroll: true }); } catch (e) {} };

  /* =========================================================
     OPEN / CLOSED BADGE
  ========================================================= */
  const statusBadge = qs("#statusBadge");

  const updateStatus = () => {
    if (!statusBadge) return;
    const now   = new Date();
    const amman = new Date(now.toLocaleString("en-US", { timeZone: CONFIG.timezone }));
    const day   = amman.getDay();
    const mins  = amman.getHours() * 60 + amman.getMinutes();
    const open  = CONFIG.openDays.includes(day) && mins >= CONFIG.openMin && mins < CONFIG.closeMin;

    statusBadge.textContent = open ? "● Open Now" : "● Closed";
    statusBadge.className   = "badge-status " + (open ? "is-open" : "is-closed");
  };

  updateStatus();
  setInterval(updateStatus, 30000);

  /* =========================================================
     HEADER SHADOW
  ========================================================= */
  const header = qs("#siteHeader");

  const onScrollHeader = rafThrottle(() => {
    if (!header) return;
    header.style.boxShadow = window.scrollY > 8 ? "0 6px 28px rgba(0,0,0,.08)" : "none";
  });

  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* =========================================================
     PROGRESS BAR
  ========================================================= */
  let progressEl = null;

  if (CONFIG.progressBar) {
    progressEl = document.createElement("div");
    progressEl.setAttribute("aria-hidden", "true");
    Object.assign(progressEl.style, {
      position: "fixed", left: "0", top: "0",
      height: "3px", width: "0%", zIndex: "2000",
      background: "linear-gradient(90deg, #C5A059, #1A6449)",
      transition: reduceMotion ? "none" : "width 120ms ease",
    });
    document.body.appendChild(progressEl);
  }

  const onScrollProgress = rafThrottle(() => {
    if (!progressEl) return;
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progressEl.style.width = clamp(pct, 0, 100) + "%";
  });

  window.addEventListener("scroll", onScrollProgress, { passive: true });
  onScrollProgress();

  /* =========================================================
     MOBILE NAV
  ========================================================= */
  const navToggle = qs("#navToggle");
  const navMenu   = qs("#navMenu");

  const isNavOpen = () => navMenu && navMenu.classList.contains("open");

  const closeNav = () => {
    if (!navToggle || !navMenu) return;
    navMenu.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    lockScroll(false);
  };

  const openNav = () => {
    if (!navToggle || !navMenu) return;
    navMenu.classList.add("open");
    navToggle.setAttribute("aria-expanded", "true");
    lockScroll(true);
    safeFocus(qs("a", navMenu));
  };

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => isNavOpen() ? closeNav() : openNav());

    qsa("a", navMenu).forEach((a) => {
      a.addEventListener("click", () => { if (window.innerWidth < 900) closeNav(); });
    });

    document.addEventListener("click", (e) => {
      if (!isNavOpen()) return;
      if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) closeNav();
    });

    window.addEventListener("keydown", (e) => {
      if (!isNavOpen()) return;
      if (e.key === "Escape") { closeNav(); safeFocus(navToggle); }
    });

    window.addEventListener("resize", rafThrottle(() => {
      if (window.innerWidth >= 900) closeNav();
    }));
  }

  /* =========================================================
     SMOOTH ANCHORS WITH STICKY OFFSET
  ========================================================= */
  const smoothScrollTo = (target) => {
    const y = target.getBoundingClientRect().top + window.pageYOffset - getHeaderOffset();
    window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
  };

  qsa('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href.length < 2) return;
      const target = qs(href);
      if (!target) return;
      e.preventDefault();
      smoothScrollTo(target);
    });
  });

  /* =========================================================
     REVEAL ANIMATIONS WITH STAGGER
  ========================================================= */
  const revealEls = qsa(".reveal");

  const doRevealGroup = (els) => {
    els.forEach((el, i) => {
      setTimeout(() => el.classList.add("in"), i * CONFIG.staggerMs);
    });
  };

  if (!reduceMotion && "IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el     = entry.target;
        const parent = el.parentElement;
        if (parent) {
          const group = Array.from(parent.children).filter(
            (c) => c.classList && c.classList.contains("reveal")
          );
          if (group.length > 1) doRevealGroup(group);
          else el.classList.add("in");
        } else {
          el.classList.add("in");
        }
        obs.unobserve(el);
      });
    }, { threshold: CONFIG.revealThreshold });

    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* =========================================================
     HERO PARALLAX
  ========================================================= */
  const heroBg = qs(".hero-bg");

  const onScrollHero = rafThrottle(() => {
    if (!heroBg || reduceMotion) return;
    heroBg.style.transform = `translateY(${window.scrollY * CONFIG.heroParallaxFactor}px)`;
  });

  window.addEventListener("scroll", onScrollHero, { passive: true });
  onScrollHero();

  /* =========================================================
     BACK TO TOP
  ========================================================= */
  const toTop = qs("#toTop");

  const onScrollToTop = rafThrottle(() => {
    if (!toTop) return;
    toTop.classList.toggle("show", window.scrollY > CONFIG.toTopShowY);
  });

  window.addEventListener("scroll", onScrollToTop, { passive: true });
  onScrollToTop();

  if (toTop) {
    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* =========================================================
     ACTIVE NAV HIGHLIGHT
  ========================================================= */
  const setActiveLink = (id) => {
    if (!CONFIG.activeNav || !navMenu) return;
    qsa('a[href^="#"]', navMenu).forEach((a) => {
      const match = a.getAttribute("href") === `#${id}`;
      a.classList.toggle("active", match);
      a.setAttribute("aria-current", match ? "page" : "false");
    });
  };

  if (CONFIG.activeNav && "IntersectionObserver" in window) {
    const sectionIds = ["about", "services", "clinic", "location", "top"];
    const sections   = sectionIds.map((id) => qs(`#${id}`)).filter(Boolean);

    if (sections.length) {
      const navSpy = new IntersectionObserver((entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible && visible.target && visible.target.id) setActiveLink(visible.target.id);
      }, { root: null, threshold: [0.15, 0.25, 0.35, 0.5] });

      sections.forEach((s) => navSpy.observe(s));
    }
  }

  /* =========================================================
     LAZY LOAD IMAGES
  ========================================================= */
  if (CONFIG.lazyLoadImages) {
    qsa("img").forEach((img) => {
      if (!img.getAttribute("loading"))  img.setAttribute("loading", "lazy");
      if (!img.getAttribute("decoding")) img.setAttribute("decoding", "async");
    });
  }

  /* =========================================================
     BUTTON PRESS EFFECT
  ========================================================= */
  if (!reduceMotion) {
    const pressables = qsa(".btn, .pill, .mini-link, .footer-link, .topbar-call");
    pressables.forEach((el) => {
      el.addEventListener("pointerdown",  () => el.classList.add("is-pressed"));
      el.addEventListener("pointerup",    () => el.classList.remove("is-pressed"));
      el.addEventListener("pointercancel",() => el.classList.remove("is-pressed"));
      el.addEventListener("pointerleave", () => el.classList.remove("is-pressed"));
    });
  }

  /* =========================================================
     COMPARISON SLIDERS (multi-instance)
  ========================================================= */
  qsa("[data-cs]").forEach((slider) => {
    const afterWrap = slider.querySelector(".cs-after-wrap");
    const handle    = slider.querySelector(".cs-handle");
    if (!afterWrap || !handle) return;

    let dragging = false;

    const setPos = (clientX) => {
      const rect = slider.getBoundingClientRect();
      let pct = (clientX - rect.left) / rect.width;
      pct = Math.max(0.04, Math.min(0.96, pct));
      // clip-path: After image (right side) revealed as handle moves right
      // inset(top right bottom left): clip left portion = hide left of handle, show After on right
      afterWrap.style.clipPath = `inset(0 0 0 ${pct * 100}%)`;
      handle.style.left        = pct * 100 + "%";
    };
    // Set initial position to 50%
    afterWrap.style.clipPath = "inset(0 0 0 50%)";
    handle.style.left = "50%";

    slider.addEventListener("mousedown",  (e) => { dragging = true; setPos(e.clientX); e.preventDefault(); });
    window.addEventListener("mousemove",  (e) => { if (dragging) setPos(e.clientX); });
    window.addEventListener("mouseup",    ()  => { dragging = false; });
    slider.addEventListener("touchstart", (e) => { dragging = true; setPos(e.touches[0].clientX); }, { passive: true });
    window.addEventListener("touchmove",  (e) => { if (dragging) setPos(e.touches[0].clientX); }, { passive: true });
    window.addEventListener("touchend",   ()  => { dragging = false; });
  });

})();

/* ============================================================
   BILINGUAL / i18n SYSTEM
============================================================ */
(() => {
  "use strict";

  const TRANSLATIONS = {
    en: {
      "topbar":              "Sat – Thu\u00a0·\u00a0 10:00 – 19:00\u00a0·\u00a0 Marj El Hamam, Amman",
      "status-open":         "● Open Now",
      "status-closed":       "● Closed",
      "nav-doctor":          "The Doctor",
      "nav-services":        "Services",
      "nav-clinic":          "The Clinic",
      "nav-location":        "Location",
      "nav-cases":           "Cases",
      "hero-eyebrow":        "Marj El Hamam · Amman",
      "hero-h1":             "Dentist in Amman — Dr Mohammed Rahhal Dental Clinic",
      "hero-lead":           "Specialist endodontist and dental clinic in Marj El Hamam, Amman offering root canal treatment, cosmetic dentistry, crowns, and emergency dental care — delivered with precision, clarity, and long-term focus.",
      "cta-call":            "Call 079 745 7455",
      "cta-whatsapp":        "Book on WhatsApp",
      "trust-google-top":    "Google Reviews",
      "trust-google-bottom": "⭐ 5.0 · 47+ reviews",
      "trust-spec-top":      "Specialist",
      "trust-spec-bottom":   "Endodontist",
      "trust-urgent-top":    "Urgent Cases",
      "trust-urgent-bottom": "Same-Day Slots",
      "about-kicker":        "The Doctor",
      "about-h2":            "Clinical precision without shortcuts",
      "about-body":          'Dr Mohammed Rahhal is a <a href="#services" class="inline">Specialist Endodontist</a> focused on root canal treatment and complex endodontic cases — handled with the precision that only specialist training delivers.',
      "about-cred-title":    "Qualifications & Training",
      "about-cred-1":        "Clinical Masters in Endodontics — Jordan University of Science & Technology",
      "about-cred-2":        "Bachelor of Dental Surgery (BDS) — Jordan University of Science & Technology",
      "about-cred-3":        "Diploma of Primary Care Dentistry — Royal College of Surgeons in Ireland",
      "about-quote":         "\u201cMy priority is simple — relieve pain, protect the tooth, and do the work with the level of precision I would want for my own family.\u201d",
      "about-quote-footer":  "— Dr Mohammed Rahhal",
      "about-chip-1":        "Specialist Endodontics",
      "about-chip-2":        "Masters · JUST",
      "about-chip-3":        "Comfort-focused care",
      "about-note-title":    "What this means for you",
      "about-note-text":     "Better diagnostics, cleaner work, and a treatment plan that prioritizes saving your natural tooth whenever possible.",
      "why-kicker":          "Why choose us",
      "why-h2":              "Specialist-level care in a calm, modern clinic",
      "why-sub":             "Accurate dentistry, real comfort during treatment, and results that hold up long-term.",
      "why-1-h3":            "Specialist endodontics",
      "why-1-p":             "Advanced root canal care and complex cases handled with specialist training and precision instruments.",
      "why-2-h3":            "Precision first",
      "why-2-p":             "Meticulous attention to detail in every step — no shortcuts, no guesswork, no compromises.",
      "why-3-h3":            "Clear planning",
      "why-3-p":             "Options explained simply so you understand your case and choose what fits your goals and budget.",
      "tech-kicker":         "Advanced Endodontic Technology",
      "tech-h2":             "Precision tools for long-term success",
      "tech-body":           "We use a Warm Vertical Compaction system to ensure dense, three-dimensional root canal sealing — improving long-term stability and treatment success.",
      "tech-chip-1":         "3D Sealing",
      "tech-chip-2":         "Enhanced Stability",
      "tech-chip-3":         "Specialist-Level Precision",
      "services-kicker":     "Services",
      "services-h2":         "Comprehensive dental care in one clinic",
      "services-sub":        "From urgent pain relief to long-term smile health — all under one roof.",
      "services-banner":     '🚨 <strong>Complex Cases Welcome:</strong> Failed root canal? Persistent infection? Re-treatment cases accepted.',
      "s1-h3":               "Root Canal Treatment",
      "s1-desc":             "Pain-controlled, modern endodontic techniques for single and multi-rooted teeth. Specialist care at every step.",
      "s1-li1":              "Complex Case Retreatment",
      "s1-li2":              "MTA Plug Placement and Repairs",
      "s1-li3":              "Regenerative Endodontics and Trauma Management",
      "s1-li4":              "Apical Surgery and Intentional Reimplantation",
      "s2-h3":               "Crowns & Restorations",
      "s2-desc":             "Durable, natural-looking crowns designed to protect and restore your tooth after treatment.",
      "s2-li1":              "Full ceramic & zirconia crowns",
      "s2-li2":              "Natural appearance matching",
      "s2-li3":              "Post root canal reinforcement",
      "s2-li4":              "Long-lasting durable materials",
      "s4-h3":               "Orthodontics",
      "s4-desc":             "Straighten your teeth and correct your bite with modern orthodontic solutions tailored to your lifestyle.",
      "s4-li1":              "Traditional & clear braces",
      "s4-li2":              "Clear aligner therapy",
      "s4-li3":              "Bite correction & jaw alignment",
      "s4-li4":              "Retainers & post-treatment care",
      "s5-h3":               "Cosmetic Dentistry",
      "s5-desc":             "Transform your smile with aesthetic treatments that enhance shape, colour, and symmetry for a confident look.",
      "s5-li1":              "Porcelain veneers",
      "s5-li2":              "Smile design & makeovers",
      "s5-li3":              "Composite restorations",
      "s5-li4":              "Gum contouring",
      "s3-h3":               "Teeth Whitening",
      "s3-desc":             "Professional-grade whitening with safe protocols that protect your enamel while delivering real results.",
      "s3-li1":              "Professional-grade whitening gel",
      "s3-li2":              "Enamel-safe protocols",
      "s3-li3":              "In-clinic & take-home options",
      "s3-li4":              "Smile refinement planning",
      "cta-band-h3":         "Not sure what you need?",
      "cta-band-p":          "Describe your symptoms and we'll guide you to the right next step — no pressure, no commitment.",
      "cta-band-call":       "Call now",
      "cta-band-wa":         "WhatsApp",
      "transform-kicker":    "Smile Transformations",
      "transform-h2":        "Real results from real patients",
      "transform-cap1":      "Zirconia crowns · full smile rehabilitation",
      "transform-cap2":      "Alignment + cosmetic restoration",
      "transform-cap3":      "Decay removal + cosmetic rebuild",
      "before":              "Before",
      "after":               "After",
      "test-kicker":         "Patient trust",
      "test-h2":             "What patients say",
      "test-view-all":       "View all Google Reviews",
      "clinic-kicker":       "The Clinic",
      "clinic-h2":           "Modern environment, calm experience",
      "clinic-sub":          "A thoughtfully designed space built for comfort and clinical focus.",
      "clinic-cap1":         "Premium waiting lounge",
      "clinic-cap2":         "Reception & treatment area",
      "loc-kicker":          "Location",
      "loc-h2":              "Marj El Hamam, Amman",
      "loc-sub":             "Saturday to Thursday, 10:00 – 19:00",
      "loc-addr-label":      "Address",
      "loc-addr-value":      "Marj El Hamam, Amman, Jordan",
      "loc-addr-map":        "View on Google Maps",
      "loc-hours-label":     "Working Hours",
      "loc-hours-value":     "Sat – Thu, 10:00 – 19:00",
      "loc-hours-sub":       "Friday: Closed",
      "loc-phone-label":     "Phone",
      "loc-phone-sub":       "Call or WhatsApp",
      "loc-urgent-label":    "Urgent cases",
      "loc-urgent-value":    "Same-day evaluation",
      "loc-urgent-sub":      "Call immediately for priority slots",
      "loc-directions":      "📍 Get Directions on Google Maps",
      "social-kicker":       "Follow our work",
      "social-h2":           "See more transformations on Instagram",
      "social-sub":          "Before & afters, patient results, and clinic updates — all on Instagram.",
      "social-btn":          "Follow on Instagram",
      "social-btn-ig":       "Follow on Instagram",
      "social-btn-fb":       "Follow on Facebook",
      "final-h2":            "Ready to Book?",
      "final-p":             "Same-day emergency slots available.",
      "final-call":          "Call 079 745 7455",
      "final-wa":            "Message on WhatsApp",
      "footer-addr":         "Marj El Hamam, Amman, Jordan",
      "footer-hours":        "Sat – Thu\u00a0·\u00a0 10:00 – 19:00",
      "footer-desc":         "Specialist endodontic care — root canal treatment, crowns, whitening & urgent evaluations.",
      "footer-contact":      "Contact",
      "footer-call":         "📞 Call 0797457455",
      "footer-wa":           "💬 WhatsApp booking",
      "footer-ig":           "📸 Instagram",
      "footer-fb":           "📘 Facebook",
      "footer-links":        "Quick links",
      "footer-copy":         "© 2026 Dr Mohammed Rahhal Dental Clinic · All rights reserved",
      "mobile-call":         "📞 Call the Clinic Now",
      "mobile-call-call":    "Call Now",
      "mobile-call-wa":      "WhatsApp",
      "stat-rating":         "Google Rating",
      "stat-reviews":        "Verified Reviews",
      "stat-spec-num":       "Specialist",
      "stat-spec-label":     "Endodontist",
      "stat-same-num":       "Same Day",
      "stat-same-label":     "Emergency Slots",
      "lang-btn":            "عربي",
    },
    ar: {
      "topbar":              "السبت – الخميس\u00a0·\u00a0 ١٠:٠٠ – ١٩:٠٠\u00a0·\u00a0 مرج الحمام، عمّان",
      "status-open":         "● مفتوح الآن",
      "status-closed":       "● مغلق",
      "nav-doctor":          "الطبيب",
      "nav-services":        "الخدمات",
      "nav-clinic":          "العيادة",
      "nav-location":        "الموقع",
      "nav-cases":           "الحالات",
      "hero-eyebrow":        "مرج الحمام · عمّان",
      "hero-h1":             "طبيب أسنان في عمّان — عيادة د. محمد رحّال",
      "hero-lead":           "أخصائي علاج جذور الأسنان في مرج الحمام، عمّان — نقدّم علاج الجذور وتجميل الأسنان والتيجان وحالات الطوارئ بدقة عالية وتركيز على النتائج طويلة الأمد.",
      "cta-call":            "اتصل 079 745 7455",
      "cta-whatsapp":        "احجز عبر واتساب",
      "trust-google-top":    "تقييمات جوجل",
      "trust-google-bottom": "⭐ 5.0 · +47 تقييم",
      "trust-spec-top":      "أخصائي",
      "trust-spec-bottom":   "علاج الجذور",
      "trust-urgent-top":    "الطوارئ",
      "trust-urgent-bottom": "نفس اليوم",
      "about-kicker":        "الطبيب",
      "about-h2":            "دقة سريرية بلا تهاون",
      "about-body":          'د. محمد رحّال <a href="#services" class="inline">أخصائي علاج جذور الأسنان</a> متخصص في علاج الجذور والحالات المعقدة — بمستوى دقة لا يتوفر إلا مع التدريب التخصصي.',
      "about-cred-title":    "المؤهلات والتدريب",
      "about-cred-1":        "ماجستير سريري في علاج الجذور — جامعة العلوم والتكنولوجيا الأردنية",
      "about-cred-2":        "بكالوريوس طب وجراحة الأسنان — جامعة العلوم والتكنولوجيا الأردنية",
      "about-cred-3":        "دبلوم طب الأسنان الأولي — الكلية الملكية للجراحين في أيرلندا",
      "about-quote":         "\u201cأولويتي بسيطة — تخفيف الألم، وحماية السن، وتقديم العمل بمستوى الدقة الذي أرغبه لعائلتي.\u201d",
      "about-quote-footer":  "— د. محمد رحّال",
      "about-chip-1":        "أخصائي علاج الجذور",
      "about-chip-2":        "ماجستير · JUST",
      "about-chip-3":        "رعاية مريحة للمريض",
      "about-note-title":    "ماذا يعني هذا لك",
      "about-note-text":     "تشخيص أدق، عمل أنظف، وخطة علاجية تُولي الأولوية لإنقاذ سنّك الطبيعي كلما أمكن ذلك.",
      "why-kicker":          "لماذا تختارنا",
      "why-h2":              "رعاية متخصصة في عيادة هادئة وعصرية",
      "why-sub":             "طب أسنان دقيق، راحة حقيقية أثناء العلاج، ونتائج تدوم طويلاً.",
      "why-1-h3":            "أخصائي علاج الجذور",
      "why-1-p":             "رعاية متقدمة لقناة الجذر والحالات المعقدة بتدريب تخصصي وأدوات دقيقة.",
      "why-2-h3":            "الدقة أولاً",
      "why-2-p":             "اهتمام دقيق بكل خطوة — لا تنازلات، لا تخمينات، لا اختصارات.",
      "why-3-h3":            "تخطيط واضح",
      "why-3-p":             "خيارات تُشرح ببساطة حتى تفهم حالتك وتختار ما يناسب أهدافك وميزانيتك.",
      "tech-kicker":         "تقنية علاج الجذور المتقدمة",
      "tech-h2":             "أدوات دقيقة لنجاح طويل الأمد",
      "tech-body":           "نستخدم نظام الحشو الرأسي الحراري لضمان ختم ثلاثي الأبعاد كثيف لقناة الجذر — مما يُحسّن الاستقرار طويل الأمد ونجاح العلاج.",
      "tech-chip-1":         "ختم ثلاثي الأبعاد",
      "tech-chip-2":         "استقرار محسّن",
      "tech-chip-3":         "دقة على مستوى المتخصصين",
      "services-kicker":     "الخدمات",
      "services-h2":         "رعاية أسنان شاملة في عيادة واحدة",
      "services-sub":        "من تسكين الألم الفوري إلى صحة الابتسامة على المدى البعيد — كل شيء تحت سقف واحد.",
      "services-banner":     '🚨 <strong>الحالات المعقدة مرحب بها:</strong> فشل علاج جذور؟ عدوى متكررة؟ نقبل حالات إعادة العلاج.',
      "s1-h3":               "علاج قناة الجذر",
      "s1-desc":             "تقنيات تحكم في الألم وعلاج جذور حديث للأسنان أحادية ومتعددة الجذور. رعاية متخصصة في كل خطوة.",
      "s1-li1":              "إعادة علاج الحالات المعقدة",
      "s1-li2":              "إصلاح الانثقابات باستعمال الـ MTA",
      "s1-li3":              "إدارة رضوض الأسنان",
      "s1-li4":              "جراحة قمة الجذر وإعادة الزراعة المتعمدة",
      "s2-h3":               "التيجان والترميم",
      "s2-desc":             "تيجان متينة وذات مظهر طبيعي مصممة لحماية سنّك واستعادته بعد العلاج.",
      "s2-li1":              "تيجان سيراميك كاملة وزيركونيا",
      "s2-li2":              "مطابقة المظهر الطبيعي للأسنان",
      "s2-li3":              "تقوية ما بعد علاج الجذور",
      "s2-li4":              "مواد متينة وطويلة الأمد",
      "s4-h3":               "تقويم الأسنان",
      "s4-desc":             "قوّم أسنانك وصحّح إطباقك بأحدث الحلول التقويمية المناسبة لأسلوب حياتك.",
      "s4-li1":              "تقويم تقليدي وشفاف",
      "s4-li2":              "علاج بالمحاذيات الشفافة",
      "s4-li3":              "تصحيح العضة ومحاذاة الفك",
      "s4-li4":              "أجهزة الثبات والعناية بعد العلاج",
      "s5-h3":               "طب الأسنان التجميلي",
      "s5-desc":             "حوّل ابتسامتك بعلاجات جمالية تُحسّن الشكل واللون والتناسق لمظهر يملؤك ثقة.",
      "s5-li1":              "قشور البورسلين",
      "s5-li2":              "تصميم الابتسامة والتجديد الكامل",
      "s5-li3":              "حشوات تجميلية",
      "s5-li4":              "تشكيل اللثة",
      "s3-h3":               "تبييض الأسنان",
      "s3-desc":             "تبييض احترافي بطرق آمنة تحمي مينا أسنانك مع تحقيق نتائج حقيقية.",
      "s3-li1":              "جل تبييض احترافي",
      "s3-li2":              "بروتوكولات آمنة على المينا",
      "s3-li3":              "خيارات داخل العيادة والمنزل",
      "s3-li4":              "تخطيط تجميل الابتسامة",
      "cta-band-h3":         "لست متأكداً مما تحتاجه؟",
      "cta-band-p":          "صف أعراضك وسنوجهك للخطوة الصحيحة — دون ضغط أو التزام.",
      "cta-band-call":       "اتصل الآن",
      "cta-band-wa":         "واتساب",
      "transform-kicker":    "تحويلات الابتسامة",
      "transform-h2":        "نتائج حقيقية من مرضى حقيقيين",
      "transform-cap1":      "تيجان زيركونيا · تأهيل ابتسامة كامل",
      "transform-cap2":      "تقويم + ترميم تجميلي",
      "transform-cap3":      "إزالة التسوس + إعادة البناء التجميلي",
      "before":              "قبل",
      "after":               "بعد",
      "test-kicker":         "ثقة المرضى",
      "test-h2":             "ماذا يقول المرضى",
      "test-view-all":       "اقرأ جميع تقييمات جوجل",
      "clinic-kicker":       "العيادة",
      "clinic-h2":           "بيئة عصرية وتجربة هادئة",
      "clinic-sub":          "فضاء مُصمَّم بعناية للراحة والتركيز السريري.",
      "clinic-cap1":         "صالة انتظار فاخرة",
      "clinic-cap2":         "منطقة الاستقبال والعلاج",
      "loc-kicker":          "الموقع",
      "loc-h2":              "مرج الحمام، عمّان",
      "loc-sub":             "السبت إلى الخميس، ١٠:٠٠ – ١٩:٠٠",
      "loc-addr-label":      "العنوان",
      "loc-addr-value":      "مرج الحمام، عمّان، الأردن",
      "loc-addr-map":        "عرض على خرائط جوجل",
      "loc-hours-label":     "ساعات العمل",
      "loc-hours-value":     "السبت – الخميس، ١٠:٠٠ – ١٩:٠٠",
      "loc-hours-sub":       "الجمعة: مغلق",
      "loc-phone-label":     "الهاتف",
      "loc-phone-sub":       "اتصال أو واتساب",
      "loc-urgent-label":    "الحالات الطارئة",
      "loc-urgent-value":    "تقييم في نفس اليوم",
      "loc-urgent-sub":      "اتصل فوراً للحصول على أولوية",
      "loc-directions":      "📍 احصل على الاتجاهات عبر جوجل",
      "social-kicker":       "تابع أعمالنا",
      "social-h2":           "شاهد المزيد من التحولات على انستغرام",
      "social-sub":          "نتائج قبل وبعد، نتائج المرضى، وتحديثات العيادة — كل شيء على انستغرام.",
      "social-btn":          "تابعنا على انستغرام",
      "social-btn-ig":       "تابعنا على انستغرام",
      "social-btn-fb":       "تابعنا على فيسبوك",
      "final-h2":            "هل أنت مستعد للحجز؟",
      "final-p":             "مواعيد الطوارئ متاحة في نفس اليوم.",
      "final-call":          "اتصل 079 745 7455",
      "final-wa":            "أرسل رسالة عبر واتساب",
      "footer-addr":         "مرج الحمام، عمّان، الأردن",
      "footer-hours":        "السبت – الخميس\u00a0·\u00a0 ١٠:٠٠ – ١٩:٠٠",
      "footer-desc":         "رعاية متخصصة لعلاج الجذور — علاج الجذور، التيجان، التبييض وتقييمات الطوارئ.",
      "footer-contact":      "التواصل",
      "footer-call":         "📞 اتصل 0797457455",
      "footer-wa":           "💬 حجز عبر واتساب",
      "footer-ig":           "📸 انستغرام",
      "footer-fb":           "📘 فيسبوك",
      "footer-links":        "روابط سريعة",
      "footer-copy":         "© 2026 عيادة د. محمد رحّال للأسنان · جميع الحقوق محفوظة",
      "mobile-call":         "📞 اتصل بالعيادة الآن",
      "mobile-call-call":    "اتصل الآن",
      "mobile-call-wa":      "واتساب",
      "stat-rating":         "تقييم جوجل",
      "stat-reviews":        "تقييم موثّق",
      "stat-spec-num":       "أخصائي",
      "stat-spec-label":     "علاج الجذور",
      "stat-same-num":       "نفس اليوم",
      "stat-same-label":     "مواعيد الطوارئ",
      "lang-btn":            "EN",
    },
  };

  const html = document.documentElement;
  const langToggle = document.getElementById("langToggle");

  // Get saved lang or default to 'en'
  let currentLang = localStorage.getItem("dr-rahhal-lang") || "en";

  const applyLang = (lang) => {
    const t = TRANSLATIONS[lang];
    if (!t) return;

    // Set html attributes
    html.lang = lang;
    html.dir  = lang === "ar" ? "rtl" : "ltr";

    // Translate textContent
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (t[key] !== undefined) el.textContent = t[key];
    });

    // Translate innerHTML (for elements with embedded HTML)
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      if (t[key] !== undefined) el.innerHTML = t[key];
    });

    // Update WhatsApp hrefs
    document.querySelectorAll("[data-wa-en]").forEach((el) => {
      el.href = lang === "ar" ? el.getAttribute("data-wa-ar") : el.getAttribute("data-wa-en");
    });

    // Update lang toggle label
    if (langToggle) {
      langToggle.textContent = t["lang-btn"] || (lang === "ar" ? "EN" : "عربي");
    }

    // Update open/closed status badge text
    const badge = document.getElementById("statusBadge");
    if (badge) {
      const isOpen = badge.classList.contains("is-open");
      const isClosed = badge.classList.contains("is-closed");
      if (isOpen)   badge.textContent = t["status-open"]   || badge.textContent;
      if (isClosed) badge.textContent = t["status-closed"] || badge.textContent;
    }

    currentLang = lang;
    localStorage.setItem("dr-rahhal-lang", lang);
  };

  // Apply on load
  applyLang(currentLang);

  // Toggle on button click
  if (langToggle) {
    langToggle.addEventListener("click", () => {
      applyLang(currentLang === "en" ? "ar" : "en");
    });
  }

  // Re-apply status text after status badge updates
  const origUpdateStatus = window._updateStatus;
  if (origUpdateStatus) {
    const _orig = origUpdateStatus;
    window._updateStatus = () => {
      _orig();
      applyLang(currentLang);
    };
  }

})();

// assets/js/cases.js
(() => {
  "use strict";

  /* =========================================================
     CASES DATA (Single Source of Truth)
  ========================================================= */
  const casesData = {
    "ll6-endo-endo-crown": {
      title: "Root Canal Treatment and Endo Crown Lower Left First Molar",
      heroImage: "assets/img/cases/lower-left-first-molar/04-endo-crown.webp",
      icon: "🦷",
      excerpt:
        "Non surgical root canal therapy followed by adhesive endo crown restoration with 6 month follow up",

      content: `
        <p><strong>Tooth:</strong> Lower left first molar</p>
        <p><strong>Date of treatment:</strong> September 2025</p>
        <p><strong>Follow up:</strong> March 2026 6 month review</p>

        <h3>Initial Presentation</h3>
        <p>The patient presented with deep caries and symptomatic irreversible pulpitis affecting the lower left first molar. Clinical and radiographic evaluation confirmed the need for endodontic therapy.</p>

        <img src="assets/img/cases/lower-left-first-molar/01-isolation.webp" alt="Rubber dam isolation lower left first molar">

        <h3>Root Canal Treatment</h3>
        <p>Non surgical root canal treatment was performed under rubber dam isolation. Cleaning and shaping were completed followed by three dimensional obturation.</p>

        <img src="assets/img/cases/lower-left-first-molar/02-endo-access.webp" alt="Access cavity lower left first molar">
        <img src="assets/img/cases/lower-left-first-molar/03-post-endo.webp" alt="Post endodontic build up">

        <h3>Definitive Restoration Endo Crown</h3>
        <p>An adhesive endo crown was selected as the definitive restoration to preserve remaining tooth structure while ensuring functional durability and optimal occlusion.</p>

        <img src="assets/img/cases/lower-left-first-molar/04-endo-crown.webp" alt="Endo crown on lower left first molar">

        <h3>Radiographic Evaluation</h3>
        <p>Post operative radiograph demonstrates adequate obturation and apical seal.</p>

        <img src="assets/img/cases/lower-left-first-molar/05-xray.webp" alt="Post operative radiograph lower left first molar">

        <h3>Follow Up 6 Months</h3>
        <p>At 6 month review the tooth remained asymptomatic with normal function and healthy periapical status.</p>
      `,
    },
    "example case": 
        {
            title: "Example Title",
            heroImage: "assets/img/cases/smile-makeover-2026/hero.webp",
            icon: "✨",
            excerpt: "Exmaple Description",

            content: `
                <p><strong>Example Procedure:</strong> Smile makeover</p>

                <h3>Exmample Before</h3>
                <img src="assets/img/cases/smile-makeover-2026/before.webp" alt="Before smile">

                <h3>Exmample After</h3>
                <img src="assets/img/cases/smile-makeover-2026/after.webp" alt="After smile">

                <p>Exmample Final result.</p>
            `
        }
  };

  /* =========================================================
     CASES LIST PAGE
  ========================================================= */
  const grid = document.getElementById("casesGrid");

  if (grid) {
    const makeCardHTML = (id, data) => {
      const href = `cases-detail.html?id=${encodeURIComponent(id)}`;

      const media = data.heroImage
        ? `
          <div class="case-img">
            <img src="${data.heroImage}" alt="${data.title}" loading="lazy" decoding="async">
          </div>
        `
        : `
          <div class="case-img">${data.icon || "🦷"}</div>
        `;

      const excerpt = data.excerpt
        ? `<p class="case-excerpt">${data.excerpt}</p>`
        : "";

      return `
        <a class="case-card" href="${href}">
          ${media}
          <h2 class="case-title">${data.title}</h2>
          ${excerpt}
        </a>
      `;
    };

    const ids = Object.keys(casesData);

    grid.innerHTML = ids.length
      ? ids.map((id) => makeCardHTML(id, casesData[id])).join("")
      : "<p>No cases yet</p>";
  }

  /* =========================================================
     CASE DETAIL PAGE
  ========================================================= */
  const params = new URLSearchParams(window.location.search);
  const caseId = params.get("id");

  const titleEl = document.getElementById("articleTitle");
  const bodyEl = document.getElementById("articleBody");
  const heroWrap = document.getElementById("heroWrap");

  if (titleEl && bodyEl) {
    const caseData = caseId ? casesData[caseId] : null;

    if (caseData) {
      titleEl.textContent = caseData.title;
      bodyEl.innerHTML = caseData.content;

      if (caseData.heroImage && heroWrap) {
        const img = document.createElement("img");
        img.src = caseData.heroImage;
        img.className = "article-hero";
        img.alt = caseData.title;
        img.loading = "lazy";
        img.decoding = "async";

        heroWrap.replaceWith(img);
      }
    } else {
      titleEl.textContent = "Case Not Found";
      bodyEl.innerHTML = "<p>Please return to the cases page.</p>";
    }
  }

})();