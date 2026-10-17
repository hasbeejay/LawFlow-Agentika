// LawFlow Real-Time Judge & Judicial Pipeline Controller
// Manages live case intake, judge assignment matrix, and HITL stage progression

const JudgePipeline = {
    cases: [],
    judges: [],
    selectedCaseId: null,

    async init() {
        await this.loadData();
        this.renderPipeline();
    },

    async loadData() {
        try {
            const [casesRes, judgesRes] = await Promise.all([
                fetch('/api/cases'),
                fetch('/api/judges')
            ]);
            
            const casesData = await casesRes.json();
            const judgesData = await judgesRes.json();

            this.cases = (casesData && casesData.cases) ? casesData.cases : [];
            this.judges = (judgesData && judgesData.judges) ? judgesData.judges : [];

            // Default fallback if database empty
            if (this.cases.length === 0) {
                this.cases = [
                    {
                        id: 'LF-2026-EE25',
                        title: 'Capital Court v. Hamza Tariq',
                        charge_details: 'Section 279 PPC: Reckless Driving & Excessive Speed',
                        status: 'PENDING_CLERK_APPROVAL',
                        recommended_judge_name: 'Hon. Justice Sarah Jenkins',
                        courtroom: 'Courtroom 204',
                        hearing_date: '2026-10-24 10:00 AM',
                        respondent_name: 'Hamza Tariq',
                        simulated_hours: 12
                    },
                    {
                        id: 'LF-2026-0E9D',
                        title: 'Capital Court v. Haseeb Jalil',
                        charge_details: 'Motor Vehicles Ordinance: Speeding Citation #TR-2026-991',
                        status: 'NOTICE_SENT',
                        recommended_judge_name: 'Hon. Justice Sarah Jenkins',
                        courtroom: 'Courtroom 204',
                        hearing_date: '2026-10-22 09:30 AM',
                        respondent_name: 'Haseeb Jalil',
                        simulated_hours: 28
                    },
                    {
                        id: 'LF-2026-2095',
                        title: 'State v. Kamran Sheikh',
                        charge_details: 'Family Protection Act: Urgent Restraining Order',
                        status: 'NOTICE_SENT',
                        recommended_judge_name: 'Hon. Justice Ayla Tariq',
                        courtroom: 'Courtroom 108',
                        hearing_date: '2026-10-20 11:15 AM',
                        respondent_name: 'Kamran Sheikh',
                        simulated_hours: 44
                    },
                    {
                        id: 'LF-2026-3180',
                        title: 'Municipal Corp v. Apex Freight Ltd',
                        charge_details: 'Commercial Sanitation Ordinance #401',
                        status: 'SCHEDULED_CONFIRMED',
                        recommended_judge_name: 'Hon. Justice Michael Chang',
                        courtroom: 'Courtroom 302',
                        hearing_date: '2026-10-26 02:00 PM',
                        respondent_name: 'Apex Freight Logistics',
                        simulated_hours: 60
                    }
                ];
            }

            this.selectedCaseId = this.cases[0].id;
        } catch (e) {
            console.error('Failed to load judge pipeline data:', e);
        }
    },

    selectCase(caseId) {
        this.selectedCaseId = caseId;
        this.renderPipeline();
    },

    renderPipeline() {
        const container = document.getElementById('judge-pipeline-container');
        if (!container) return;

        const currentCase = this.cases.find(c => c.id === this.selectedCaseId) || this.cases[0];
        if (!currentCase) return;

        // Determine step statuses based on case.status
        // PENDING_CLERK_APPROVAL -> Step 1 & 2 done, Step 3 active (Clerk review), Step 4 & 5 pending
        // NOTICE_SENT -> Step 1, 2, 3, 4 done, Step 5 active (Citizen 2FA / 72h window)
        // SCHEDULED_CONFIRMED -> All done
        // POLICE_REFERRAL_DISPATCHED -> Step 1, 2, 3 done, Step 4 & 5 Warrant escalated
        let s1 = 'completed', s2 = 'completed', s3 = 'pending', s4 = 'pending', s5 = 'pending';
        let s3Text = 'Pending Clerk Sign-Off';
        let s5Badge = '72h Window';

        if (currentCase.status === 'PENDING_CLERK_APPROVAL') {
            s3 = 'active';
            s3Text = 'Awaiting Sworn Registrar Review';
        } else if (currentCase.status === 'NOTICE_SENT') {
            s3 = 'completed';
            s4 = 'completed';
            s5 = 'active';
            s3Text = 'Clerk Approved & Sealed';
            s5Badge = `${currentCase.simulated_hours || 24}h Elapsed (Pending 2FA)`;
        } else if (currentCase.status === 'SCHEDULED_CONFIRMED' || currentCase.status.startsWith('RESOLVED')) {
            s1 = s2 = s3 = s4 = s5 = 'completed';
            s3Text = 'Clerk Approved';
            s5Badge = 'Confirmed by Citizen';
        } else if (currentCase.status === 'POLICE_REFERRAL_DISPATCHED' || currentCase.status.startsWith('FORCE')) {
            s1 = s2 = s3 = s4 = 'completed';
            s5 = 'escalated';
            s3Text = 'Clerk Escalated';
            s5Badge = 'Rule 12 Bench Warrant Dispatched';
        }

        const judgeName = currentCase.recommended_judge_name || 'Hon. Justice Sarah Jenkins';
        const courtroom = currentCase.courtroom || 'Courtroom 204';
        const hearingDate = currentCase.hearing_date || 'Pending Schedule';

        // Render Case Selector Tabs + 5-Stage Interactive Judicial Pipeline
        container.innerHTML = `
            <!-- Case Selector Tabs (Apple Pill Style) -->
            <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 dark:bg-[#1a120c]/80 border border-slate-800/80 rounded-2xl mb-6 backdrop-blur-md">
                <div class="flex items-center gap-2 overflow-x-auto py-1">
                    <span class="text-xs font-bold text-[#8a5731] dark:text-[#c59b6d] uppercase tracking-wider pl-2 flex items-center gap-1.5">
                        <span>🏛️</span> Active Dockets:
                    </span>
                    ${this.cases.map(c => `
                        <button onclick="JudgePipeline.selectCase('${c.id}')"
                            class="px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 whitespace-nowrap ${
                                c.id === this.selectedCaseId
                                    ? 'bg-[#1b4332] text-[#fbf8f3] shadow-md border border-[#52b788]/40 scale-[1.02]'
                                    : 'bg-slate-800/60 dark:bg-[#2a1d15]/60 text-slate-400 hover:text-white border border-slate-700/40'
                            }">
                            <span>${c.id}</span>
                            <span class="w-2 h-2 rounded-full ${
                                c.status === 'SCHEDULED_CONFIRMED' ? 'bg-[#52b788]' :
                                c.status === 'PENDING_CLERK_APPROVAL' ? 'bg-[#d4a373] animate-pulse' :
                                c.status === 'POLICE_REFERRAL_DISPATCHED' ? 'bg-[#be123c]' : 'bg-[#40916c]'
                            }"></span>
                        </button>
                    `).join('')}
                </div>
                <div class="flex items-center gap-2 text-xs font-mono text-[#8a5731] dark:text-[#c59b6d] pr-2">
                    <span class="w-2 h-2 rounded-full bg-[#52b788] animate-ping"></span>
                    <span>Live Fastn Telemetry</span>
                </div>
            </div>

            <!-- Active Case Header Overview -->
            <div class="p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-[#1a120c]/90 to-slate-900/90 border border-slate-800/80 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1b4332]/40 text-[#74c69d] border border-[#2d6a4f]/50">
                            ${currentCase.id}
                        </span>
                        <h3 class="text-base font-extrabold text-white">${currentCase.title}</h3>
                    </div>
                    <p class="text-xs text-slate-400">${currentCase.charge_details || 'Routine Judicial Intake Proceeding'}</p>
                </div>
                <div class="flex items-center gap-3 text-xs font-mono">
                    <div class="px-3 py-1.5 rounded-xl bg-slate-950/60 dark:bg-[#120d0a]/80 border border-slate-800">
                        <span class="text-slate-500 block text-[10px]">Assigned Magistrate</span>
                        <strong class="text-[#c59b6d]">${judgeName}</strong>
                    </div>
                    <div class="px-3 py-1.5 rounded-xl bg-slate-950/60 dark:bg-[#120d0a]/80 border border-slate-800">
                        <span class="text-slate-500 block text-[10px]">Courtroom & Date</span>
                        <strong class="text-slate-200">${courtroom} &bull; ${hearingDate}</strong>
                    </div>
                </div>
            </div>

            <!-- 5-Stage Visual Judicial Pipeline Steps -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
                
                <!-- Stage 1 -->
                <div class="p-4 rounded-2xl border transition ${
                    s1 === 'completed'
                        ? 'bg-[#1b4332]/15 border-[#2d6a4f]/60 text-slate-100'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400'
                }">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-[#74c69d]">Stage 01</span>
                        <span class="text-xs">✅</span>
                    </div>
                    <div class="font-bold text-xs text-white mb-1">Police FIR Ingestion</div>
                    <p class="text-[11px] text-slate-400 leading-tight">Margalla Precinct 04 dossier received & parsed via Groq 0.04s LPU.</p>
                </div>

                <!-- Stage 2 -->
                <div class="p-4 rounded-2xl border transition ${
                    s2 === 'completed'
                        ? 'bg-[#1b4332]/15 border-[#2d6a4f]/60 text-slate-100'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400'
                }">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-[#74c69d]">Stage 02</span>
                        <span class="text-xs">⚖️</span>
                    </div>
                    <div class="font-bold text-xs text-white mb-1">Judge Matching</div>
                    <p class="text-[11px] text-slate-400 leading-tight">Matched: <strong class="text-[#c59b6d]">${judgeName}</strong> with 92% precedent fit.</p>
                </div>

                <!-- Stage 3 (HITL Gate 1) -->
                <div class="p-4 rounded-2xl border transition ${
                    s3 === 'active'
                        ? 'bg-[#8a5731]/25 border-[#d4a373] text-white shadow-lg shadow-[#8a5731]/20 animate-pulse'
                        : s3 === 'completed'
                        ? 'bg-[#1b4332]/15 border-[#2d6a4f]/60 text-slate-100'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400'
                }">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-mono font-bold uppercase tracking-wider ${
                            s3 === 'active' ? 'text-[#d4a373]' : 'text-[#74c69d]'
                        }">Stage 03 (HITL)</span>
                        <span class="text-xs">🔒</span>
                    </div>
                    <div class="font-bold text-xs text-white mb-1">Gate 1: Clerk Sign-Off</div>
                    <p class="text-[11px] text-slate-300 leading-tight">${s3Text}</p>
                </div>

                <!-- Stage 4 -->
                <div class="p-4 rounded-2xl border transition ${
                    s4 === 'completed'
                        ? 'bg-[#1b4332]/15 border-[#2d6a4f]/60 text-slate-100'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400'
                }">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-[#74c69d]">Stage 04</span>
                        <span class="text-xs">📡</span>
                    </div>
                    <div class="font-bold text-xs text-white mb-1">Fastn Summons Dispatch</div>
                    <p class="text-[11px] text-slate-400 leading-tight">Twilio SMS + Email + Google Calendar slot synchronized.</p>
                </div>

                <!-- Stage 5 -->
                <div class="p-4 rounded-2xl border transition ${
                    s5 === 'completed'
                        ? 'bg-[#1b4332]/25 border-[#52b788] text-white'
                        : s5 === 'escalated'
                        ? 'bg-[#be123c]/20 border-[#be123c] text-white'
                        : s5 === 'active'
                        ? 'bg-[#8a5731]/15 border-[#c59b6d]/60 text-slate-200'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400'
                }">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-mono font-bold uppercase tracking-wider ${
                            s5 === 'escalated' ? 'text-rose-400' : 'text-[#74c69d]'
                        }">Stage 05</span>
                        <span class="text-xs">${s5 === 'escalated' ? '🚨' : '📱'}</span>
                    </div>
                    <div class="font-bold text-xs text-white mb-1">Citizen 2FA Compliance</div>
                    <p class="text-[11px] text-slate-300 leading-tight">${s5Badge}</p>
                </div>

            </div>
        `;
    }
};

window.JudgePipeline = JudgePipeline;

window.addEventListener('DOMContentLoaded', () => {
    JudgePipeline.init();
});
