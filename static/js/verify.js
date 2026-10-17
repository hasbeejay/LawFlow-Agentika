// LawFlow Respondent Secure Portal Controller
// Includes 2FA Verification, Multilingual Engine (English/Urdu/Spanish),
// Text-to-Speech Accessibility, and AI Respondent Case Summarizer & Rights Agent

const VerifyPortal = {
    token: null,
    caseData: null,
    aiSummary: null,
    currentLang: 'en',

    translations: {
        en: {
            title: "Judicial Summons & Appearance Verification",
            subtitle: "Capital Territory Judicial Adjudication System • Official Dispatch: 241908@students.au.edu.pk",
            badge: "Official Judicial Notice",
            caseId: "Case Reference",
            hearingDate: "Scheduled Hearing Date",
            courtroom: "Courtroom & Location",
            charge: "Alleged Offense / Citation",
            authNotice: "To confirm your identity and prevent failure-to-appear warrants, enter the last 4 digits of your National Identity Document (CNIC / SSN).",
            authLabel: "Last 4 Digits of National ID / CNIC",
            terms: "I acknowledge receipt of this official summons and agree to appear at the designated hearing.",
            confirmBtn: "Confirm Court Appearance ⚡",
            speechBtn: "Listen to Notice",
            confirmedTitle: "Appearance Successfully Confirmed",
            confirmedDesc: "Your attendance has been formally logged in the judicial docket. Please arrive 15 minutes prior to docket call with photo identification.",
            directions: "Courthouse Location & Safety Protocol",
            directionsDesc: "Main Judicial Complex, Sector G-10/4, Islamabad. Free parking available at South Gate."
        },
        ur: {
            title: "عدالتی سمن اور پیشی کی تصدیق",
            subtitle: "عدالتی کارروائی اور خودکار پیشی نظام • سرکاری ترسیل: 241908@students.au.edu.pk",
            badge: "سرکاری عدالتی نوٹس",
            caseId: "مقدمہ نمبر",
            hearingDate: "مقررہ تاریخ پیشی",
            courtroom: "عدالتی کمرہ اور مقام",
            charge: "عائد کردہ الزام / چالان",
            authNotice: "اپنی شناخت کی تصدیق اور وارنٹ گرفتاری سے بچنے کے لیے اپنے قومی شناختی کارڈ کے آخری ۴ ہندسے درج کریں۔",
            authLabel: "قومی شناختی کارڈ کے آخری ۴ ہندسے",
            terms: "میں اس عدالتی سمن کی وصولی کی تصدیق کرتا ہوں اور مقررہ تاریخ پر پیش ہونے کا پابند ہوں۔",
            confirmBtn: "عدالتی پیشی کی تصدیق کریں ⚡",
            speechBtn: "نوٹس کی آڈیو سنیں",
            confirmedTitle: "پیشی کی کامیابی سے تصدیق ہو گئی",
            confirmedDesc: "آپ کی حاضری عدالتی ریکارڈ میں درج ہو چکی ہے۔ براہ کرم اصل شناختی کارڈ ہمراہ لائیں۔",
            directions: "عدالتی راستہ اور رہنمائی",
            directionsDesc: "مرکزی عدالتی کمپلیکس، سیکٹر جی-10/4، اسلام آباد۔ مقررہ وقت سے ۱۵ منٹ قبل پہنچیں۔"
        },
        es: {
            title: "Citación Judicial y Confirmación de Comparecencia",
            subtitle: "Sistema Judicial Automatizado • Correo Oficial: 241908@students.au.edu.pk",
            badge: "Aviso Legal Oficial",
            caseId: "Referencia del Caso",
            hearingDate: "Fecha de Audiencia",
            courtroom: "Sala y Ubicación",
            charge: "Cargos Imputados",
            authNotice: "Para confirmar su identidad y evitar una orden de arresto, ingrese los últimos 4 dígitos de su documento de identidad.",
            authLabel: "Últimos 4 Dígitos de Identificación",
            terms: "Reconozco haber recibido esta citación oficial y me comprometo a comparecer.",
            confirmBtn: "Confirmar Comparecencia ⚡",
            speechBtn: "Escuchar Aviso (Audio)",
            confirmedTitle: "Comparecencia Confirmada Exitosamente",
            confirmedDesc: "Su asistencia ha sido registrada formalmente. Presente una identificación con foto válida.",
            directions: "Ubicación del Tribunal",
            directionsDesc: "Complejo Judicial Central. Preséntese 15 minutos antes de la hora programada."
        }
    },

    async init() {
        const params = new URLSearchParams(window.location.search);
        VerifyPortal.token = params.get('token') || params.get('case_id');

        if (!VerifyPortal.token) {
            VerifyPortal.showLookup();
            return;
        }

        await VerifyPortal.fetchCase(VerifyPortal.token);
    },

    showLookup() {
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('error-state').classList.add('hidden');
        document.getElementById('case-state').classList.add('hidden');
        document.getElementById('lookup-state').classList.remove('hidden');
    },

    quickSelectCase(caseId) {
        document.getElementById('manual-lookup-input').value = caseId;
        VerifyPortal.fetchCase(caseId);
    },

    async handleManualLookup(e) {
        if (e) e.preventDefault();
        const query = document.getElementById('manual-lookup-input').value.trim();
        if (!query) return;
        await VerifyPortal.fetchCase(query);
    },

    setLanguage(lang) {
        VerifyPortal.currentLang = lang;
        document.querySelectorAll('.lang-btn').forEach(b => {
            b.classList.remove('bg-blue-600', 'text-white');
            b.classList.add('text-slate-400');
        });
        const activeBtn = document.getElementById(`lang-btn-${lang}`);
        if (activeBtn) {
            activeBtn.classList.add('bg-blue-600', 'text-white');
            activeBtn.classList.remove('text-slate-400');
        }

        if (lang === 'ur') {
            document.body.classList.add('font-urdu');
            document.getElementById('portal-wrapper').setAttribute('dir', 'rtl');
        } else {
            document.body.classList.remove('font-urdu');
            document.getElementById('portal-wrapper').setAttribute('dir', 'ltr');
        }

        VerifyPortal.applyTranslations();
    },

    applyTranslations() {
        const t = VerifyPortal.translations[VerifyPortal.currentLang];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) el.innerText = t[key];
        });
    },

    async fetchCase(tokenOrId) {
        document.getElementById('lookup-state').classList.add('hidden');
        document.getElementById('error-state').classList.add('hidden');
        document.getElementById('loading-state').classList.remove('hidden');

        try {
            const res = await fetch(`/api/verify?token=${encodeURIComponent(tokenOrId)}`);
            if (!res.ok) {
                VerifyPortal.showError('Invalid or expired judicial summons link or Case ID. If this is an error, please verify your citation reference.');
                return;
            }
            const data = await res.json();
            VerifyPortal.caseData = data;
            VerifyPortal.token = data.token || tokenOrId;
            VerifyPortal.renderCase();

            // Fetch AI Case Summary asynchronously
            VerifyPortal.fetchAiSummary(data.case_id);
        } catch (e) {
            console.error('Fetch error:', e);
            VerifyPortal.showError('Unable to connect to Judicial Registry server.');
        }
    },

    async fetchAiSummary(caseId) {
        try {
            const res = await fetch(`/api/cases/${caseId}/respondent-summary`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'success' && data.summary) {
                    VerifyPortal.aiSummary = data.summary;
                    VerifyPortal.renderAiSummary(data.summary);
                }
            }
        } catch (e) {
            console.error('Failed to load AI summary:', e);
        }
    },

    renderAiSummary(s) {
        const explEl = document.getElementById('ai-plain-explanation');
        const whyEl = document.getElementById('ai-why-confirm');
        const rightsList = document.getElementById('ai-rights-list');
        const checklist = document.getElementById('ai-checklist');

        if (explEl && s.plain_english_explanation) {
            explEl.innerText = s.plain_english_explanation;
        }
        if (whyEl && s.why_confirm_now) {
            whyEl.innerText = s.why_confirm_now;
        }
        if (rightsList && Array.isArray(s.your_statutory_rights)) {
            rightsList.innerHTML = s.your_statutory_rights.map(r => `
                <div class="flex items-start gap-2 bg-slate-900/50 p-2 rounded border border-slate-800">
                    <span class="text-blue-400 mt-0.5">⚖️</span>
                    <span class="text-slate-200">${r}</span>
                </div>
            `).join('');
        }
        if (checklist && Array.isArray(s.what_to_bring_checklist)) {
            checklist.innerHTML = s.what_to_bring_checklist.map(item => `
                <label class="flex items-center gap-2 bg-slate-900/50 p-2 rounded border border-slate-800 cursor-pointer hover:bg-slate-800/40 transition">
                    <input type="checkbox" class="accent-indigo-500 rounded">
                    <span class="text-slate-300 text-[11px]">${item}</span>
                </label>
            `).join('');
        }
    },

    renderCase() {
        const d = VerifyPortal.caseData;
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('lookup-state').classList.add('hidden');
        document.getElementById('error-state').classList.add('hidden');
        document.getElementById('case-state').classList.remove('hidden');

        document.getElementById('portal-case-id').innerText = d.case_id;
        document.getElementById('portal-title').innerText = d.case_title;
        document.getElementById('portal-respondent').innerText = d.respondent_name;
        document.getElementById('portal-date').innerText = d.hearing_date;
        document.getElementById('portal-courtroom').innerText = d.courtroom;
        document.getElementById('portal-charge').innerText = d.charge_details;

        if (d.current_case_status === 'SCHEDULED_CONFIRMED') {
            VerifyPortal.showConfirmedState();
        } else {
            document.getElementById('auth-form-card').classList.remove('hidden');
            document.getElementById('confirmed-card').classList.add('hidden');
        }

        VerifyPortal.applyTranslations();
    },

    init3DShield() {
        const canvas = document.getElementById('verify-3d-canvas');
        if (!canvas || !window.THREE) return;

        try {
            const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
            renderer.setSize(112, 112);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
            camera.position.z = 4.2;

            // Outer Shield Wireframe Torus
            const torusGeo = new THREE.TorusGeometry(1.4, 0.08, 16, 50);
            const torusMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.6 });
            const torus = new THREE.Mesh(torusGeo, torusMat);
            scene.add(torus);

            // Inner Core Icosahedron
            const icoGeo = new THREE.IcosahedronGeometry(0.9, 1);
            const icoMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true, transparent: true, opacity: 0.85 });
            const ico = new THREE.Mesh(icoGeo, icoMat);
            scene.add(ico);

            // Orbiting Node Particles
            const particleCount = 28;
            const posArray = new Float32Array(particleCount * 3);
            for (let i = 0; i < particleCount * 3; i += 3) {
                const u = Math.random();
                const v = Math.random();
                const theta = u * 2.0 * Math.PI;
                const phi = Math.acos(2.0 * v - 1.0);
                const r = 1.6 + Math.random() * 0.4;
                posArray[i] = r * Math.sin(phi) * Math.cos(theta);
                posArray[i + 1] = r * Math.sin(phi) * Math.sin(theta);
                posArray[i + 2] = r * Math.cos(phi);
            }
            const partGeo = new THREE.BufferGeometry();
            partGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
            const partMat = new THREE.PointsMaterial({ size: 0.07, color: 0x60a5fa, transparent: true, opacity: 0.9 });
            const particles = new THREE.Points(partGeo, partMat);
            scene.add(particles);

            let isVerified = false;
            VerifyPortal.shieldTriggerVerified = () => {
                isVerified = true;
                icoMat.color.setHex(0x10b981);
                torusMat.color.setHex(0x34d399);
                partMat.color.setHex(0xa7f3d0);
            };

            const animate = () => {
                requestAnimationFrame(animate);
                const speed = isVerified ? 0.025 : 0.008;
                torus.rotation.x += speed * 0.7;
                torus.rotation.y += speed;
                ico.rotation.x -= speed * 1.2;
                ico.rotation.y += speed * 0.9;
                particles.rotation.y += speed * 0.5;
                renderer.render(scene, camera);
            };
            animate();
        } catch (err) {
            console.warn('Three.js canvas init failed:', err);
        }
    },

    copyCaseId() {
        const id = VerifyPortal.caseData ? VerifyPortal.caseData.case_id : '';
        if (!id) return;
        navigator.clipboard.writeText(id).then(() => {
            alert(`Case ID ${id} copied to clipboard!`);
        }).catch(() => {});
    },

    downloadCalendarReminder() {
        const d = VerifyPortal.caseData;
        if (!d) return;

        const title = encodeURIComponent(`LawFlow Court Appearance: ${d.case_id}`);
        const details = encodeURIComponent(`Official Judicial Hearing for ${d.respondent_name}\nCase: ${d.case_id}\nCourtroom: ${d.courtroom}\nOffense: ${d.charge_details}\nVerified via LawFlow Citizen Portal.`);
        const location = encodeURIComponent(`${d.courtroom}, Main Judicial Complex, Sector G-10/4, Islamabad`);
        
        // Format Google Calendar URL
        const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
        window.open(googleCalUrl, '_blank');
    },

    showConfirmedState() {
        document.getElementById('auth-form-card').classList.add('hidden');
        document.getElementById('confirmed-card').classList.remove('hidden');

        if (typeof VerifyPortal.shieldTriggerVerified === 'function') {
            VerifyPortal.shieldTriggerVerified();
        }

        // Trigger celebratory confetti burst
        if (typeof window.confetti === 'function') {
            try {
                window.confetti({
                    particleCount: 80,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#3b82f6', '#10b981', '#06b6d4', '#8b5cf6']
                });
            } catch (e) {}
        }
    },

    async confirmIdentity(e) {
        e.preventDefault();
        const last4 = document.getElementById('verify-last4').value.trim();
        const btn = document.getElementById('confirm-appearance-btn');

        if (!last4 || last4.length < 4) {
            alert('Please enter all 4 digits of your identification document.');
            return;
        }

        btn.disabled = true;
        btn.innerText = 'Verifying Identity via 2FA Nonce...';

        try {
            const res = await fetch('/api/verify/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: VerifyPortal.token,
                    national_id_last4: last4,
                    accept_terms: true
                })
            });

            const data = await res.json();
            if (res.ok) {
                VerifyPortal.showConfirmedState();
            } else {
                alert(data.detail || 'Identity verification failed. Please check the last 4 digits.');
                btn.disabled = false;
                btn.innerText = VerifyPortal.translations[VerifyPortal.currentLang].confirmBtn;
            }
        } catch (e) {
            console.error(e);
            alert('Error communicating with judicial server.');
            btn.disabled = false;
        }
    },

    speakNotice() {
        if (!('speechSynthesis' in window)) {
            alert('Text-to-Speech is not supported on this device/browser.');
            return;
        }

        const d = VerifyPortal.caseData;
        if (!d) return;

        const eqEl = document.getElementById('audio-equalizer');
        const iconEl = document.getElementById('tts-icon');

        let text = `Official Court Notice for ${d.respondent_name}. Case reference: ${d.case_id}. You are summoned to appear on ${d.hearing_date} in ${d.courtroom} regarding charges of ${d.charge_details}. Please verify your identity below.`;
        if (VerifyPortal.currentLang === 'ur') {
            text = `عدالتی نوٹس برائے ${d.respondent_name}۔ مقدمہ نمبر ${d.case_id}۔ آپ کی تاریخ پیشی ${d.hearing_date} ہے برائے کمرہ عدالت ${d.courtroom}۔`;
        } else if (VerifyPortal.currentLang === 'es') {
            text = `Aviso judicial para ${d.respondent_name}. Caso: ${d.case_id}. Comparezca el ${d.hearing_date} en ${d.courtroom}.`;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        if (VerifyPortal.currentLang === 'ur') utterance.lang = 'ur-PK';
        else if (VerifyPortal.currentLang === 'es') utterance.lang = 'es-ES';
        else utterance.lang = 'en-US';

        if (eqEl) eqEl.classList.remove('hidden');
        if (iconEl) iconEl.innerText = '⏸️';

        const stopVisuals = () => {
            if (eqEl) eqEl.classList.add('hidden');
            if (iconEl) iconEl.innerText = '🔊';
        };

        utterance.onend = stopVisuals;
        utterance.onerror = stopVisuals;

        window.speechSynthesis.speak(utterance);
    },

    showError(msg) {
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('case-state').classList.add('hidden');
        document.getElementById('lookup-state').classList.add('hidden');
        const err = document.getElementById('error-state');
        err.classList.remove('hidden');
        document.getElementById('error-msg').innerText = msg;
    }
};

window.addEventListener('DOMContentLoaded', () => {
    VerifyPortal.init();
    setTimeout(() => {
        VerifyPortal.init3DShield();
    }, 250);
});
