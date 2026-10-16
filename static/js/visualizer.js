// LawFlow Live Judicial Neural Visualizer (Canvas 60fps engine)
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
        this.width = rect.width;
        this.height = Math.max(380, rect.height || 380);
        this.canvas.width = this.width * window.devicePixelRatio;
        this.canvas.height = this.height * window.devicePixelRatio;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    initGraph() {
        const w = this.width;
        const h = this.height;

        this.nodes = [
            { id: 'intake', label: 'E-Filing Intake', x: w * 0.10, y: h * 0.50, color: '#38bdf8', pulse: 0, type: 'source' },
            { id: 'agent_precedent', label: 'Agent 1: Precedents', x: w * 0.28, y: h * 0.22, color: '#818cf8', pulse: 0, type: 'agent' },
            { id: 'agent_calendar', label: 'Agent 2: Calendar', x: w * 0.28, y: h * 0.50, color: '#818cf8', pulse: 0, type: 'agent' },
            { id: 'agent_judge', label: 'Agent 3: Matcher', x: w * 0.28, y: h * 0.78, color: '#818cf8', pulse: 0, type: 'agent' },
            { id: 'gate1', label: 'HITL Gate 1: Clerk', x: w * 0.50, y: h * 0.50, color: '#f59e0b', pulse: 0, type: 'gate' },
            { id: 'agent_notice', label: 'Agent 4: Summons', x: w * 0.70, y: h * 0.28, color: '#34d399', pulse: 0, type: 'agent' },
            { id: 'portal', label: 'Respondent Portal', x: w * 0.88, y: h * 0.28, color: '#10b981', pulse: 0, type: 'portal' },
            { id: 'gate2', label: 'HITL Gate 2: Police', x: w * 0.70, y: h * 0.72, color: '#f43f5e', pulse: 0, type: 'gate' },
            { id: 'police', label: 'Margalla Precinct', x: w * 0.88, y: h * 0.72, color: '#c084fc', pulse: 0, type: 'enforcement' }
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

        // Spawn traveling particles
        this.particles = [];
        for (let i = 0; i < 24; i++) {
            const conn = this.connections[Math.floor(Math.random() * this.connections.length)];
            this.particles.push({
                from: conn[0],
                to: conn[1],
                t: Math.random(),
                speed: 0.004 + Math.random() * 0.006,
                color: '#60a5fa'
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
                if (dist < 28) {
                    hit = n;
                    break;
                }
            }
            this.hoveredNode = hit;
            this.canvas.style.cursor = hit ? 'pointer' : 'default';
        });
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Draw Connection Lines
        for (const [fromId, toId] of this.connections) {
            const from = this.nodes.find(n => n.id === fromId);
            const to = this.nodes.find(n => n.id === toId);
            if (!from || !to) continue;

            const grad = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);
            grad.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
            grad.addColorStop(0.5, 'rgba(139, 92, 246, 0.25)');
            grad.addColorStop(1, 'rgba(59, 130, 246, 0.15)');

            this.ctx.beginPath();
            this.ctx.moveTo(from.x, from.y);
            this.ctx.lineTo(to.x, to.y);
            this.ctx.strokeStyle = grad;
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([4, 4]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        // 2. Animate and Draw Traveling Data Particles
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
            this.ctx.arc(px, py, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 10;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        // 3. Draw Nodes
        const now = Date.now();
        for (const n of this.nodes) {
            const isHovered = this.hoveredNode && this.hoveredNode.id === n.id;
            const radius = isHovered ? 24 : 18;
            const pulse = (Math.sin(now * 0.003 + n.x) + 1) * 0.5;

            // Halo ring
            this.ctx.beginPath();
            this.ctx.arc(n.x, n.y, radius + 6 * pulse, 0, Math.PI * 2);
            this.ctx.strokeStyle = n.color;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // Inner body
            this.ctx.beginPath();
            this.ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#0f172a';
            this.ctx.fill();
            this.ctx.strokeStyle = n.color;
            this.ctx.lineWidth = 2.5;
            this.ctx.shadowColor = n.color;
            this.ctx.shadowBlur = isHovered ? 18 : 8;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;

            // Node Label
            this.ctx.font = isHovered ? '600 12px Outfit' : '500 11px Outfit';
            this.ctx.fillStyle = isHovered ? '#ffffff' : '#94a3b8';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(n.label, n.x, n.y + radius + 16);
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }
}
