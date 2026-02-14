// ---- Welcome screen ----
(function() {
    const container = document.getElementById('heartsContainer');
    const emojis = ['\u2764\ufe0f', '\uD83D\uDC95', '\uD83D\uDC96', '\uD83D\uDC97', '\uD83D\uDC98', '\uD83D\uDC9D'];
    for (let i = 0; i < 20; i++) {
        const h = document.createElement('div');
        h.className = 'heart';
        h.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        h.style.left = Math.random() * 100 + '%';
        h.style.fontSize = (16 + Math.random() * 24) + 'px';
        h.style.animationDuration = (4 + Math.random() * 6) + 's';
        h.style.animationDelay = (Math.random() * 5) + 's';
        container.appendChild(h);
    }

    const welcome = document.getElementById('welcome');
    function showRules() {
        welcome.classList.add('hidden');
        document.getElementById('rules').classList.remove('hidden');
    }
    welcome.addEventListener('click', showRules);
    welcome.addEventListener('touchstart', function(e) { e.preventDefault(); showRules(); });
})();

// ---- Word complete screen stars ----
(function() {
    const container = document.getElementById('wcHeartsContainer');
    const emojis = ['\u2B50', '\uD83C\uDF1F', '\u2728', '\uD83D\uDCAB', '\uD83C\uDF89', '\uD83C\uDF8A'];
    for (let i = 0; i < 20; i++) {
        const h = document.createElement('div');
        h.className = 'heart';
        h.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        h.style.left = Math.random() * 100 + '%';
        h.style.fontSize = (16 + Math.random() * 24) + 'px';
        h.style.animationDuration = (4 + Math.random() * 6) + 's';
        h.style.animationDelay = (Math.random() * 5) + 's';
        container.appendChild(h);
    }
})();
