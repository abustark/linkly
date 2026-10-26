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

    // Sign in with Google.
    //
    // Google's own button widget draws itself inside an accounts.google.com
    // iframe for some accounts, and that iframe paints a white card around the
    // button - a "box inside a box" on dark pages that cannot be styled away.
    // So we draw the button ourselves (same label, same G mark) and use
    // Google's OAuth popup instead: it returns an access token that Firebase
    // accepts exactly like the ID token the widget used to hand us. Nothing
    // Google draws lands inside the page any more.
    const GOOGLE_G_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
        '<path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>' +
        '<path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>' +
        '<path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.219,0-9.559-3.397-11.28-7.962l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>' +
        '<path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.99,35.59,44,29.89,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>' +
        '</svg>';

    let tokenClient = null;
    let oneTapReady = false;
    let googleClientId = null;
    let googleCallback = null;

    function googleButton() {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-google";
        btn.innerHTML = GOOGLE_G_SVG + "<span>Sign in with Google</span>";
        btn.addEventListener("click", startGoogleSignIn);
        return btn;
    }

    function startGoogleSignIn() {
        // The client is rebuilt on demand: after a sign-out Google's script can
        // lose its init state, and a stale client would silently do nothing.
        if (!tokenClient && googleClientId) initGSI(googleClientId, googleCallback);
        if (!tokenClient) {
            showToast("Google sign-in is still loading - try again in a second.");
            return;
        }
        try {
            // Must stay synchronous inside the click, or the browser blocks the
            // popup window Google opens.
            tokenClient.requestAccessToken();
        } catch (e) {
            showToast("Google sign-in failed");
        }
    }

    // Idempotent: pages and the auth-state callback can call this any number of
    // times, in any order, without racing or re-initializing.
    function initGSI(clientId, callback) {
        if (clientId) googleClientId = clientId;
        if (callback) googleCallback = callback;
        if (!window.google || !google.accounts) return false;
        if (!tokenClient && google.accounts.oauth2) {
            try {
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: googleClientId,
                    scope: "openid email profile",
                    callback: function (resp) {
                        if (!googleCallback) return;
                        if (resp && (resp.access_token || resp.credential)) googleCallback(resp);
                        else googleCallback({ error: (resp && resp.error) || "google_signin_failed" });
                    }
                });
            } catch (e) { tokenClient = null; }
        }
        // One Tap still works for returning users; it only reads the profile.
        if (!oneTapReady && google.accounts.id) {
            try {
                google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: function (resp) { if (googleCallback) googleCallback(resp); }
                });
                oneTapReady = true;
            } catch (e) { /* ignore: the button does not depend on it */ }
        }
        renderGSI();
        return !!tokenClient;
    }

    function renderGSI() {
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
            t.innerHTML = "";
            t.appendChild(googleButton());
            t.setAttribute("data-gsi-rendered", "1");
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
