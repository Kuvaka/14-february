// ---- 8-bit Music & SFX ----
var startMusic, stopMusic, sfxFlap, sfxBark, sfxHeart;
(function() {
    var ctx, melodyOsc, bassOsc, melodyGain, bassGain, playing = false, timer;

    var melody = [
        [523,150],[659,150],[784,150],[659,150],[523,150],[784,150],[659,300],
        [587,150],[698,150],[880,150],[698,150],[587,150],[880,150],[698,300],
        [523,150],[659,150],[784,150],[880,150],[784,150],[659,150],[523,300],
        [587,150],[523,150],[494,150],[523,300],[0,300]
    ];
    var bass = [
        [131,600],[165,600],[175,600],[131,600]
    ];

    function ensureCtx() {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    function playSeq(notes, type, vol, loop) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type;
        gain.gain.value = vol;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        var t = ctx.currentTime;
        for (var i = 0; i < notes.length; i++) {
            var freq = notes[i][0], dur = notes[i][1] / 1000;
            if (freq > 0) {
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(vol, t);
            } else {
                gain.gain.setValueAtTime(0, t);
            }
            t += dur;
        }
        return { osc: osc, gain: gain, duration: (t - ctx.currentTime) * 1000 };
    }

    function startLoop() {
        if (!playing) return;
        var m = playSeq(melody, 'square', 0.06);
        var b = playSeq(bass, 'square', 0.04);
        melodyOsc = m.osc; melodyGain = m.gain;
        bassOsc = b.osc; bassGain = b.gain;
        timer = setTimeout(function() {
            try { melodyOsc.stop(); } catch(e) {}
            try { bassOsc.stop(); } catch(e) {}
            startLoop();
        }, m.duration);
    }

    startMusic = function() {
        if (playing) return;
        ensureCtx();
        if (ctx.state === 'suspended') ctx.resume();
        playing = true;
        startLoop();
    };

    stopMusic = function() {
        playing = false;
        clearTimeout(timer);
        try { melodyOsc && melodyOsc.stop(); } catch(e) {}
        try { bassOsc && bassOsc.stop(); } catch(e) {}
        melodyOsc = bassOsc = null;
    };

    // Short blip on tap
    sfxFlap = function() {
        ensureCtx();
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'square'; o.connect(g); g.connect(ctx.destination);
        var t = ctx.currentTime;
        o.frequency.setValueAtTime(600, t);
        o.frequency.linearRampToValueAtTime(900, t + 0.06);
        g.gain.setValueAtTime(0.08, t);
        g.gain.linearRampToValueAtTime(0, t + 0.08);
        o.start(t); o.stop(t + 0.08);
    };

    // 8-bit bark — two short descending tones
    sfxBark = function() {
        ensureCtx();
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'square'; o.connect(g); g.connect(ctx.destination);
        var t = ctx.currentTime;
        o.frequency.setValueAtTime(350, t);
        o.frequency.setValueAtTime(250, t + 0.08);
        g.gain.setValueAtTime(0.1, t);
        g.gain.setValueAtTime(0.12, t + 0.08);
        g.gain.linearRampToValueAtTime(0, t + 0.2);
        o.start(t); o.stop(t + 0.2);
    };

    // Sparkle chime on heart/letter reveal
    sfxHeart = function() {
        ensureCtx();
        var notes = [784, 988, 1175], dur = 0.07;
        for (var i = 0; i < notes.length; i++) {
            var o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'square'; o.connect(g); g.connect(ctx.destination);
            var t = ctx.currentTime + i * dur;
            o.frequency.setValueAtTime(notes[i], t);
            g.gain.setValueAtTime(0.07, t);
            g.gain.linearRampToValueAtTime(0, t + 0.12);
            o.start(t); o.stop(t + 0.12);
        }
    };
})();
