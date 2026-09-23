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

    function renderGSI() {
        if (!gsiInitialized || !window.google || !google.accounts || !google.accounts.id) return;
        const mobile = window.matchMedia("(max-width: 760px)").matches;
        const targets = [];
        const header = document.getElementById("gsi-button-container");
        const sheet = document.getElementById("gsi-sheet-container");
        const prompt = document.getElementById("gsi-prompt-container");
        if (!mobile && header) targets.push(header);
        if (mobile && sheet) targets.push(sheet);
        if (prompt && !prompt.hidden) targets.push(prompt);
        targets.forEach((t) => {
            if (t.getAttribute("data-gsi-rendered") === "1") return;
            try {
                google.accounts.id.renderButton(t, { theme: "outline", size: "large" });
                t.setAttribute("data-gsi-rendered", "1");
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

    window.Linkly = {
        initTheme, setTheme, showToast, renderAvatar, renderGSI, initGSI,
        openSheet, closeSheet, wireProfileMenu, setYear, initials, escapeHtml
    };

    document.addEventListener("DOMContentLoaded", function () {
        initTheme();
        wireProfileMenu();
        setYear();
        // App-shell/offline support; a no-op where service workers aren't available.
        if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
            navigator.serviceWorker.register("/sw.js").catch(function () { /* ignore */ });
        }
    });
})();
