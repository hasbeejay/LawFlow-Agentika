// LawFlow Live Judicial Neural Visualizer & Real-Time Judge Pipeline
// Hardware-accelerated 60fps canvas + dynamic case pipeline state

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
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.width = rect.width || 800;
        this.height = Math.max(340, rect.height || 340);
        
        // Crisp Retina scaling without transform resets
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    initGraph() {
        const w = this.width;
        const h = this.height;

        // Elegant Brown, Creme & Forest Green judicial nodes
        this.nodes = [
            { id: 'intake', label: 'FIR / E-Filing Intake', x: w * 0.10, y: h * 0.50, color: '#c59b6d', bg: '#2a1d15', pulse: 0, type: 'source' },
            { id: 'agent_precedent', label: 'Agent 1: Precedents', x: w * 0.30, y: h * 0.22, color: '#40916c', bg: '#1c140e', pulse: 0, type: 'agent' },
            { id: 'agent_calendar', label: 'Agent 2: Calendar Slot', x: w * 0.30, y: h * 0.50, color: '#40916c', bg: '#1c140e', pulse: 0, type: 'agent' },
            { id: 'agent_judge', label: 'Agent 3: Judge Matcher', x: w * 0.30, y: h * 0.78, color: '#40916c', bg: '#1c140e', pulse: 0, type: 'agent' },
            { id: 'gate1', label: 'HITL Gate 1: Clerk Approval', x: w * 0.52, y: h * 0.50, color: '#d4a373', bg: '#332318', pulse: 0, type: 'gate' },
            { id: 'agent_notice', label: 'Agent 4: Summons Dispatch', x: w * 0.72, y: h * 0.28, color: '#52b788', bg: '#1c140e', pulse: 0, type: 'agent' },
            { id: 'portal', label: 'Citizen Verified (2FA)', x: w * 0.90, y: h * 0.28, color: '#2d6a4f', bg: '#132a13', pulse: 0, type: 'portal' },
            { id: 'gate2', label: 'HITL Gate 2: Police Escrow', x: w * 0.72, y: h * 0.72, color: '#be123c', bg: '#2a1217', pulse: 0, type: 'gate' },
            { id: 'police', label: 'Margalla Police Precinct', x: w * 0.90, y: h * 0.72, color: '#8a5731', bg: '#2a1d15', pulse: 0, type: 'enforcement' }
        ];

        this.connections = [
            ['intake', 'agent_precedent'],
            ['intake', 'agent_calendar'],
            ['intake', 'agent_judge'],
            ['agent_precedent', 'gate1'],
            ['agent_calendar', 'gate1'],
            ['agent_judge', 'gate1'],
            ['gate1', 'agent_notice'],
            ['agent_notice', 'portal'],
            ['gate1', 'gate2'],
            ['gate2', 'police']
        ];

        // Smooth traveling data tokens (Brown, Gold & Forest Green)
        this.particles = [];
        const tokenColors = ['#52b788', '#c59b6d', '#74c69d', '#d4a373'];
        for (let i = 0; i < 20; i++) {
            const conn = this.connections[Math.floor(Math.random() * this.connections.length)];
            this.particles.push({
                from: conn[0],
                to: conn[1],
                t: Math.random(),
                speed: 0.0035 + Math.random() * 0.005,
                color: tokenColors[i % tokenColors.length]
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

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            let hit = null;
            for (const n of this.nodes) {
                const dist = Math.hypot(n.x - mouseX, n.y - mouseY);
                if (dist < 26) {
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

            this.ctx.beginPath();
            this.ctx.moveTo(from.x, from.y);
            this.ctx.lineTo(to.x, to.y);
            this.ctx.strokeStyle = isLight ? 'rgba(74, 56, 44, 0.18)' : 'rgba(217, 180, 145, 0.18)';
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([4, 4]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // 2. Animate and Draw Traveling Data Particles (Silky 60fps, no heavy shadowBlur)
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
            this.ctx.fill();
        }

        // 3. Draw Nodes (Hardware-accelerated rendering)
        const now = Date.now();
        for (const n of this.nodes) {
            const isHovered = this.hoveredNode && this.hoveredNode.id === n.id;
            const radius = isHovered ? 22 : 17;
            const pulse = (Math.sin(now * 0.003 + n.x * 0.01) + 1) * 0.5;

            // Halo ring
            this.ctx.beginPath();
            this.ctx.arc(n.x, n.y, radius + 5 * pulse, 0, Math.PI * 2);
            this.ctx.strokeStyle = isLight ? 'rgba(45, 106, 79, 0.25)' : 'rgba(197, 155, 109, 0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // Inner body
            this.ctx.beginPath();
            this.ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = isLight ? '#ffffff' : n.bg;
            this.ctx.fill();
            this.ctx.strokeStyle = n.color;
            this.ctx.lineWidth = isHovered ? 3 : 2;
            this.ctx.stroke();

            // Node Label
            this.ctx.font = isHovered ? '700 11px Plus Jakarta Sans, sans-serif' : '600 10.5px Plus Jakarta Sans, sans-serif';
            this.ctx.fillStyle = isLight ? '#231812' : '#f5eedf';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(n.label, n.x, n.y + radius + 15);
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }
}

window.JudicialVisualizer = JudicialVisualizer;
