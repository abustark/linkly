/* Linkly shared client behavior: theme, toast, avatar, profile sheet */
(function () {
    "use strict";

    const THEME_KEY = "linkly_theme";

    function setTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        const t = document.getElementById("themeToggle");
        if (t) t.checked = theme === "dark";
        try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    }

    function initTheme() {
        let theme = "light";
        try { theme = localStorage.getItem(THEME_KEY) || "light"; } catch (e) {}
        setTheme(theme);
        const t = document.getElementById("themeToggle");
        if (t) t.addEventListener("change", () => setTheme(t.checked ? "dark" : "light"));
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

    function initials(name) {
        if (!name) return "?";
        const parts = String(name).trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
            av.textContent = "?";
        }
    }

    function openSheet() {
        const b = document.getElementById("sheetBackdrop");
        const s = document.getElementById("profileSheet");
        if (b) b.classList.add("open");
        if (s) s.classList.add("open");
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
        initTheme, setTheme, showToast, renderAvatar,
        openSheet, closeSheet, wireProfileMenu, setYear, initials
    };

    document.addEventListener("DOMContentLoaded", function () {
        initTheme();
        wireProfileMenu();
        setYear();
    });
})();
