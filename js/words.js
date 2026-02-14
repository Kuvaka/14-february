// ---- Word list ----
const WORDS = [
    'КОШКА', 'СОБАКА', 'СОЛНЦЕ', 'ДЕРЕВО', 'ОБЛАКО', 'РАКЕТА', 'ЗВЕЗДА', 'МЕДВЕДЬ',
    'БАБОЧКА', 'РАДУГА', 'МОРОЗ', 'ОКЕАН', 'ДОЖДЬ', 'ВЕТЕР', 'ЛУНА', 'ОГОНЬ',
    'ГОРЫ', 'РЕКА', 'ЗАМОК', 'РЫЦАРЬ', 'ДРАКОН', 'ПРИНЦ', 'КНИГА', 'МУЗЫКА',
    'ТАНЕЦ', 'ПИРОГ', 'КОФЕ', 'ЗАКАТ', 'РАССВЕТ', 'СКАЗКА', 'МЕЧТА', 'УДАЧА',
    'ЦВЕТОК', 'ФОНАРЬ', 'МАЯК', 'ПЕСНЯ', 'ИСКРА', 'ВУЛКАН', 'КОМЕТА', 'КОМПАС',
    'МОЛНИЯ', 'ТАЙНА', 'ПЛАМЯ', 'НОЧЬ', 'УТРО', 'ВЕСНА', 'ЛЕТО', 'ОСЕНЬ',
    'ЗИМА', 'МЕТЕЛЬ', 'РУЧЕЙ', 'ОСТРОВ', 'ВОЛНА', 'ПАРУС', 'ШТОРМ', 'НЕБО',
    'ПОЕЗД', 'БАЛКОН', 'ФАКЕЛ', 'РЫБКА', 'ПТИЦА', 'ПИНГВИН', 'ЖИРАФ', 'ТИГР',
    'ПИРАТ', 'РОБОТ', 'АЛМАЗ', 'МАГИЯ', 'ЗЕЛЬЕ', 'ПОРТАЛ', 'КОСМОС', 'ПЛАНЕТА',
    'ГАЛАКТИКА', 'ЗАГАДКА', 'ЧУДО', 'ПОБЕДА', 'ГЕРОЙ', 'РЕКОРД', 'ФИНИШ', 'СТАРТ'
];

function pickRandomWord() {
    return WORDS[Math.floor(Math.random() * WORDS.length)];
}

// ---- Difficulty & current word state ----
let pointsPerLetter = 5;
let currentWord = pickRandomWord();
let letterIndices = [];
let totalLetters = 0;
let revealOrder = [];
let revealedSet = new Set();
let revealedCount = 0;
let wordsCompleted = 0;
let bestWords = parseInt(localStorage.getItem('flappyBestWords') || '0');

function setupWord(word) {
    currentWord = word;
    letterIndices = [];
    word.split('').forEach((ch, i) => { if (ch !== ' ') letterIndices.push(i); });
    totalLetters = letterIndices.length;
    revealOrder = [...letterIndices];
    for (let i = revealOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [revealOrder[i], revealOrder[j]] = [revealOrder[j], revealOrder[i]];
    }
    revealedSet = new Set();
    revealedCount = 0;
}

setupWord(currentWord);

function getWordDisplay() {
    return currentWord.split('').map((ch, i) => {
        if (ch === ' ') return '  ';
        return revealedSet.has(i) ? ch : '_';
    }).join(' ');
}

function getNextThreshold() {
    return (revealedCount + 1) * pointsPerLetter;
}
