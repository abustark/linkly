/* Linkly shared client behavior: theme, toast, avatar, profile sheet */
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
        try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    }

    function initTheme() {
        let theme = "light";
        try { theme = localStorage.getItem(THEME_KEY) || "light"; } catch (e) {}
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

    let gsiRendered = false;
    function renderGSI() {
        if (gsiRendered) return;
        if (!window.google || !google.accounts) return;
        const mobile = window.matchMedia("(max-width: 760px)").matches;
        const target = document.getElementById(mobile ? "gsi-sheet-container" : "gsi-button-container");
        if (!target) return;
        google.accounts.id.renderButton(target, { theme: "outline", size: "large" });
        gsiRendered = true;
    }

    function openSheet() {
        const b = document.getElementById("sheetBackdrop");
        const s = document.getElementById("profileSheet");
        if (b) b.classList.add("open");
        if (s) s.classList.add("open");
        renderGSI();
    }
    function closeSheet() {
        const b = document.getElementById("sheetBackdrop");
        const s = document.getElementById("profileSheet");
        if (b) b.classList.remove("open");
        if (s) s.classList.remove("open");
    }

    function wireProfileMenu() {
        const av = document.getElementById("avatarBtn");
        const b = document.getElementById("sheetBackdrop");
        if (av) av.addEventListener("click", openSheet);
        if (b) b.addEventListener("click", closeSheet);
        const closeBtns = document.querySelectorAll("[data-close-sheet]");
        closeBtns.forEach((el) => el.addEventListener("click", closeSheet));
        document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
    }

    function setYear() {
        const y = document.getElementById("year");
        if (y) y.textContent = new Date().getFullYear();
    }

    window.Linkly = {
        initTheme, setTheme, showToast, renderAvatar, renderGSI,
        openSheet, closeSheet, wireProfileMenu, setYear, initials, escapeHtml
    };

    document.addEventListener("DOMContentLoaded", function () {
        initTheme();
        wireProfileMenu();
        setYear();
    });
})();
