// ---- Game ----
(function() {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('overlay');
    const overlayText = document.getElementById('overlayText');
    const overlayWord = document.getElementById('overlayWord');
    const finalScore = document.getElementById('finalScore');
    const startBtn = document.getElementById('startBtn');
    const rulesBtn = document.getElementById('rulesBtn');
    const diffLabel = document.querySelector('.diff-label');
    const diffWrap = document.querySelector('.diff-wrap');
    const complimentBtn = document.getElementById('complimentBtn');

    const MAX_W = 400, MAX_H = 600;
    let W, H, scale;

    function resize() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        scale = Math.min(vw / MAX_W, vh / MAX_H, 1);
        W = Math.floor(MAX_W * scale);
        H = Math.floor(MAX_H * scale);
        canvas.width = W;
        canvas.height = H;
    }
    resize();
    window.addEventListener('resize', resize);

    const s = () => scale;
    const GRAVITY = 0.45;
    const FLAP_FORCE = -7.5;
    const PIPE_WIDTH = 72;
    const PIPE_GAP = 170;
    const PIPE_SPEED = 2.2;
    const PIPE_SPAWN = 160;
    const BIRD_SIZE = 22;
    const GROUND_H = 60;

    const TIME_THEMES = [
        { name: 'morning', skyTop: '#f7d794', skyBot: '#f8b595', cloud: 'rgba(255,255,255,0.5)', ground: '#ded895', groundLine: '#d2b34a', grass: '#8bc34a' },
        { name: 'day',     skyTop: '#4ec0ca', skyBot: '#71c8d6', cloud: 'rgba(255,255,255,0.6)', ground: '#ded895', groundLine: '#d2b34a', grass: '#8bc34a' },
        { name: 'evening', skyTop: '#e44d72', skyBot: '#614385', cloud: 'rgba(255,200,180,0.4)', ground: '#c4b577', groundLine: '#a89340', grass: '#6a9a3a' },
        { name: 'night',   skyTop: '#0f0c29', skyBot: '#302b63', cloud: 'rgba(180,180,220,0.2)', ground: '#8a8560', groundLine: '#706828', grass: '#4a7a2a' },
    ];

    let bird, pipes, score, gameState, frame, groundX;
    let particles = [];
    let birdHue = 30; // random hue for the bird, set on each init
    let timeTheme = TIME_THEMES[1]; // default day
    let spinAngle = 0;   // current spin rotation (radians)
    let spinning = false; // is a spin in progress
    let pipeCount = 0;    // total pipes spawned (for section coloring)
    let sectionHue = 0;   // current hue for pipe section

    function hsl(h, sat, light) {
        return `hsl(${h}, ${sat}%, ${light}%)`;
    }

    function spawnParticles(x, y, isLetter) {
        const count = isLetter ? 24 : 12;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (2 + Math.random() * 4) * s();
            const isHeart = Math.random() < 0.5;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2 * s(),
                life: 1.0,
                decay: 0.008 + Math.random() * 0.008,
                size: (isHeart ? 14 : 8) + Math.random() * 8,
                type: isHeart ? 'heart' : 'sparkle',
                color: isHeart
                    ? ['#ff4571','#ff6b8a','#d63384','#ff85a1'][Math.floor(Math.random()*4)]
                    : ['#FFD700','#FFF','#ffec80','#ffd0e8'][Math.floor(Math.random()*4)],
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.2
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const pt = particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.vy += 0.1 * s();
            pt.vx *= 0.99;
            pt.life -= pt.decay;
            pt.rotation += pt.rotSpeed;
            if (pt.life <= 0) particles.splice(i, 1);
        }
    }

    function drawParticles() {
        for (const pt of particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, pt.life);
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.rotation);
            const sz = pt.size * s() * (0.5 + pt.life * 0.5);

            // Night glow on particles
            if (timeTheme.name === 'night') {
                ctx.shadowColor = pt.color;
                ctx.shadowBlur = sz * 1.5;
            }

            if (pt.type === 'heart') {
                // Simple heart shape
                ctx.fillStyle = pt.color;
                ctx.font = `${Math.round(sz)}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('\u2764', 0, 0);
            } else {
                // Sparkle: filled circle with glow
                ctx.fillStyle = pt.color;
                ctx.shadowColor = pt.color;
                ctx.shadowBlur = timeTheme.name === 'night' ? sz * 2 : sz * 0.8;
                ctx.beginPath();
                ctx.arc(0, 0, sz * 0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            ctx.restore();
        }
    }

    function init() {
        bird = { x: W * 0.28, y: H * 0.45, vy: 0, rotation: 0, flapFrame: 0 };
        pipes = [];
        particles = [];
        score = 0;
        frame = 0;
        groundX = 0;
        gameState = 'ready';
        birdHue = Math.floor(Math.random() * 360);
        timeTheme = TIME_THEMES[Math.floor(Math.random() * TIME_THEMES.length)];
        spinAngle = 0;
        spinning = false;
        pipeCount = 0;
        sectionHue = Math.floor(Math.random() * 360);
    }

    function flap() {
        if (gameState === 'dead') return;
        if (gameState === 'ready') {
            gameState = 'playing';
            overlay.classList.add('hidden');
        }
        bird.vy = FLAP_FORCE * s();
        bird.flapFrame = frame;
    }

    function spawnPipe() {
        const minY = 80 * s();
        const maxY = H - GROUND_H * s() - PIPE_GAP * s() - minY;
        const topH = minY + Math.random() * maxY;
        if (pipeCount % pointsPerLetter === 0) {
            sectionHue = Math.floor(Math.random() * 360);
        }
        pipeCount++;
        pipes.push({ x: W + 10, topH, scored: false, hue: sectionHue });
    }

    function showWordComplete() {
        gameState = 'wordComplete';
        wordsCompleted++;
        if (wordsCompleted > bestWords) {
            bestWords = wordsCompleted;
            localStorage.setItem('flappyBestWords', String(bestWords));
        }
        document.getElementById('wcWord').textContent = currentWord;
        document.getElementById('wcStats').textContent =
            '\u0421\u043b\u043e\u0432: ' + wordsCompleted + ' | \u0420\u0435\u043a\u043e\u0440\u0434: ' + bestWords;
        document.getElementById('wordComplete').classList.remove('hidden');
    }

    function update() {
        if (gameState !== 'playing') return;
        frame++;

        bird.vy += GRAVITY * s();
        bird.y += bird.vy;

        if (bird.vy < 0) bird.rotation = Math.max(-0.5, bird.vy * 0.08);
        else bird.rotation = Math.min(1.2, bird.vy * 0.06);

        // Random spin trick
        if (!spinning && Math.random() < 0.003) {
            spinning = true;
            spinAngle = 0;
            const birdCx = bird.x + BIRD_SIZE * s() / 2;
            const birdCy = bird.y + BIRD_SIZE * s() / 2;
            spawnParticles(birdCx, birdCy, true);
        }
        if (spinning) {
            spinAngle += 0.25;
            if (spinAngle >= Math.PI * 2) {
                spinAngle = 0;
                spinning = false;
            }
        }

        const groundY = H - GROUND_H * s();
        if (bird.y + BIRD_SIZE * s() > groundY) {
            bird.y = groundY - BIRD_SIZE * s();
            die(); return;
        }
        if (bird.y < 0) { bird.y = 0; bird.vy = 0; }

        if (frame % Math.floor(PIPE_SPAWN / (PIPE_SPEED * s())) === 0) spawnPipe();

        const bx = bird.x, by = bird.y;
        const bs = BIRD_SIZE * s();
        const pw = PIPE_WIDTH * s();
        const pg = PIPE_GAP * s();

        for (let i = pipes.length - 1; i >= 0; i--) {
            const p = pipes[i];
            p.x -= PIPE_SPEED * s();

            if (p.x + pw < 0) { pipes.splice(i, 1); continue; }

            if (!p.scored && p.x + pw < bx) {
                p.scored = true;
                score++;
                const birdCx = bird.x + bs / 2;
                const birdCy = bird.y + bs / 2;
                spawnParticles(birdCx, birdCy, false);
                // Reveal a letter every 5 points
                if (revealedCount < totalLetters && score === getNextThreshold()) {
                    spawnParticles(birdCx, birdCy, true);
                    const pos = revealOrder[revealedCount];
                    revealedSet.add(pos);
                    revealedCount = revealedSet.size;
                    if (revealedCount >= totalLetters) {
                        showWordComplete();
                        return;
                    }
                }
            }

            const margin = 3 * s();
            if (bx + bs - margin > p.x && bx + margin < p.x + pw) {
                if (by + margin < p.topH || by + bs - margin > p.topH + pg) {
                    die(); return;
                }
            }
        }

        groundX -= PIPE_SPEED * s();
        if (groundX <= -24 * s()) groundX = 0;

        updateParticles();
    }

    function die() {
        gameState = 'dead';
        diffLabel.style.display = 'none';
        diffWrap.style.display = 'none';
        complimentBtn.style.display = 'none';
        overlay.classList.remove('hidden');
        overlayText.textContent = 'Game Over';
        overlayWord.textContent = getWordDisplay();
        const left = totalLetters - revealedCount;
        if (left > 0) {
            finalScore.textContent = '\u0421\u0447\u0451\u0442: ' + score + ' | \u0421\u043b\u0435\u0434. \u0431\u0443\u043a\u0432\u0430: ' + getNextThreshold() + ' \u043e\u0447\u043a\u043e\u0432';
        } else {
            finalScore.textContent = '\u0412\u0441\u0435 \u0431\u0443\u043a\u0432\u044b \u043e\u0442\u043a\u0440\u044b\u0442\u044b!';
        }
        finalScore.classList.remove('hidden');
        if (wordsCompleted > 0) {
            startBtn.textContent = '\u0415\u0449\u0451 \u0440\u0430\u0437 (\u0441\u043b\u043e\u0432: ' + wordsCompleted + ')';
        } else {
            startBtn.textContent = '\u0415\u0449\u0451 \u0440\u0430\u0437';
        }
    }

    // Drawing
    function drawBackground() {
        const t = timeTheme;
        const grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, t.skyTop);
        grd.addColorStop(1, t.skyBot);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);

        // Stars for night — twinkling
        if (t.name === 'night') {
            const now = Date.now() * 0.001;
            const stars = [
                [30,40,1.5,0.7],[80,20,1,1.3],[150,60,2,2.1],[200,30,1.2,0.4],[260,15,1.8,3.0],
                [310,50,1,1.8],[350,25,1.5,0.9],[120,80,1,2.5],[370,70,1.3,1.1],[55,100,1,3.5],
                [170,25,1.1,0.2],[95,55,1.7,2.8],[280,40,1.4,1.6],[390,90,1,0.6],[45,70,1.6,2.2],
                [230,10,1.3,3.2],[140,95,0.9,1.0],[320,75,1.8,0.1],[185,42,1.2,2.6],[75,110,1.5,1.9]
            ];
            for (const [sx, sy, sr, phase] of stars) {
                const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(now * (1.5 + phase * 0.3) + phase * 5));
                ctx.globalAlpha = twinkle;
                ctx.fillStyle = '#fff';
                ctx.shadowColor = '#fff';
                ctx.shadowBlur = sr * 3 * s();
                ctx.beginPath();
                ctx.arc(sx*s(), sy*s(), sr*s(), 0, Math.PI*2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
        }

        // Morning sun
        if (t.name === 'morning') {
            ctx.fillStyle = 'rgba(255,230,100,0.3)';
            ctx.beginPath();
            ctx.arc(W - 60*s(), 70*s(), 40*s(), 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,240,150,0.5)';
            ctx.beginPath();
            ctx.arc(W - 60*s(), 70*s(), 24*s(), 0, Math.PI*2);
            ctx.fill();
        }

        // Evening moon
        if (t.name === 'night') {
            ctx.fillStyle = 'rgba(230,230,255,0.15)';
            ctx.beginPath();
            ctx.arc(W - 50*s(), 60*s(), 35*s(), 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = 'rgba(240,240,255,0.3)';
            ctx.beginPath();
            ctx.arc(W - 50*s(), 60*s(), 22*s(), 0, Math.PI*2);
            ctx.fill();
        }

        ctx.fillStyle = t.cloud;
        drawCloud(50*s(), 80*s(), 40*s());
        drawCloud(200*s(), 50*s(), 30*s());
        drawCloud(320*s(), 110*s(), 35*s());
    }
    function drawCloud(x, y, r) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.arc(x+r*0.8, y-r*0.3, r*0.7, 0, Math.PI*2);
        ctx.arc(x+r*1.4, y, r*0.6, 0, Math.PI*2);
        ctx.fill();
    }
    function drawVapeBody(x, y, w, h, flipped, pipeHue) {
        // Main body - tinted gradient
        const grd = ctx.createLinearGradient(x, y, x + w, y);
        grd.addColorStop(0, hsl(pipeHue, 20, 16));
        grd.addColorStop(0.3, hsl(pipeHue, 18, 24));
        grd.addColorStop(0.5, hsl(pipeHue, 16, 30));
        grd.addColorStop(0.7, hsl(pipeHue, 18, 24));
        grd.addColorStop(1, hsl(pipeHue, 20, 16));
        ctx.fillStyle = grd;

        const r = 8 * s();
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.fill();

        // Side highlight
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x + 4*s(), y + r, 6*s(), h - r*2);

        // Screen area
        const scrW = w * 0.5;
        const scrH = Math.min(28 * s(), h * 0.15);
        const scrX = x + (w - scrW) / 2;
        const scrY = flipped ? y + h - scrH - 14*s() : y + 14*s();

        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.roundRect(scrX, scrY, scrW, scrH, 3*s());
        ctx.fill();

        // Screen glow
        ctx.fillStyle = '#00e5ff';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.roundRect(scrX + 2*s(), scrY + 2*s(), scrW - 4*s(), scrH - 4*s(), 2*s());
        ctx.fill();
        ctx.globalAlpha = 1;

        // Animated cells on screen
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(scrX + 2*s(), scrY + 2*s(), scrW - 4*s(), scrH - 4*s(), 2*s());
        ctx.clip();
        const cellS = 4 * s();
        const pad = 2 * s();
        const cols = Math.floor((scrW - 4*s()) / cellS);
        const rows = Math.floor((scrH - 4*s()) / cellS);
        const t = Date.now() * 0.003;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const seed = (col * 7 + row * 13 + Math.floor(x)) * 0.1;
                const flicker = Math.sin(t + seed * 3.7) * Math.cos(t * 0.7 + seed * 2.3);
                if (flicker > 0.1) {
                    const bright = 0.3 + flicker * 0.7;
                    ctx.fillStyle = `rgba(0, 255, 136, ${bright})`;
                    ctx.fillRect(scrX + pad + col * cellS, scrY + pad + row * cellS, cellS - 1*s(), cellS - 1*s());
                }
            }
        }
        ctx.restore();

        // WAKA text
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = `bold ${9*s()}px Arial`;
        ctx.textAlign = 'center';
        const textY = flipped ? scrY - 8*s() : scrY + scrH + 14*s();
        ctx.fillText('WAKA', x + w/2, textY);
    }

    function drawMouthpiece(x, y, w, h, flipped, pipeHue) {
        // Mouthpiece - tinted top piece
        const mpW = w * 0.6;
        const mpH = Math.min(18 * s(), h);
        const mpX = x + (w - mpW) / 2;
        const mpY = flipped ? y + h - mpH : y;

        const grd = ctx.createLinearGradient(mpX, mpY, mpX + mpW, mpY);
        grd.addColorStop(0, hsl(pipeHue, 15, 12));
        grd.addColorStop(0.5, hsl(pipeHue, 12, 20));
        grd.addColorStop(1, hsl(pipeHue, 15, 12));
        ctx.fillStyle = grd;

        ctx.beginPath();
        ctx.roundRect(mpX, mpY, mpW, mpH, 4*s());
        ctx.fill();
    }

    function drawPipe(p) {
        const pw = PIPE_WIDTH * s();
        const pg = PIPE_GAP * s();
        const ph = p.hue || 0;

        // Top vape (flipped, mouthpiece pointing down)
        const topH = p.topH;
        if (topH > 20*s()) {
            const mpZone = Math.min(18*s(), topH * 0.15);
            drawVapeBody(p.x, 0, pw, topH - mpZone, true, ph);
            drawMouthpiece(p.x, topH - mpZone, pw, mpZone, false, ph);
        }

        // Bottom vape (normal, mouthpiece pointing up)
        const botY = p.topH + pg;
        const botH = H - botY;
        if (botH > 20*s()) {
            const mpZone = Math.min(18*s(), botH * 0.15);
            drawMouthpiece(p.x, botY, pw, mpZone, false, ph);
            drawVapeBody(p.x, botY + mpZone, pw, botH - mpZone, false, ph);
        }
    }
    function drawBird() {
        const bs = BIRD_SIZE * s();
        const cx = bird.x + bs / 2;
        const cy = bird.y + bs / 2;

        // Night glow behind bird
        if (timeTheme.name === 'night') {
            const pulse = 0.4 + Math.sin(Date.now() * 0.004) * 0.15;
            const glowR = bs * 1.8;
            const glow = ctx.createRadialGradient(cx, cy, bs * 0.3, cx, cy, glowR);
            glow.addColorStop(0, `hsla(${birdHue}, 80%, 75%, ${pulse})`);
            glow.addColorStop(1, `hsla(${birdHue}, 80%, 75%, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(bird.rotation * 0.6 + spinAngle);

        const r = bs * 0.9; // base radius

        // Bird colors from random hue
        const bodyColor = hsl(birdHue, 60, 88);
        const puffColor = hsl(birdHue, 50, 82);
        const headPuffColor = hsl(birdHue, 45, 92);
        const earColor = hsl(birdHue, 55, 80);

        // Night: make all bird shapes glow
        if (timeTheme.name === 'night') {
            ctx.shadowColor = hsl(birdHue, 80, 75);
            ctx.shadowBlur = 12 * s();
        }

        // --- Fluffy body (behind head) ---
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, r * 0.35, r * 0.65, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body fluff puffs
        ctx.fillStyle = puffColor;
        const bodyPuffs = [[-r*0.35, r*0.2, r*0.28], [r*0.3, r*0.25, r*0.25], [0, r*0.55, r*0.3]];
        for (const [px, py, pr] of bodyPuffs) {
            ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
        }

        // --- Tail (small fluff) ---
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(-r * 0.6, r * 0.1, r * 0.22, 0, Math.PI * 2);
        ctx.fill();

        // --- Floppy ears ---
        // Left ear
        ctx.fillStyle = earColor;
        ctx.beginPath();
        ctx.ellipse(-r * 0.55, -r * 0.1, r * 0.22, r * 0.4, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Ear fluff
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(-r * 0.48, -r * 0.2, r * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // Right ear
        ctx.fillStyle = earColor;
        ctx.beginPath();
        ctx.ellipse(r * 0.55, -r * 0.1, r * 0.22, r * 0.4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(r * 0.48, -r * 0.2, r * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // --- Head (fluffy circle) ---
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(0, -r * 0.1, r * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Fluffy puffs around head
        ctx.fillStyle = headPuffColor;
        const puffs = [
            [-r*0.35, -r*0.35, r*0.2],
            [r*0.35, -r*0.35, r*0.2],
            [-r*0.42, -r*0.05, r*0.18],
            [r*0.42, -r*0.05, r*0.18],
            [0, -r*0.52, r*0.2],
            [-r*0.2, -r*0.48, r*0.16],
            [r*0.2, -r*0.48, r*0.16]
        ];
        for (const [px, py, pr] of puffs) {
            ctx.beginPath();
            ctx.arc(px, py, pr, 0, Math.PI * 2);
            ctx.fill();
        }

        // Turn off glow for face details
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // --- Eyes ---
        // White
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-r * 0.18, -r * 0.18, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(r * 0.18, -r * 0.18, r * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#2c1810';
        ctx.beginPath();
        ctx.arc(-r * 0.15, -r * 0.18, r * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(r * 0.21, -r * 0.18, r * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Eye shine
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-r * 0.12, -r * 0.22, r * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(r * 0.24, -r * 0.22, r * 0.04, 0, Math.PI * 2);
        ctx.fill();

        // --- Nose ---
        ctx.fillStyle = '#2c1810';
        ctx.beginPath();
        ctx.ellipse(r * 0.03, -r * 0.02, r * 0.08, r * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();

        // Nose shine
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(r * 0.01, -r * 0.04, r * 0.025, 0, Math.PI * 2);
        ctx.fill();

        // --- Mouth ---
        ctx.strokeStyle = '#5a3825';
        ctx.lineWidth = 1.2 * s();
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(r * 0.03, r * 0.03);
        ctx.quadraticCurveTo(r * -0.08, r * 0.12, r * -0.15, r * 0.08);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * 0.03, r * 0.03);
        ctx.quadraticCurveTo(r * 0.14, r * 0.12, r * 0.22, r * 0.08);
        ctx.stroke();

        // --- Tongue (when flapping) ---
        if (bird.vy < -2 * s()) {
            ctx.fillStyle = '#ff8fa3';
            ctx.beginPath();
            ctx.ellipse(r * 0.03, r * 0.1, r * 0.06, r * 0.08, 0, 0, Math.PI);
            ctx.fill();
        }

        ctx.restore();
    }
    function drawGround() {
        const t = timeTheme;
        const gH = GROUND_H*s(), gY = H-gH;
        ctx.fillStyle = t.ground; ctx.fillRect(0, gY, W, gH);
        ctx.fillStyle = t.groundLine; ctx.fillRect(0, gY, W, 4*s());
        ctx.fillStyle = t.grass;
        const tW = 24*s();
        for (let x = groundX; x < W+tW; x += tW) {
            ctx.beginPath(); ctx.moveTo(x, gY); ctx.lineTo(x+tW*0.5, gY-6*s()); ctx.lineTo(x+tW, gY); ctx.fill();
        }
    }

    function drawScore() {
        if (gameState !== 'playing') return;
        const text = String(score);
        ctx.font = `bold ${32*s()}px Arial`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#543847'; ctx.lineWidth = 4*s();
        ctx.strokeText(text, W/2, 50*s());
        ctx.fillStyle = '#fff';
        ctx.fillText(text, W/2, 50*s());
    }

    function drawWordBar() {
        if (gameState !== 'playing') return;
        const barH = 40 * s();
        const barY = H - GROUND_H*s() - barH;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, barY, W, barH);

        // Word
        const display = getWordDisplay();
        ctx.font = `bold ${15*s()}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(display, W/2, barY + 16*s());

        // Next letter hint
        if (revealedCount < totalLetters) {
            const next = getNextThreshold();
            ctx.font = `${11*s()}px Arial`;
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText('\u0421\u043b\u0435\u0434. \u0431\u0443\u043a\u0432\u0430: ' + next + ' \u043e\u0447\u043a\u043e\u0432 | \u0421\u043b\u043e\u0432: ' + wordsCompleted, W/2, barY + 32*s());
        }
    }

    function drawReadyHint() {
        if (gameState !== 'ready') return;
        bird.y = H*0.45 + Math.sin(Date.now()*0.004)*8*s();
    }

    function draw() {
        drawBackground();
        pipes.forEach(drawPipe);
        drawGround();
        drawReadyHint();
        drawBird();
        drawParticles();
        drawScore();
        drawWordBar();
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    // Input
    function handleInput(e) {
        e.preventDefault();
        if (gameState === 'dead') return;
        flap();
    }
    canvas.addEventListener('pointerdown', handleInput);
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            if (gameState === 'dead') return;
            flap();
        }
    });

    startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        init();
        overlay.classList.add('hidden');
        overlayWord.textContent = '';
        finalScore.classList.add('hidden');
        gameState = 'ready';
    });

    rulesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('rules').classList.add('hidden');
        init();
        overlayWord.textContent = getWordDisplay();
    });

    document.getElementById('nextWordBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('wordComplete').classList.add('hidden');
        setupWord(pickRandomWord());
        init();
        overlayWord.textContent = getWordDisplay();
    });

    // Difficulty buttons
    const diffBtns = document.querySelectorAll('.diff-btn');
    diffBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newPPL = parseInt(btn.dataset.diff);
            if (newPPL === pointsPerLetter) return;
            // Switch active style
            diffBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // If letters were already revealed, reset word
            if (revealedCount > 0) {
                setupWord(pickRandomWord());
            }
            pointsPerLetter = newPPL;
            overlayWord.textContent = getWordDisplay();
        });
    });

    // Compliment mode toggle
    complimentBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (gameMode === 'compliments') {
            // Turn off
            gameMode = 'normal';
            complimentBtn.classList.remove('active');
            diffLabel.style.display = '';
            diffWrap.style.display = '';
        } else {
            // Turn on
            gameMode = 'compliments';
            complimentBtn.classList.add('active');
            pointsPerLetter = 5;
            // Reset difficulty buttons to easy
            diffBtns.forEach(b => b.classList.remove('active'));
            document.querySelector('.diff-btn.easy').classList.add('active');
            // Hide difficulty
            diffLabel.style.display = 'none';
            diffWrap.style.display = 'none';
        }
        setupWord(pickRandomWord());
        overlayWord.textContent = getWordDisplay();
    });

    // Prevent scroll on mobile
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // Set rules preview
    document.getElementById('rulesWordPreview').textContent = getWordDisplay();

    init();
    overlayWord.textContent = getWordDisplay();
    loop();
})();
