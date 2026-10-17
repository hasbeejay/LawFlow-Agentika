// LawFlow Judicial Theme Controller (Light Mode & Dark Mode)
// Provides professional, dignified legal palette switching across all court portals

const LawFlowTheme = {
    STORAGE_KEY: 'lawflow_theme',

    init() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        // Default to dark mode for evening or respect user's saved choice
        const theme = saved || 'dark';
        this.applyTheme(theme);
    },

    toggle() {
        const current = document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
        const next = current === 'light' ? 'dark' : 'light';
        this.applyTheme(next);
    },

    applyTheme(theme) {
        if (theme === 'light') {
            document.documentElement.classList.add('theme-light');
            document.documentElement.classList.remove('theme-dark');
            if (document.body) {
                document.body.classList.add('theme-light');
                document.body.classList.remove('theme-dark');
            }
        } else {
            document.documentElement.classList.remove('theme-light');
            document.documentElement.classList.add('theme-dark');
            if (document.body) {
                document.body.classList.remove('theme-light');
                document.body.classList.add('theme-dark');
            }
        }

        localStorage.setItem(this.STORAGE_KEY, theme);
        this.updateButtons(theme);

        // Notify any active canvas/3D scenes
        window.dispatchEvent(new CustomEvent('lawflow-theme-changed', { detail: { theme } }));
    },

    updateButtons(theme) {
        const btns = document.querySelectorAll('.theme-toggle-btn');
        btns.forEach(btn => {
            if (theme === 'light') {
                btn.innerHTML = '<span>🌙</span> <span class="hidden sm:inline">Dark Mode</span>';
                btn.setAttribute('title', 'Switch to Executive Dark Mode');
            } else {
                btn.innerHTML = '<span>☀️</span> <span class="hidden sm:inline">Light Mode</span>';
                btn.setAttribute('title', 'Switch to Clean Judicial Light Mode');
            }
        });
    }
};

// Immediate execution before DOM paint to prevent flash
(function() {
    const saved = localStorage.getItem('lawflow_theme');
    if (saved === 'light') {
        document.documentElement.classList.add('theme-light');
    } else {
        document.documentElement.classList.add('theme-dark');
    }
})();

window.addEventListener('DOMContentLoaded', () => {
    LawFlowTheme.init();
});
