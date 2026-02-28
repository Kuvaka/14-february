// ---- 8-bit Music ----
var startMusic, stopMusic;
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
})();
