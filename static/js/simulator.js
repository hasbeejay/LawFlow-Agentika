// LawFlow Time Machine & Virtual SMS Drawer Controller

const Simulator = {
    activeCaseId: null,

    async simulateTime(caseId, hours) {
        try {
            const btn = document.getElementById(`sim-btn-${caseId}-${hours}`);
            if (btn) btn.classList.add('opacity-50');

            const res = await fetch(`/api/cases/${caseId}/simulate-time?hours=${hours}`, {
                method: 'POST'
            });
            const data = await res.json();

            if (data.status === 'success') {
                App.showToast(`Time advanced to +${hours}h for case ${caseId}. New status: ${data.new_status}`, 'info');
                await App.loadCases();
                await App.loadAnalytics();
                await Simulator.fetchSmsLogs();

                if (data.requires_clerk_gate2) {
                    App.showToast(`🚨 High-Priority Alert: Case ${caseId} reached 72h default! Bench Warrant generated for Clerk Gate 2 sign-off.`, 'error');
                }
            }
        } catch (e) {
            console.error('Time simulation failed:', e);
            App.showToast('Time simulation failed', 'error');
        }
    },

    toggleSmsDrawer() {
        const drawer = document.getElementById('sms-drawer');
        if (drawer) {
            drawer.classList.toggle('open');
            if (drawer.classList.contains('open')) {
                Simulator.fetchSmsLogs();
            }
        }
    },

    async fetchSmsLogs() {
        try {
            const res = await fetch('/api/telephony/logs?limit=25');
            const data = await res.json();
            const container = document.getElementById('sms-messages-container');
            const badgeCount = document.getElementById('sms-unread-badge');

            if (!container) return;

            if (badgeCount) {
                badgeCount.innerText = data.logs.length;
            }

            if (data.logs.length === 0) {
                container.innerHTML = `<div class="text-center py-8 text-slate-500 text-xs">No dispatched notifications yet.</div>`;
                return;
            }

            container.innerHTML = data.logs.map(log => {
                const dateStr = new Date(log.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                let typeBadge = '';
                if (log.dispatch_type === 'SUMMONS_DISPATCH') {
                    typeBadge = `<span class="badge badge-approved text-[10px] px-2 py-0.5">Summons</span>`;
                } else if (log.dispatch_type === '48H_REMINDER') {
                    typeBadge = `<span class="badge badge-pending text-[10px] px-2 py-0.5">48h Reminder</span>`;
                } else if (log.dispatch_type === 'POLICE_ESCALATION_WARNING' || log.dispatch_type === 'POLICE_WARRANT_DISPATCH') {
                    typeBadge = `<span class="badge badge-force text-[10px] px-2 py-0.5">Police Escalation</span>`;
                } else if (log.dispatch_type === 'CONFIRMATION_RECEIPT') {
                    typeBadge = `<span class="badge badge-confirmed text-[10px] px-2 py-0.5">Confirmed</span>`;
                } else {
                    typeBadge = `<span class="badge badge-police text-[10px] px-2 py-0.5">Safety Notice</span>`;
                }

                let linkButton = '';
                if (log.token_link) {
                    const cleanLink = log.token_link.replace('http://localhost:8000', '');
                    linkButton = `
                        <div class="mt-2.5 pt-2 border-t border-slate-700/50 flex justify-between items-center">
                            <span class="text-[11px] text-blue-400 font-mono">Magic Summons Link</span>
                            <a href="${cleanLink}" target="_blank" class="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 rounded text-[11px] font-semibold transition">
                                Open Portal ↗
                            </a>
                        </div>
                    `;
                }

                return `
                    <div class="sms-bubble">
                        <div class="flex justify-between items-center mb-1">
                            <span class="font-semibold text-slate-200 text-xs">${log.recipient}</span>
                            <span class="text-[10px] text-slate-500 mono">${dateStr}</span>
                        </div>
                        <div class="text-[11px] text-slate-400 mb-1.5">${log.phone}</div>
                        <div class="text-xs text-slate-300 leading-relaxed">${log.message}</div>
                        ${linkButton}
                    </div>
                `;
            }).join('');
        } catch (e) {
            console.error('Failed to load SMS logs:', e);
        }
    }
};

// Auto poll SMS logs every 10 seconds
setInterval(() => {
    const drawer = document.getElementById('sms-drawer');
    if (drawer && drawer.classList.contains('open')) {
        Simulator.fetchSmsLogs();
    }
}, 10000);
