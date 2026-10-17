// LawFlow Dedicated Clerk Management Hub Controller

const ClerkApp = {
    currentUser: null,
    previewCaseId: null,

    init() {
        ClerkApp.checkAuth();
        ClerkApp.hookAppEvents();
    },

    checkAuth() {
        const stored = sessionStorage.getItem('lawflow_clerk_user');
        const authModal = document.getElementById('auth-modal');
        const userDisplay = document.getElementById('clerk-user-display');

        if (stored) {
            try {
                ClerkApp.currentUser = JSON.parse(stored);
                if (authModal) authModal.classList.remove('active');
                if (userDisplay && ClerkApp.currentUser) {
                    userDisplay.innerText = `Authenticated: ${ClerkApp.currentUser.name} (${ClerkApp.currentUser.email})`;
                }
                return true;
            } catch (e) {
                sessionStorage.removeItem('lawflow_clerk_user');
            }
        }

        // Show login modal if not authenticated
        if (authModal) authModal.classList.add('active');
        return false;
    },

    async handleLogin(e) {
        if (e) e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();
        const submitBtn = document.getElementById('login-submit-btn');

        if (submitBtn) {
            submitBtn.innerText = 'Verifying Registry Credentials...';
            submitBtn.disabled = true;
        }

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                ClerkApp.currentUser = data.user;
                sessionStorage.setItem('lawflow_clerk_user', JSON.stringify(data.user));

                const authModal = document.getElementById('auth-modal');
                if (authModal) authModal.classList.remove('active');

                const userDisplay = document.getElementById('clerk-user-display');
                if (userDisplay) {
                    userDisplay.innerText = `Authenticated: ${data.user.name} (${data.user.email})`;
                }

                if (window.App) {
                    App.showToast(`Welcome, ${data.user.name}! Judicial session authorized.`, 'success');
                    await App.loadCases();
                    await App.loadAnalytics();
                }
            } else {
                if (window.App) {
                    App.showToast(data.detail || 'Authentication failed. Please check credentials.', 'error');
                } else {
                    alert(data.detail || 'Authentication failed');
                }
            }
        } catch (err) {
            console.error('Login error:', err);
            if (window.App) App.showToast('Authentication server error', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.innerText = 'Authenticate Session ⚡';
                submitBtn.disabled = false;
            }
        }
    },

    quickLogin(email, password) {
        const emailEl = document.getElementById('login-email');
        const passEl = document.getElementById('login-password');
        if (emailEl) emailEl.value = email;
        if (passEl) passEl.value = password;
        ClerkApp.handleLogin();
    },

    logout() {
        sessionStorage.removeItem('lawflow_clerk_user');
        ClerkApp.currentUser = null;
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.classList.add('active');
        if (window.App) App.showToast('Logged out of Court Registry', 'info');
    },

    async openEmailPreviewModal(caseId) {
        ClerkApp.previewCaseId = caseId;
        const modal = document.getElementById('email-preview-modal');
        const subjectEl = document.getElementById('email-preview-subject');
        const bodyEl = document.getElementById('email-preview-body');
        const dispatchBtn = document.getElementById('email-preview-dispatch-btn');

        if (!modal || !bodyEl) return;

        modal.classList.add('active');
        if (subjectEl) subjectEl.innerText = 'Drafting Official Notice with Groq AI...';
        bodyEl.innerHTML = `
            <div class="p-8 text-center text-slate-400 space-y-3">
                <div class="inline-block animate-spin text-2xl">⏳</div>
                <div class="text-sm font-semibold text-slate-200">AI Legal Correspondence Drafter is compiling summons...</div>
                <div class="text-xs text-slate-500 font-mono">Official Court Sender: 241908@students.au.edu.pk</div>
            </div>
        `;

        if (dispatchBtn) {
            dispatchBtn.disabled = true;
            dispatchBtn.innerText = 'Preparing Draft...';
        }

        try {
            const res = await fetch(`/api/cases/${caseId}/ai-email-preview`, { method: 'POST' });
            const data = await res.json();

            if (res.ok && data.status === 'success' && data.email_draft) {
                const draft = data.email_draft;
                if (subjectEl) subjectEl.innerText = draft.subject || 'Official Legal Summons';

                bodyEl.innerHTML = `
                    <div class="space-y-4">
                        <!-- Email Header Meta -->
                        <div class="bg-slate-900/90 p-3.5 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
                            <div class="flex justify-between items-center text-blue-400">
                                <span><strong>From:</strong> 241908@students.au.edu.pk (Capital Territory Judicial Registry)</span>
                                <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-sans text-[10px] font-bold">DKIM Signed</span>
                            </div>
                            <div class="text-slate-300"><strong>Subject:</strong> ${draft.subject}</div>
                            <div class="text-slate-400"><strong>AI Model:</strong> Groq LPU Ultra-Low Latency Inference &bull; Judicial Rule 12 Compliant</div>
                        </div>

                        <!-- Rendered Court Email -->
                        <div class="rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl">
                            ${draft.full_html_body ? draft.full_html_body : `<pre class="p-4 text-slate-300 font-mono text-xs whitespace-pre-wrap">${draft.full_plain_text}</pre>`}
                        </div>

                        <!-- Key Enforcement Notice -->
                        <div class="p-3 bg-rose-950/30 border border-rose-800/40 rounded-lg text-[11px] text-rose-300 flex items-start gap-2">
                            <span>⚖️</span>
                            <span><strong>Statutory 72h Warning:</strong> This correspondence formally establishes proof-of-dispatch. Respondent acknowledgment via 2FA halts automated bench warrant generation.</span>
                        </div>
                    </div>
                `;

                if (dispatchBtn) {
                    dispatchBtn.disabled = false;
                    dispatchBtn.innerText = 'Approve & Send Live Official Email ⚡';
                    dispatchBtn.onclick = () => ClerkApp.approveFromPreview(caseId);
                }
            } else {
                bodyEl.innerHTML = `<div class="p-4 text-rose-400 text-xs">Failed to generate AI email preview: ${data.detail || 'Unknown error'}</div>`;
            }
        } catch (err) {
            console.error('Email preview error:', err);
            bodyEl.innerHTML = `<div class="p-4 text-rose-400 text-xs">Network error fetching email preview.</div>`;
        }
    },

    closeEmailPreviewModal() {
        const modal = document.getElementById('email-preview-modal');
        if (modal) modal.classList.remove('active');
        ClerkApp.previewCaseId = null;
    },

    async approveFromPreview(caseId) {
        ClerkApp.closeEmailPreviewModal();
        if (window.App && typeof window.App.approveGate1 === 'function') {
            await window.App.approveGate1(caseId);
        }
    },

    hookAppEvents() {
        // Enhance App.renderActionBanners to provide direct email preview button
        if (window.App) {
            const originalRenderBanners = App.renderActionBanners;
            App.renderActionBanners = function() {
                originalRenderBanners.apply(App, arguments);
                const gate1Container = document.getElementById('gate1-action-banner');
                if (gate1Container) {
                    const gate1Cases = App.cases.filter(c => c.status === 'PENDING_CLERK_APPROVAL');
                    if (gate1Cases.length > 0) {
                        const target = gate1Cases[0];
                        const btnGroup = gate1Container.querySelector('.flex.items-center.gap-2');
                        if (btnGroup && !document.getElementById('gate1-preview-email-btn')) {
                            const previewBtn = document.createElement('button');
                            previewBtn.id = 'gate1-preview-email-btn';
                            previewBtn.className = 'btn-ghost text-xs border border-blue-500/40 text-blue-300 hover:bg-blue-600/20';
                            previewBtn.innerHTML = '✉️ Preview AI Court Email (241908@students.au.edu.pk)';
                            previewBtn.onclick = () => ClerkApp.openEmailPreviewModal(target.id);
                            btnGroup.insertBefore(previewBtn, btnGroup.children[1]);
                        }
                    }
                }
            };
        }
    }
};

window.addEventListener('DOMContentLoaded', () => {
    ClerkApp.init();
});
