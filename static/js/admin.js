// LawFlow Police-Admin Controller & Clerk Account Management

const AdminApp = {
    currentUser: null,
    clerks: [],
    warrants: [],

    init() {
        AdminApp.checkAuth();
    },

    checkAuth() {
        const stored = sessionStorage.getItem('lawflow_admin_user');
        const modal = document.getElementById('admin-auth-modal');
        const userDisplay = document.getElementById('admin-user-display');

        if (stored) {
            try {
                const user = JSON.parse(stored);
                if (user.role === 'ADMIN') {
                    AdminApp.currentUser = user;
                    if (modal) modal.classList.remove('active');
                    if (userDisplay) {
                        userDisplay.innerText = `Authenticated: ${user.name} (${user.email}) — Supervisor`;
                    }
                    AdminApp.loadClerks();
                    AdminApp.loadWarrants();
                    return true;
                }
            } catch (e) {
                sessionStorage.removeItem('lawflow_admin_user');
            }
        }

        if (modal) modal.classList.add('active');
        return false;
    },

    async handleLogin(e) {
        if (e) e.preventDefault();
        const email = document.getElementById('admin-login-email').value.trim();
        const password = document.getElementById('admin-login-password').value.trim();
        const submitBtn = document.getElementById('admin-login-btn');

        if (submitBtn) {
            submitBtn.innerText = 'Verifying Administrative Signature...';
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
                if (data.user.role !== 'ADMIN') {
                    AdminApp.showToast('Access Denied: Requires ADMIN executive credentials.', 'error');
                    return;
                }

                AdminApp.currentUser = data.user;
                sessionStorage.setItem('lawflow_admin_user', JSON.stringify(data.user));

                const modal = document.getElementById('admin-auth-modal');
                if (modal) modal.classList.remove('active');

                const userDisplay = document.getElementById('admin-user-display');
                if (userDisplay) {
                    userDisplay.innerText = `Authenticated: ${data.user.name} (${data.user.email}) — Supervisor`;
                }

                AdminApp.showToast(`Administrative session confirmed for ${data.user.name}.`, 'success');
                await AdminApp.loadClerks();
                await AdminApp.loadWarrants();
            } else {
                AdminApp.showToast(data.detail || 'Authentication failed. Check admin credentials.', 'error');
            }
        } catch (err) {
            console.error('Admin login error:', err);
            AdminApp.showToast('Network error authenticating admin.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.innerText = 'Authenticate Secure Police-Admin Console ⚡';
                submitBtn.disabled = false;
            }
        }
    },

    logout() {
        sessionStorage.removeItem('lawflow_admin_user');
        AdminApp.currentUser = null;
        const modal = document.getElementById('admin-auth-modal');
        if (modal) modal.classList.add('active');
        AdminApp.showToast('Logged out of Police-Admin Console', 'info');
    },

    switchTab(tab) {
        const sections = {
            clerks: document.getElementById('section-clerks'),
            warrants: document.getElementById('section-warrants'),
            telemetry: document.getElementById('section-telemetry')
        };
        const buttons = {
            clerks: document.getElementById('tab-btn-clerks'),
            warrants: document.getElementById('tab-btn-warrants'),
            telemetry: document.getElementById('tab-btn-telemetry')
        };

        Object.keys(sections).forEach(k => {
            if (sections[k]) {
                if (k === tab) {
                    sections[k].classList.remove('hidden');
                } else {
                    sections[k].classList.add('hidden');
                }
            }
            if (buttons[k]) {
                if (k === tab) {
                    buttons[k].className = 'px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/40 transition';
                } else {
                    buttons[k].className = 'px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition';
                }
            }
        });

        if (tab === 'clerks') AdminApp.loadClerks();
        if (tab === 'warrants') AdminApp.loadWarrants();
    },

    async loadClerks() {
        try {
            const res = await fetch('/api/admin/clerks');
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                AdminApp.clerks = data.clerks;
                const metricEl = document.getElementById('metric-clerks-count');
                if (metricEl) metricEl.innerText = data.clerks.filter(c => c.is_active).length;
                AdminApp.renderClerksTable();
            }
        } catch (e) {
            console.error('Failed to load clerks:', e);
        }
    },

    renderClerksTable() {
        const tbody = document.getElementById('clerks-table-body');
        if (!tbody) return;

        if (AdminApp.clerks.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500">No clerk accounts registered in registry database.</td></tr>`;
            return;
        }

        tbody.innerHTML = AdminApp.clerks.map(c => {
            const isActive = Boolean(c.is_active);
            const statusBadge = isActive
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Active</span>`
                : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">Suspended</span>`;

            const roleBadge = c.role === 'ADMIN'
                ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">Judicial Supervisor</span>`
                : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Registry Clerk</span>`;

            const toggleBtnText = isActive ? 'Suspend Account' : 'Reactivate';
            const toggleBtnClass = isActive
                ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40'
                : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/40';

            const formattedDate = c.created_at ? (typeof c.created_at === 'number' ? new Date(c.created_at * 1000).toLocaleDateString() : c.created_at) : '2026-10-16';

            return `
                <tr class="border-b border-slate-800 hover:bg-slate-900/50 transition">
                    <td class="py-3 px-3 font-mono text-slate-400">#${c.id}</td>
                    <td class="py-3 px-3">
                        <div class="font-semibold text-white">${c.full_name || c.name || 'Court Officer'}</div>
                        <div class="text-[10px] text-slate-400">${c.department || 'Registry'}</div>
                    </td>
                    <td class="py-3 px-3 font-mono text-blue-400">${c.email}</td>
                    <td class="py-3 px-3">${roleBadge}</td>
                    <td class="py-3 px-3">${statusBadge}</td>
                    <td class="py-3 px-3 text-slate-400 font-mono text-[11px]">${formattedDate}</td>
                    <td class="py-3 px-3 text-right">
                        <button onclick="AdminApp.toggleClerkStatus('${c.id}')" class="px-2.5 py-1 rounded text-[11px] font-semibold transition ${toggleBtnClass}">
                            ${toggleBtnText}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    openNewClerkModal() {
        const modal = document.getElementById('new-clerk-modal');
        if (modal) modal.classList.add('active');
    },

    closeNewClerkModal() {
        const modal = document.getElementById('new-clerk-modal');
        if (modal) modal.classList.remove('active');
    },

    async submitNewClerk(e) {
        e.preventDefault();
        const name = document.getElementById('new-clerk-name').value.trim();
        const email = document.getElementById('new-clerk-email').value.trim();
        const password = document.getElementById('new-clerk-password').value.trim();
        const department = document.getElementById('new-clerk-department') ? document.getElementById('new-clerk-department').value : 'Central Judicial Intake & Case Management';
        const role = document.getElementById('new-clerk-role').value;
        const btn = document.getElementById('new-clerk-submit-btn');

        if (btn) {
            btn.innerText = 'Provisioning in Judicial Registry...';
            btn.disabled = true;
        }

        try {
            const res = await fetch('/api/admin/clerks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: name, email, password, department })
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                AdminApp.showToast(`New clerk account created for ${name} (${email})!`, 'success');
                AdminApp.closeNewClerkModal();
                document.getElementById('new-clerk-name').value = '';
                document.getElementById('new-clerk-email').value = '';
                document.getElementById('new-clerk-password').value = '';
                await AdminApp.loadClerks();
            } else {
                AdminApp.showToast(data.detail || 'Failed to create clerk account.', 'error');
            }
        } catch (err) {
            console.error('Create clerk error:', err);
            AdminApp.showToast('Network error creating clerk.', 'error');
        } finally {
            if (btn) {
                btn.innerText = 'Provision Account ⚡';
                btn.disabled = false;
            }
        }
    },

    async toggleClerkStatus(clerkId) {
        try {
            const res = await fetch(`/api/admin/clerks/${clerkId}/toggle-status`, { method: 'POST' });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                AdminApp.showToast(`Clerk account status updated to ${data.is_active ? 'ACTIVE' : 'SUSPENDED'}.`, 'info');
                await AdminApp.loadClerks();
            } else {
                AdminApp.showToast(data.detail || 'Failed to toggle clerk status', 'error');
            }
        } catch (err) {
            console.error('Toggle status error:', err);
            AdminApp.showToast('Network error toggling clerk status', 'error');
        }
    },

    async loadWarrants() {
        try {
            const res = await fetch('/api/admin/warrants');
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                AdminApp.warrants = data.cases;
                const metricEl = document.getElementById('metric-warrants-count');
                if (metricEl) metricEl.innerText = data.warrants_count;
                AdminApp.renderWarrantsTable();
            }
        } catch (e) {
            console.error('Failed to load warrants:', e);
        }
    },

    renderWarrantsTable() {
        const tbody = document.getElementById('warrants-table-body');
        if (!tbody) return;

        if (AdminApp.warrants.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500">No cases currently defaulted at 72h. All summons verified.</td></tr>`;
            return;
        }

        tbody.innerHTML = AdminApp.warrants.map(w => {
            const packet = w.police_packet || {};
            const warrantCode = packet.warrant_code || `BW-2026-${w.id.replace('CASE-', '')}`;
            const precinct = packet.assigned_precinct || 'Station 04 - Margalla Police';
            const bail = packet.bail_set || 'PKR 50,000';

            const statusBadge = w.status === 'POLICE_REFERRAL_DISPATCHED'
                ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">Physical Arrest Warrant Issued</span>`
                : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">72h Default (Awaiting Gate 2)</span>`;

            return `
                <tr class="border-b border-slate-800 hover:bg-slate-900/50 transition">
                    <td class="py-3 px-3 font-mono font-bold text-rose-400">${warrantCode}</td>
                    <td class="py-3 px-3">
                        <div class="font-semibold text-white">${w.title}</div>
                        <div class="text-[11px] text-slate-400 font-mono">${w.id} &bull; ${w.case_type}</div>
                    </td>
                    <td class="py-3 px-3">
                        <div class="font-medium text-slate-200">${w.respondent_name}</div>
                        <div class="text-[11px] text-slate-400 font-mono">CNIC: ****${w.respondent_national_id_last4} &bull; ${w.respondent_phone}</div>
                    </td>
                    <td class="py-3 px-3 text-slate-300 font-mono text-[11px]">${precinct}</td>
                    <td class="py-3 px-3 text-amber-300 font-mono font-bold">${bail}</td>
                    <td class="py-3 px-3">${statusBadge}</td>
                    <td class="py-3 px-3 text-right">
                        <a href="/verify?token=${w.token}" target="_blank" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition inline-block">
                            View Summons 📱
                        </a>
                    </td>
                </tr>
            `;
        }).join('');
    },

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl text-xs font-semibold flex items-center gap-2 transform transition-all duration-300 translate-y-[-20px] opacity-0`;

        if (type === 'success') {
            toast.classList.add('bg-emerald-950/90', 'border-emerald-500/50', 'text-emerald-200');
            toast.innerHTML = `<span>✅</span> <span>${message}</span>`;
        } else if (type === 'error') {
            toast.classList.add('bg-rose-950/90', 'border-rose-500/50', 'text-rose-200');
            toast.innerHTML = `<span>⚠️</span> <span>${message}</span>`;
        } else {
            toast.classList.add('bg-purple-950/90', 'border-purple-500/50', 'text-purple-200');
            toast.innerHTML = `<span>🛡️</span> <span>${message}</span>`;
        }

        document.body.appendChild(toast);
        setTimeout(() => toast.classList.remove('translate-y-[-20px]', 'opacity-0'), 10);
        setTimeout(() => {
            toast.classList.add('translate-y-[-20px]', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    AdminApp.init();
});
