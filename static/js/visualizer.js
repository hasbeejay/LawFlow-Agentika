// LawFlow Live Judicial Neural Visualizer (Canvas 60fps engine)
// Rich Brown, Creme, and Forest Judicial Green styling
class JudicialVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.connections = [];
        this.particles = [];
        this.hoveredNode = null;
        this.animationId = null;

        this.initDimensions();
        this.initGraph();
        this.initEvents();
        this.animate();
    }

    initDimensions() {
        if (!this.canvas || !this.canvas.parentElement) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.width = rect.width > 50 ? rect.width : (this.canvas.parentElement.clientWidth || 920);
        this.height = 360;
        
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        
        this.ctx.resetTransform?.();
        this.ctx.scale(dpr, dpr);
    }

    initGraph() {
        const w = this.width;
        const h = this.height;
        const isLight = document.documentElement.classList.contains('theme-light');

        // 6 Core Stages in the End-to-End Autonomous & HITL Pipeline
        this.nodes = [
            { id: 'intake', label: 'E-Filing Intake', sub: 'FIR / Citations', x: w * 0.10, y: h * 0.50, color: '#c5a059', type: 'source' },
            { id: 'agent_precedent', label: 'Agent 1: Precedent', sub: 'Groq LPU 0.04s', x: w * 0.28, y: h * 0.24, color: '#40916c', type: 'agent' },
            { id: 'agent_judge', label: 'Agent 2: Judge Matcher', sub: 'Workload & Quota', x: w * 0.28, y: h * 0.76, color: '#40916c', type: 'agent' },
            { id: 'gate1', label: 'HITL Gate 1', sub: 'Clerk Sign-Off', x: w * 0.48, y: h * 0.50, color: '#d4af37', type: 'gate' },
            { id: 'agent_notice', label: 'Fastn Multi-Channel', sub: 'Sheets & Drive Sync', x: w * 0.68, y: h * 0.26, color: '#2d6a4f', type: 'agent' },
            { id: 'portal', label: 'Citizen Portal', sub: '2FA Verification', x: w * 0.88, y: h * 0.26, color: '#52b788', type: 'portal' },
            { id: 'gate2', label: 'HITL Gate 2', sub: 'Warrant Authorization', x: w * 0.68, y: h * 0.74, color: '#be123c', type: 'gate' },
            { id: 'police', label: 'Police Escrow', sub: 'Margalla Precinct 04', x: w * 0.88, y: h * 0.74, color: '#9f1239', type: 'enforcement' }
        ];

        this.connections = [
            ['intake', 'agent_precedent'],
            ['intake', 'agent_judge'],
            ['agent_precedent', 'gate1'],
            ['agent_judge', 'gate1'],
            ['gate1', 'agent_notice'],
            ['agent_notice', 'portal'],
            ['gate1', 'gate2'],
            ['gate2', 'police']
        ];

        // Traveling judicial token particles (Gold & Forest Green)
        this.particles = [];
        const colors = ['#c5a059', '#52b788', '#d4af37', '#40916c'];
        for (let i = 0; i < 28; i++) {
            const conn = this.connections[Math.floor(Math.random() * this.connections.length)];
            this.particles.push({
                from: conn[0],
                to: conn[1],
                t: Math.random(),
                speed: 0.0035 + Math.random() * 0.0055,
                color: colors[i % colors.length]
            });
        }
    }

    initEvents() {
        window.addEventListener('resize', () => {
            if (this.canvas) {
                this.initDimensions();
                this.initGraph();
            }
        });

        window.addEventListener('lawflow-theme-changed', () => {
            this.initGraph();
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            let hit = null;
            for (const n of this.nodes) {
                const dist = Math.hypot(n.x - mouseX, n.y - mouseY);
                if (dist < 32) {
                    hit = n;
                    break;
                }
            }
            this.hoveredNode = hit;
            this.canvas.style.cursor = hit ? 'pointer' : 'default';
        });
    }

    animate() {
        const isLight = document.documentElement.classList.contains('theme-light');
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Draw Connection Lines
        for (const [fromId, toId] of this.connections) {
            const from = this.nodes.find(n => n.id === fromId);
            const to = this.nodes.find(n => n.id === toId);
            if (!from || !to) continue;

            const grad = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);
            if (isLight) {
                grad.addColorStop(0, 'rgba(45, 106, 79, 0.20)');
                grad.addColorStop(0.5, 'rgba(197, 160, 89, 0.35)');
                grad.addColorStop(1, 'rgba(45, 106, 79, 0.20)');
            } else {
                grad.addColorStop(0, 'rgba(45, 106, 79, 0.25)');
                grad.addColorStop(0.5, 'rgba(197, 160, 89, 0.40)');
                grad.addColorStop(1, 'rgba(45, 106, 79, 0.25)');
            }

            this.ctx.beginPath();
            this.ctx.moveTo(from.x, from.y);
            this.ctx.lineTo(to.x, to.y);
            this.ctx.strokeStyle = grad;
            this.ctx.lineWidth = 1.8;
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // 2. Animate Traveling Data Particles
        for (const p of this.particles) {
            p.t += p.speed;
            if (p.t > 1) {
                p.t = 0;
                const newConn = this.connections[Math.floor(Math.random() * this.connections.length)];
                p.from = newConn[0];
                p.to = newConn[1];
            }
            const from = this.nodes.find(n => n.id === p.from);
            const to = this.nodes.find(n => n.id === p.to);
            if (!from || !to) continue;

            const px = from.x + (to.x - from.x) * p.t;
            const py = from.y + (to.y - from.y) * p.t;

            this.ctx.beginPath();
            this.ctx.arc(px, py, 3.5, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 8;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        // 3. Draw Nodes
        const now = Date.now();
        for (const n of this.nodes) {
            const isHovered = this.hoveredNode && this.hoveredNode.id === n.id;
            const radius = isHovered ? 26 : 20;
            const pulse = (Math.sin(now * 0.003 + n.x * 0.1) + 1) * 0.5;

            // Halo pulse ring
            this.ctx.beginPath();
            this.ctx.arc(n.x, n.y, radius + 6 * pulse, 0, Math.PI * 2);
            this.ctx.strokeStyle = n.color;
            this.ctx.lineWidth = 1.2;
            this.ctx.stroke();

            // Inner Node Body
            this.ctx.beginPath();
            this.ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = isLight ? '#ffffff' : '#1c140f';
            this.ctx.fill();
            this.ctx.strokeStyle = n.color;
            this.ctx.lineWidth = 2.5;
            this.ctx.shadowColor = n.color;
            this.ctx.shadowBlur = isHovered ? 16 : 8;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;

            // Node Center Icon / Indicator
            this.ctx.beginPath();
            this.ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
            this.ctx.fillStyle = n.color;
            this.ctx.fill();

            // Node Main Title
            this.ctx.font = isHovered ? '700 12px "Plus Jakarta Sans", sans-serif' : '600 11px "Plus Jakarta Sans", sans-serif';
            this.ctx.fillStyle = isLight ? '#20130b' : '#fcfbf7';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(n.label, n.x, n.y + radius + 16);

            // Node Subtitle / Metric
            this.ctx.font = '500 9px "JetBrains Mono", monospace';
            this.ctx.fillStyle = isLight ? '#7a6352' : '#c5a059';
            this.ctx.fillText(n.sub, n.x, n.y + radius + 29);
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }
}

// Global expose
window.JudicialVisualizer = JudicialVisualizer;
