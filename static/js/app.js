// LawFlow Main Application Controller

const App = {
    currentTab: 'clerk',
    cases: [],
    judges: [],
    analytics: {},
    visualizer: null,

    async init() {
        App.bindNavigation();
        await App.loadAnalytics();
        await App.loadJudges();
        await App.loadCases();
        Simulator.fetchSmsLogs();

        // Initialize canvas visualizer
        setTimeout(() => {
            App.visualizer = new JudicialVisualizer('judicial-canvas');
        }, 100);
    },

    bindNavigation() {
        document.querySelectorAll('[data-nav]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const target = btn.getAttribute('data-nav');
                App.switchTab(target);
            });
        });
    },

    switchTab(tabName) {
        App.currentTab = tabName;
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('[data-nav]').forEach(btn => {
            btn.classList.remove('bg-blue-600/20', 'text-blue-400', 'border-blue-500/40');
            btn.classList.add('text-slate-400');
        });

        const activeContent = document.getElementById(`tab-${tabName}`);
        const activeNav = document.querySelector(`[data-nav="${tabName}"]`);

        if (activeContent) activeContent.classList.remove('hidden');
        if (activeNav) {
            activeNav.classList.add('bg-blue-600/20', 'text-blue-400', 'border-blue-500/40');
            activeNav.classList.remove('text-slate-400');
        }

        if (tabName === 'analytics' && App.visualizer) {
            App.visualizer.initDimensions();
            App.visualizer.initGraph();
        }
    },

    async loadAnalytics() {
        try {
            const res = await fetch('/api/analytics/summary');
            const data = await res.json();
            App.analytics = data;

            // Update KPI cards
            const totalEl = document.getElementById('kpi-total-cases');
            const appRateEl = document.getElementById('kpi-appearance-rate');
            const speedEl = document.getElementById('kpi-avg-speed');
            const gate1El = document.getElementById('kpi-gate1-count');
            const gate2El = document.getElementById('kpi-gate2-count');

            if (totalEl) totalEl.innerText = data.total_cases;
            if (appRateEl) appRateEl.innerText = data.appearance_rate;
            if (speedEl) speedEl.innerText = `${data.avg_notice_seconds}s`;
            if (gate1El) gate1El.innerText = data.pending_gate1_approvals;
            if (gate2El) gate2El.innerText = data.pending_gate2_police_referrals;

            // Update badge indicators in nav
            const badgeGate1 = document.getElementById('nav-gate1-badge');
            const badgeGate2 = document.getElementById('nav-gate2-badge');
            if (badgeGate1) {
                badgeGate1.innerText = data.pending_gate1_approvals;
                badgeGate1.style.display = data.pending_gate1_approvals > 0 ? 'inline-flex' : 'none';
            }
            if (badgeGate2) {
                badgeGate2.innerText = data.pending_gate2_police_referrals;
                badgeGate2.style.display = data.pending_gate2_police_referrals > 0 ? 'inline-flex' : 'none';
            }
        } catch (e) {
            console.error('Failed to load analytics:', e);
        }
    },

    async loadJudges() {
        try {
            const res = await fetch('/api/judges');
            const data = await res.json();
            App.judges = data.judges;
            App.renderJudges();
        } catch (e) {
            console.error('Failed to load judges:', e);
        }
    },

    async loadCases(filter = 'ALL') {
        try {
            const url = filter === 'ALL' ? '/api/cases' : `/api/cases?status=${filter}`;
            const res = await fetch(url);
            const data = await res.json();
            App.cases = data.cases;
            App.renderCaseTable();
            App.renderActionBanners();
        } catch (e) {
            console.error('Failed to load cases:', e);
        }
    },

    renderActionBanners() {
        const gate1Container = document.getElementById('gate1-action-banner');
        const gate2Container = document.getElementById('gate2-action-banner');

        // Check for Gate 1 pending approval
        const gate1Cases = App.cases.filter(c => c.status === 'PENDING_CLERK_APPROVAL');
        if (gate1Container) {
            if (gate1Cases.length > 0) {
                const target = gate1Cases[0];
                const precedent = target.precedent_brief || {};
                const reasoning = target.reasoning_card || {};
                const factors = reasoning.primary_factors || [];

                gate1Container.innerHTML = `
                    <div class="glass-panel p-5 border-amber-500/40 bg-amber-500/5 mb-6 relative overflow-hidden">
                        <div class="absolute -right-8 -top-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
                        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="badge badge-pending">Human-in-the-Loop Gate 1</span>
                                    <span class="text-xs text-amber-400 font-semibold uppercase tracking-wider">Clerk Approval Required</span>
                                </div>
                                <h3 class="text-lg font-bold text-white">${target.title} <span class="text-slate-400 text-sm font-normal">(${target.id})</span></h3>
                            </div>
                            <div class="flex items-center gap-2">
                                <button onclick="App.openOverrideModal('${target.id}')" class="btn-ghost text-xs">
                                    Override Judge / Slot ⚙️
                                </button>
                                <button onclick="App.approveGate1('${target.id}')" class="btn-primary text-xs bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400">
                                    Approve & Dispatch Summons ⚡
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-700/40 text-xs">
                            <!-- Precedent Column -->
                            <div class="bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">
                                <div class="text-slate-400 font-semibold mb-1 flex items-center justify-between">
                                    <span>AI Precedent Brief (Agent 1)</span>
                                    <span class="text-emerald-400 font-mono">${precedent.confidence_score || 95}% Confidence</span>
                                </div>
                                <p class="text-slate-200 font-medium mb-1">${precedent.statutory_basis || target.charge_details}</p>
                                <p class="text-slate-400 text-[11px] mb-2">${precedent.analysis || ''}</p>
                                <div class="text-[11px] text-blue-300 font-mono">Citation: ${precedent.citation || 'State Precedent 2024'}</div>
                            </div>

                            <!-- Match Reasoning Column -->
                            <div class="bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">
                                <div class="text-slate-400 font-semibold mb-1 flex items-center justify-between">
                                    <span>AI Reasoning Card (Agent 3)</span>
                                    <span class="text-blue-400 font-mono font-bold">${reasoning.match_score || 94}% Overall Match</span>
                                </div>
                                <p class="text-slate-200 font-medium mb-2">Recommended: <span class="text-blue-300 font-semibold">${target.recommended_judge_name}</span> &bull; ${target.courtroom}</p>
                                
                                <div class="space-y-1.5 mb-2">
                                    ${factors.slice(0, 3).map(f => `
                                        <div>
                                            <div class="flex justify-between text-[10px] text-slate-300 mb-0.5">
                                                <span>${f.factor}</span>
                                                <span class="font-mono">${f.score}%</span>
                                            </div>
                                            <div class="factor-bar-bg">
                                                <div class="factor-bar-fill" style="width: ${f.score}%;"></div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="text-[11px] text-slate-400 italic">${reasoning.rationale || ''}</div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                gate1Container.innerHTML = '';
            }
        }

        // Check for Gate 2 pending police referral
        const gate2Cases = App.cases.filter(c => c.status === 'FORCE_ACTION_PENDING_CLERK');
        if (gate2Container) {
            if (gate2Cases.length > 0) {
                const target = gate2Cases[0];
                const packet = target.police_packet || {};

                gate2Container.innerHTML = `
                    <div class="glass-panel p-5 border-rose-500/40 bg-rose-500/5 mb-6 relative overflow-hidden animate-glow">
                        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3">
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="badge badge-force">Human-in-the-Loop Gate 2</span>
                                    <span class="text-xs text-rose-400 font-bold uppercase tracking-wider">72h Default &bull; Bench Warrant Authorization</span>
                                </div>
                                <h3 class="text-lg font-bold text-white">${target.title} <span class="text-slate-400 text-sm font-normal">(${target.id})</span></h3>
                            </div>
                            <div class="flex items-center gap-2">
                                <button onclick="App.confirmGate2Police('${target.id}')" class="btn-danger text-xs">
                                    Authorize Police Referral & Arrest Docket ⚖️
                                </button>
                            </div>
                        </div>

                        <div class="bg-slate-900/60 p-4 rounded-xl border border-rose-500/30 text-xs mt-3">
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2 font-mono">
                                <div>
                                    <span class="text-slate-500 text-[10px] block">WARRANT CODE</span>
                                    <span class="text-rose-300 font-semibold">${packet.warrant_code || 'BW-2026-9931'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 text-[10px] block">ASSIGNED PRECINCT</span>
                                    <span class="text-slate-200">${packet.assigned_precinct || 'Station 04 - Margalla'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 text-[10px] block">BAIL RECOMMENDATION</span>
                                    <span class="text-amber-300">${packet.bail_set || 'PKR 50,000'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 text-[10px] block">DEFAULT STATUS</span>
                                    <span class="text-rose-400 font-bold">72 Hours Unacknowledged</span>
                                </div>
                            </div>
                            <p class="text-slate-300 text-[11px] border-t border-slate-700/50 pt-2 mt-2">
                                <span class="font-semibold text-rose-400">Statutory Notice:</span> Respondent has neglected official notice and 48-hour automated warning. Authorization transfers this case to law enforcement for physical service execution.
                            </p>
                        </div>
                    </div>
                `;
            } else {
                gate2Container.innerHTML = '';
            }
        }
    },

    renderCaseTable() {
        const tbody = document.getElementById('cases-table-body');
        if (!tbody) return;

        if (App.cases.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-500">No cases match the selected filter.</td></tr>`;
            return;
        }

        tbody.innerHTML = App.cases.map(c => {
            let statusBadge = '';
            if (c.status === 'PENDING_CLERK_APPROVAL') {
                statusBadge = `<span class="badge badge-pending">Gate 1 Pending</span>`;
            } else if (c.status === 'NOTICE_SENT') {
                statusBadge = `<span class="badge badge-approved">Summons Dispatched</span>`;
            } else if (c.status === 'NOTICE_RESENT_48H') {
                statusBadge = `<span class="badge badge-pending">48h Resent</span>`;
            } else if (c.status === 'FORCE_ACTION_PENDING_CLERK') {
                statusBadge = `<span class="badge badge-force">Gate 2 Action</span>`;
            } else if (c.status === 'POLICE_REFERRAL_DISPATCHED') {
                statusBadge = `<span class="badge badge-police">Police Dispatched</span>`;
            } else if (c.status === 'SCHEDULED_CONFIRMED') {
                statusBadge = `<span class="badge badge-confirmed">Confirmed</span>`;
            } else {
                statusBadge = `<span class="badge bg-slate-700 text-slate-300">${c.status}</span>`;
            }

            const isDualParty = c.is_dual_party ? `<span class="px-1.5 py-0.5 text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded font-semibold ml-1.5">Dual-Party</span>` : '';

            return `
                <tr class="border-b border-slate-800 hover:bg-slate-800/30 transition text-xs">
                    <td class="py-3 px-4 font-mono font-medium text-blue-400">${c.id}</td>
                    <td class="py-3 px-4">
                        <div class="font-semibold text-slate-200 flex items-center">${c.title} ${isDualParty}</div>
                        <div class="text-[11px] text-slate-400">${c.case_type}</div>
                    </td>
                    <td class="py-3 px-4 text-slate-300">
                        <div class="font-medium">${c.respondent_name}</div>
                        <div class="text-[11px] text-slate-500">${c.respondent_phone}</div>
                        ${c.respondent_email ? `<div class="text-[10px] text-blue-400 truncate max-w-[160px]">✉️ ${c.respondent_email}</div>` : ''}
                    </td>

                    <td class="py-3 px-4">
                        <div class="text-slate-300 font-medium">${c.recommended_judge_name || 'Unassigned'}</div>
                        <div class="text-[11px] text-slate-500">${c.courtroom || '-'}</div>
                    </td>
                    <td class="py-3 px-4 text-slate-300 font-mono text-[11px]">${c.hearing_date || 'TBD'}</td>
                    <td class="py-3 px-4">${statusBadge}</td>
                    <td class="py-3 px-4">
                        <div class="flex items-center gap-1.5">
                            <!-- Time Machine Simulation Buttons -->
                            <div class="inline-flex rounded-lg bg-slate-900 border border-slate-700/50 p-0.5">
                                <button id="sim-btn-${c.id}-0" onclick="Simulator.simulateTime('${c.id}', 0)" title="Set to 0h" class="px-1.5 py-0.5 text-[10px] hover:bg-blue-600/30 rounded text-slate-400 hover:text-white">0h</button>
                                <button id="sim-btn-${c.id}-48" onclick="Simulator.simulateTime('${c.id}', 48)" title="Fast-forward to 48h" class="px-1.5 py-0.5 text-[10px] hover:bg-amber-600/30 rounded text-slate-400 hover:text-white">48h</button>
                                <button id="sim-btn-${c.id}-72" onclick="Simulator.simulateTime('${c.id}', 72)" title="Fast-forward to 72h default" class="px-1.5 py-0.5 text-[10px] hover:bg-rose-600/30 rounded text-slate-400 hover:text-white font-bold text-rose-400">72h</button>
                            </div>

                            <!-- Case Detail Inspection Button -->
                            <button onclick="App.openCaseModal('${c.id}')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] border border-slate-700 transition">
                                Inspect 👁️
                            </button>

                            <!-- Magic Link to verify page -->
                            <a href="/verify?token=${c.token}" target="_blank" title="Test Respondent Verification View" class="p-1 text-slate-400 hover:text-blue-400 transition">
                                📱
                            </a>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderJudges() {
        const container = document.getElementById('judges-grid');
        if (!container) return;

        container.innerHTML = App.judges.map(j => {
            const slots = j.available_slots || [];
            return `
                <div class="glass-panel p-5 border-slate-700/50 hover:border-blue-500/40 transition">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h4 class="font-bold text-white text-base">${j.name}</h4>
                            <p class="text-xs text-blue-400 font-medium">${j.title}</p>
                        </div>
                        <span class="badge badge-approved text-[11px]">${j.disposition_rate} Clearance</span>
                    </div>

                    <div class="text-xs text-slate-300 mb-3 space-y-1">
                        <div><span class="text-slate-500">Specialization:</span> ${j.specialization}</div>
                        <div><span class="text-slate-500">Courtroom:</span> ${j.courtroom}</div>
                        <div><span class="text-slate-500">Active Docket Load:</span> <span class="font-mono text-amber-400">${j.current_active_cases}</span> cases</div>
                    </div>

                    <div class="border-t border-slate-800 pt-3">
                        <span class="text-[11px] text-slate-400 block mb-1.5 font-semibold">Available Hearing Blocks:</span>
                        <div class="flex flex-wrap gap-1.5">
                            ${slots.map(s => `<span class="px-2 py-1 bg-slate-800/80 border border-slate-700/60 rounded text-[10px] font-mono text-slate-300">${s}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    async approveGate1(caseId) {
        try {
            const res = await fetch(`/api/cases/${caseId}/approve`, { method: 'POST' });
            const data = await res.json();
            if (data.status === 'success') {
                App.showToast(`Gate 1 Approved! Encrypted summons and calendar reservation dispatched for ${caseId}.`, 'success');
                await App.loadCases();
                await App.loadAnalytics();
                await Simulator.fetchSmsLogs();

                // Open SMS drawer to show the judge the live sent SMS
                const drawer = document.getElementById('sms-drawer');
                if (drawer && !drawer.classList.contains('open')) {
                    drawer.classList.add('open');
                }
            }
        } catch (e) {
            console.error('Approval failed:', e);
            App.showToast('Failed to approve case', 'error');
        }
    },

    async confirmGate2Police(caseId) {
        try {
            const res = await fetch(`/api/cases/${caseId}/confirm-police-referral`, { method: 'POST' });
            const data = await res.json();
            if (data.status === 'success') {
                App.showToast(`Gate 2 Authorized! Bench Warrant & Police Referral dispatched to Margalla Division for ${caseId}.`, 'success');
                await App.loadCases();
                await App.loadAnalytics();
                await Simulator.fetchSmsLogs();
            }
        } catch (e) {
            console.error('Gate 2 failed:', e);
            App.showToast('Failed to confirm police referral', 'error');
        }
    },

    openCaseModal(caseId) {
        const c = App.cases.find(x => x.id === caseId);
        if (!c) return;

        const modal = document.getElementById('case-modal');
        const content = document.getElementById('case-modal-content');
        if (!modal || !content) return;

        const precedent = c.precedent_brief || {};
        const reasoning = c.reasoning_card || {};
        const factors = reasoning.primary_factors || [];

        content.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <span class="badge badge-approved text-xs mb-1">${c.case_type}</span>
                    <h3 class="text-xl font-bold text-white">${c.title}</h3>
                    <p class="text-xs text-slate-400 font-mono mt-0.5">Case ID: ${c.id} &bull; Status: ${c.status}</p>
                </div>
                <button onclick="App.closeCaseModal()" class="text-slate-400 hover:text-white text-lg font-bold p-1">&times;</button>
            </div>

            <div class="space-y-4 text-xs">
                <!-- Charge details -->
                <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
                    <span class="text-slate-400 font-semibold block mb-1">Offense & Charge Details:</span>
                    <p class="text-slate-200 leading-relaxed">${c.charge_details}</p>
                    <div class="mt-2 text-[11px] text-slate-400 flex gap-4">
                        <span>Respondent: <strong class="text-slate-200">${c.respondent_name}</strong></span>
                        <span>Phone: <strong class="text-slate-200">${c.respondent_phone}</strong></span>
                        <span>National ID Last 4: <strong class="text-slate-200 font-mono">${c.respondent_national_id_last4}</strong></span>
                    </div>
                </div>

                <!-- Dual Party Information if active -->
                ${c.is_dual_party ? `
                    <div class="bg-purple-950/20 p-3 rounded-xl border border-purple-500/30">
                        <span class="text-purple-300 font-semibold block mb-1">Dual-Party Safety & Separation Protocol:</span>
                        <div class="text-slate-300 text-[11px] space-y-1">
                            <div>Complainant: <strong>${c.complainant_name || 'Confidential'}</strong> (${c.complainant_phone || 'Protected'})</div>
                            <div>Safety Status: <span class="text-emerald-400 font-semibold">Active Restraining Corridor Protocol</span></div>
                            <div class="text-slate-400">Complainant escorted arrival at 08:30 via East Gate; Respondent entry at 09:00 via Main Security.</div>
                        </div>
                    </div>
                ` : ''}

                <!-- AI Precedent Summary -->
                <div class="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/50">
                    <div class="flex justify-between items-center mb-1.5">
                        <span class="text-blue-400 font-semibold">Micro-Agent 1: Precedent Brief</span>
                        <span class="text-emerald-400 font-mono text-[11px]">${precedent.confidence_score || 95}% Confidence</span>
                    </div>
                    <div class="text-slate-200 font-medium mb-1">${precedent.statutory_basis || ''}</div>
                    <p class="text-slate-300 text-[11px] mb-2 leading-relaxed">${precedent.analysis || ''}</p>
                    <div class="text-[11px] text-blue-300 font-mono bg-blue-950/30 p-2 rounded border border-blue-900/50">
                        Authoritative Precedent: ${precedent.citation || 'State v. Respondent'}
                    </div>
                </div>

                <!-- AI Reasoning Card -->
                <div class="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/50">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-blue-400 font-semibold">Micro-Agent 3: Judge Matcher Reasoning Card</span>
                        <span class="text-blue-300 font-mono font-bold">${reasoning.match_score || 94}% Overall Score</span>
                    </div>
                    <div class="text-slate-200 font-medium mb-2.5">
                        Assigned Magistrate: <span class="text-blue-300">${c.recommended_judge_name}</span> (${c.courtroom})
                    </div>
                    
                    <div class="space-y-2 mb-3">
                        ${factors.map(f => `
                            <div>
                                <div class="flex justify-between text-[11px] text-slate-300 mb-0.5">
                                    <span>${f.factor} <span class="text-slate-500 text-[10px]">(${f.weight})</span></span>
                                    <span class="font-mono text-blue-300 font-semibold">${f.score}%</span>
                                </div>
                                <div class="factor-bar-bg">
                                    <div class="factor-bar-fill" style="width: ${f.score}%;"></div>
                                </div>
                                <div class="text-[10px] text-slate-400 mt-0.5">${f.detail}</div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="text-slate-300 text-[11px] italic bg-slate-800/40 p-2 rounded border border-slate-700/40">
                        "${reasoning.rationale || ''}"
                    </div>
                </div>

                <!-- Magic Verification Link -->
                <div class="flex justify-between items-center bg-slate-900/80 p-3 rounded-xl border border-slate-700/50">
                    <div>
                        <span class="text-slate-400 text-[11px] block">Summons 2FA Verification Token</span>
                        <span class="font-mono text-blue-400 text-xs">${c.token}</span>
                    </div>
                    <a href="/verify?token=${c.token}" target="_blank" class="btn-primary text-xs">
                        Open Portal View 📱
                    </a>
                </div>
            </div>
        `;
        modal.classList.add('active');
    },

    closeCaseModal() {
        const modal = document.getElementById('case-modal');
        if (modal) modal.classList.remove('active');
    },

    openOverrideModal(caseId) {
        const c = App.cases.find(x => x.id === caseId);
        if (!c) return;

        const select = document.getElementById('override-judge-select');
        if (select) {
            select.innerHTML = App.judges.map(j => `
                <option value="${j.id}" ${j.id === c.recommended_judge_id ? 'selected' : ''}>
                    ${j.name} (${j.specialization} &bull; ${j.courtroom})
                </option>
            `).join('');
        }

        document.getElementById('override-case-id').value = caseId;
        const modal = document.getElementById('override-modal');
        if (modal) modal.classList.add('active');
    },

    closeOverrideModal() {
        const modal = document.getElementById('override-modal');
        if (modal) modal.classList.remove('active');
    },

    async submitJudgeOverride(e) {
        e.preventDefault();
        const caseId = document.getElementById('override-case-id').value;
        const judgeId = document.getElementById('override-judge-select').value;
        const clerkNote = document.getElementById('override-clerk-note').value;

        try {
            const res = await fetch(`/api/cases/${caseId}/override-judge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ judge_id: judgeId, clerk_note: clerkNote })
            });
            const data = await res.json();
            if (data.status === 'success') {
                App.showToast(`Judicial override applied: Reassigned to selected magistrate.`, 'success');
                App.closeOverrideModal();
                await App.loadCases();
            }
        } catch (e) {
            console.error('Override failed:', e);
            App.showToast('Failed to override judge', 'error');
        }
    },

    // Intake Form Handlers
    fillPreset(type) {
        const presets = {
            traffic: {
                case_type: 'Traffic Violation',
                respondent_name: 'Hamza Farooq',
                phone: '+92 301 448 9912',
                email: 'hasbeejayleo@gmail.com',
                last4: '5519',
                details: 'Excessive speed radar capture (122 km/h in 70 km/h zone on Expressway). Radar Unit TR-9. Roadside payment overdue by 8 days.',
                dual_party: false
            },
            domestic: {
                case_type: 'Criminal (Dual-Party)',
                respondent_name: 'Daniyal Ahmed',
                phone: '+92 334 512 8820',
                email: 'hasbeejayleo@gmail.com',
                last4: '8834',
                details: 'Penal Code § 243(e)(1): Domestic altercation with documented verbal threats. Complainant filed emergency protective petition. Immediate safety buffer required.',
                dual_party: true,
                complainant_name: 'Mahnoor Daniyal',
                complainant_phone: '+92 322 890 1142',
                complainant_email: 'hasbeejayleo@gmail.com'
            },
            commercial: {
                case_type: 'Civil Infraction',
                respondent_name: 'Saad Ur Rehman (Manager)',
                phone: '+92 346 991 3320',
                email: 'hasbeejayleo@gmail.com',
                last4: '4102',
                details: 'Municipal Sanitation Infraction § 44-A: Discharge of untreated restaurant grease waste into public storm drain. Citation #MN-2026-88.',
                dual_party: false
            },
            trespass: {
                case_type: 'Misdemeanor',
                respondent_name: 'Zubair Shah',
                phone: '+92 313 774 2201',
                email: 'hasbeejayleo@gmail.com',
                last4: '9211',
                details: 'Penal Code § 602: Repeated unauthorized commercial encroachment and trespass on municipal property after prior administrative warnings.',
                dual_party: false
            }
        };

        const p = presets[type];
        if (!p) return;

        document.getElementById('intake-case-type').value = p.case_type;
        document.getElementById('intake-respondent-name').value = p.respondent_name;
        document.getElementById('intake-respondent-phone').value = p.phone;
        document.getElementById('intake-respondent-email').value = p.email || 'hasbeejayleo@gmail.com';
        document.getElementById('intake-national-id').value = p.last4;
        document.getElementById('intake-charge-details').value = p.details;

        const dualCheck = document.getElementById('intake-dual-party');
        if (dualCheck) {
            dualCheck.checked = p.dual_party;
            App.toggleDualPartyFields();
        }

        if (p.dual_party) {
            document.getElementById('intake-complainant-name').value = p.complainant_name || '';
            document.getElementById('intake-complainant-phone').value = p.complainant_phone || '';
            const cEmail = document.getElementById('intake-complainant-email');
            if (cEmail) cEmail.value = p.complainant_email || '';
        }

        App.showToast(`Loaded ${p.case_type} preset data with email: ${p.email}`, 'info');
    },

    toggleDualPartyFields() {
        const check = document.getElementById('intake-dual-party');
        const container = document.getElementById('dual-party-container');
        if (check && container) {
            container.style.display = check.checked ? 'block' : 'none';
        }
    },

    async submitIntake(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('intake-submit-btn');
        if (submitBtn) {
            submitBtn.innerText = 'Orchestrating AI Micro-Agents...';
            submitBtn.disabled = true;
        }

        const payload = {
            case_type: document.getElementById('intake-case-type').value,
            respondent_name: document.getElementById('intake-respondent-name').value,
            respondent_phone: document.getElementById('intake-respondent-phone').value,
            respondent_email: document.getElementById('intake-respondent-email').value || null,
            respondent_national_id_last4: document.getElementById('intake-national-id').value,
            charge_details: document.getElementById('intake-charge-details').value,
            is_dual_party: document.getElementById('intake-dual-party').checked,
            complainant_name: document.getElementById('intake-complainant-name')?.value || null,
            complainant_phone: document.getElementById('intake-complainant-phone')?.value || null,
            complainant_email: document.getElementById('intake-complainant-email')?.value || null
        };

        try {
            const res = await fetch('/api/cases/intake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();


            if (data.status === 'success') {
                App.showToast(`Case ${data.case_id} filed! AI matched with ${data.recommended_judge}. Ready for Clerk Gate 1 review.`, 'success');
                document.getElementById('case-intake-form').reset();
                App.toggleDualPartyFields();
                await App.loadCases();
                await App.loadAnalytics();
            }
        } catch (e) {
            console.error('Intake failed:', e);
            App.showToast('Intake submission failed', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.innerText = 'File Intake & Generate AI Brief ⚡';
                submitBtn.disabled = false;
            }
        }
    },

    openRespondentPortalDemo() {
        const activeCase = App.cases.find(c => c.status !== 'PENDING_CLERK_APPROVAL') || App.cases[0];
        if (activeCase && activeCase.token) {
            window.open(`/verify?token=${activeCase.token}`, '_blank');
        } else {
            window.open('/verify', '_blank');
        }
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
            toast.classList.add('bg-blue-950/90', 'border-blue-500/50', 'text-blue-200');
            toast.innerHTML = `<span>ℹ️</span> <span>${message}</span>`;
        }

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('translate-y-[-20px]', 'opacity-0');
        }, 10);

        setTimeout(() => {
            toast.classList.add('translate-y-[-20px]', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 4500);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    App.init();
});
