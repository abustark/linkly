(function () {
    "use strict";

    const THEME_KEY = "linkly_theme";

    const THEME_TOGGLES = ["themeToggle", "sheetThemeToggle"];

    function setTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        THEME_TOGGLES.forEach((id) => {
            const t = document.getElementById(id);
            if (t) t.checked = theme === "dark";
        });
        const label = document.getElementById("themeLabel");
        if (label) label.textContent = theme === "dark" ? "Dark mode" : "Light mode";
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", theme === "dark" ? "#0a0f1c" : "#f4f7fb");
        try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    }

    function initTheme() {
        let theme = null;
        try { theme = localStorage.getItem(THEME_KEY); } catch (e) {}
        if (!theme) {
            theme = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
                ? "dark" : "light";
        }
        setTheme(theme);
        THEME_TOGGLES.forEach((id) => {
            const t = document.getElementById(id);
            if (t) t.addEventListener("change", () => setTheme(t.checked ? "dark" : "light"));
        });
    }

    let toastTimer = null;
    function showToast(msg) {
        const toast = document.getElementById("toast");
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add("show");
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function initials(name) {
        if (!name) return "?";
        const parts = String(name).trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function personIcon() {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("width", "18");
        svg.setAttribute("height", "18");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", "12");
        circle.setAttribute("cy", "8");
        circle.setAttribute("r", "4");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6");
        svg.appendChild(circle);
        svg.appendChild(path);
        return svg;
    }

    function renderAvatar(user) {
        const av = document.getElementById("avatarBtn");
        if (!av) return;
        av.innerHTML = "";
        if (user && user.photoURL) {
            const img = document.createElement("img");
            img.src = user.photoURL;
            img.alt = (user.displayName || user.email || "user");
            av.appendChild(img);
        } else if (user) {
            av.textContent = initials(user.displayName || user.email || "U");
        } else {
            av.appendChild(personIcon());
        }
    }

    // Google Sign-In initialization is idempotent: pages (and the auth state
    // callback) can call initGSI any number of times, in any order, without
    // racing or re-initializing. Buttons render only after initialization.
    let gsiInitialized = false;

    function initGSI(clientId, callback) {
        if (!window.google || !google.accounts || !google.accounts.id) return false;
        if (!gsiInitialized) {
            try {
                google.accounts.id.initialize({ client_id: clientId, callback: callback });
                gsiInitialized = true;
            } catch (e) {
                return false;
            }
        }
        renderGSI();
        return gsiInitialized;
    }

    // The size we ask Google for. Google keeps these numbers when it draws the
    // standard button, which lets us work out how much margin it added if it
    // falls back to drawing the button inside its own iframe.
    const GSI_W = 180;
    const GSI_H = 40;

    // Google can draw the button inside an accounts.google.com iframe that
    // paints a white margin around it - invisible on a light page, a bright
    // "box inside a box" on a dark one. Nothing inside that iframe can be
    // styled from here, so pin the container to the button box and shift the
    // iframe until only the button itself is inside the crop.
    function fitGSI(t) {
        const f = t.querySelector("iframe");
        if (!f) return;
        const fr = f.getBoundingClientRect();
        if (!fr.width || !fr.height) return; // plain button, nothing to crop
        const padX = (fr.width - GSI_W) / 2;
        const padY = (fr.height - GSI_H) / 2;
        // Crop a thin margin only; a much bigger frame is a different Google UI.
        if (padX < 0 || padY < 0 || padX > 24 || padY > 8) return;
        t.style.width = GSI_W + "px";
        t.style.height = GSI_H + "px";
        t.style.overflow = "hidden";
        if (!padX && !padY) return;
        const tr = t.getBoundingClientRect();
        const dx = fr.left - tr.left + padX;
        const dy = fr.top - tr.top + padY;
        f.style.transform = "translate(" + (-dx) + "px," + (-dy) + "px)";
    }

    // The iframe is injected asynchronously, so re-check while it settles.
    function scheduleGSIFit(t) {
        [0, 150, 500, 1200].forEach(function (delay) {
            setTimeout(function () { fitGSI(t); }, delay);
        });
    }

    function renderGSI() {
        if (!gsiInitialized || !window.google || !google.accounts || !google.accounts.id) return;
        const mobile = window.matchMedia("(max-width: 760px)").matches;
        const targets = [];
        const header = document.getElementById("gsi-button-container");
        const sheet = document.getElementById("gsi-sheet-container");
        const prompt = document.getElementById("gsi-prompt-container");
        const signin = document.getElementById("gsi-signin-container");
        const signinModal = document.getElementById("signinModal");
        if (!mobile && header) targets.push(header);
        if (mobile && sheet) targets.push(sheet);
        if (prompt && !prompt.hidden) targets.push(prompt);
        if (signin && signinModal && signinModal.classList.contains("open")) targets.push(signin);
        targets.forEach((t) => {
            if (t.getAttribute("data-gsi-rendered") === "1") return;
            // A container inside a hidden section renders nothing; leave it
            // unmarked so the next call (after the section is shown) retries.
            if (!t.offsetParent && t.id !== "gsi-button-container") return;
            try {
                // An explicit width keeps Google's plain standard button (the
                // "personalized" profile card is only offered at 200px and up).
                google.accounts.id.renderButton(t, { theme: "outline", size: "large", width: GSI_W });
                if (t.childElementCount > 0) {
                    t.setAttribute("data-gsi-rendered", "1");
                    scheduleGSIFit(t);
                }
            } catch (e) { /* render failed; a later call can retry */ }
        });
    }

    function openSheet() {
        const av = document.getElementById("avatarBtn");
        const b = document.getElementById("sheetBackdrop");
        const s = document.getElementById("profileSheet");
        if (av) av.setAttribute("aria-expanded", "true");
        if (s) {
            s.setAttribute("aria-modal", window.matchMedia("(max-width: 760px)").matches ? "true" : "false");
        }
        if (b) b.classList.add("open");
        if (s) s.classList.add("open");
        renderGSI();
        const firstItem = s && s.querySelector(".sheet-item");
        if (firstItem) firstItem.focus({ preventScroll: true });
    }

    function closeSheet() {
        const av = document.getElementById("avatarBtn");
        const b = document.getElementById("sheetBackdrop");
        const s = document.getElementById("profileSheet");
        const wasOpen = !!(s && s.classList.contains("open"));
        if (av) av.setAttribute("aria-expanded", "false");
        if (b) b.classList.remove("open");
        if (s) s.classList.remove("open");
        if (wasOpen && s && s.contains(document.activeElement) && av) {
            av.focus({ preventScroll: true });
        }
    }

    function wireProfileMenu() {
        const av = document.getElementById("avatarBtn");
        const b = document.getElementById("sheetBackdrop");
        if (av) {
            av.setAttribute("aria-haspopup", "true");
            av.setAttribute("aria-expanded", "false");
            av.addEventListener("click", openSheet);
        }
        if (b) b.addEventListener("click", closeSheet);
        const closeBtns = document.querySelectorAll("[data-close-sheet]");
        closeBtns.forEach((el) => el.addEventListener("click", closeSheet));
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") { closeSheet(); return; }
            if (e.key !== "Tab") return;
            const s = document.getElementById("profileSheet");
            if (!s || !s.classList.contains("open")) return;
            // Only the mobile bottom sheet is modal; the desktop dropdown is not.
            if (!window.matchMedia("(max-width: 760px)").matches) return;
            const focusables = Array.from(
                s.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")
            ).filter((el) => el.offsetParent !== null);
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            } else if (!s.contains(document.activeElement)) {
                e.preventDefault();
                first.focus();
            }
        });
    }

    function setYear() {
        const y = document.getElementById("year");
        if (y) y.textContent = new Date().getFullYear();
    }

    // Light haptic tick on interactive elements. navigator.vibrate is
    // Android/Chromium-only (iOS Safari ignores it) — silent no-op elsewhere.
    function haptic(pattern) {
        if (!navigator.vibrate) return;
        try { navigator.vibrate(pattern); } catch (e) {}
    }

    function wireHaptics() {
        document.addEventListener("click", (e) => {
            const el = e.target.closest(
                "button, a[href], [role='button'], label, select, input[type='checkbox'], input[type='radio']"
            );
            if (!el) return;
            if (el.matches("input")) { haptic(6); return; }
            if (el.classList.contains("btn-danger") || el.classList.contains("del") || el.classList.contains("logout")) {
                haptic([10, 25, 10]);
                return;
            }
            if (el.classList.contains("btn-primary") || el.matches("button[type='submit']")) { haptic(16); return; }
            haptic(8);
        });
    }

    window.Linkly = {
        initTheme, setTheme, showToast, renderAvatar, renderGSI, initGSI,
        openSheet, closeSheet, wireProfileMenu, setYear, initials, escapeHtml, haptic
    };

    document.addEventListener("DOMContentLoaded", function () {
        initTheme();
        wireProfileMenu();
        wireHaptics();
        setYear();
        // App-shell/offline support; a no-op where service workers aren't available.
        if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
            navigator.serviceWorker.register("/sw.js").catch(function () { /* ignore */ });
        }
    });
})();
