(() => {
  'use strict';

  const STORAGE_KEY = 'maya-word-hive-v2';
  const CUSTOM_KEY = 'maya-word-hive-custom-v1';
  const GENERATED_KEY = 'maya-word-hive-generated-v2';
  const SETTINGS_KEY = 'maya-word-hive-settings-v2';
  const CORPUS_CACHE_KEY = 'maya-word-hive-corpus-cache-v2';
  const CURRENT_PUZZLE_KEY = 'maya-current-puzzle-v2';

  const FINAL_TO_BASE = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  const BASE_TO_FINAL = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };
  const HEBREW_RE = /[א-ת]/g;
  const STRICT_HEBREW_RE = /^[א-ת]+$/;
  const NIKKUD_RE = /[\u0591-\u05C7]/g;
  const HEBREW_LETTERS = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'];
  const LETTER_TO_BIT = Object.fromEntries(HEBREW_LETTERS.map((letter, idx) => [letter, 1 << idx]));
  const RAW_WORDLIST_URL = 'https://raw.githubusercontent.com/eyaler/hebrew_wordlists/main/hspell_simple.txt';
  const CORPUS_SAMPLE_LIMIT = 25000;
  const CORPUS_MAX_WORD_LENGTH = 9;
  const GENERATED_LIMIT = 30;

  const DEFAULT_PUZZLES = [
    {
      id: 'honey-letters', name: 'מילים בדבש', emoji: '🍯', center: 'מ', letters: ['א','י','ד','ל','ה','ר'], minLength: 3, theme: 'honey',
      words: ['אמא','אימא','מים','מילה','מילים','מידה','מדד','מרד','למד','מלמד','מלא','רמה','אדמה','למה','מראה','דממה','המים']
    },
    {
      id: 'happy-sun', name: 'שמש שמחה', emoji: '☀️', center: 'ש', letters: ['מ','ח','ק','ל','ו','ר'], minLength: 3, theme: 'berry',
      words: ['שמש','שמח','שלוש','שוק','שור','שחק','חשק','קרש','משק','משקל','שרק','רשרוש','שקשוק','קשקש']
    },
    {
      id: 'cat-path', name: 'חתול בבית', emoji: '🐈', center: 'ת', letters: ['ב','י','ו','ל','ר','ח'], minLength: 3, theme: 'sky',
      words: ['בית','ברית','תור','תבל','תיבול','חתול','חירות','תלוי','חבית','תלול','חוברת','ריבית']
    },
    {
      id: 'rabbit-light', name: 'אור וארנב', emoji: '🐇', center: 'א', letters: ['ב','ה','ו','ר','נ','ל'], minLength: 3, theme: 'mint',
      words: ['אבא','אהבה','אוהב','אור','ארון','אבן','ארנב','אלון','באנו','ברא','באר','האב','נאה','ארובה']
    },
    {
      id: 'cold-dance', name: 'קרח רוקד', emoji: '🧊', center: 'ק', letters: ['ר','ו','ל','ת','ד','ח'], minLength: 3, theme: 'sky',
      words: ['קול','קוד','קור','קרח','רקד','דקל','חוק','קרחת','חולק','קולות','קולח','קרקור','חקוק','קלות']
    },
    {
      id: 'banana-garden', name: 'בננה בגינה', emoji: '🍌', center: 'נ', letters: ['ב','י','ג','ו','ל','ה'], minLength: 3, theme: 'honey',
      words: ['בננה','ניגון','נבון','לבן','גינה','הגון','בניין','יונה','נבל','נוהל','גיליון','לבנה']
    },
    {
      id: 'flower-elephant', name: 'פרח ופיל', emoji: '🌺', center: 'פ', letters: ['ר','ס','י','ח','ל','ה'], minLength: 3, theme: 'berry',
      words: ['פרח','פרי','פרפר','ספר','פרס','פיל','פלפל','יפה','הפרח','חיפה','פסל','פילה','חלף','ספרי']
    },
    {
      id: 'sad-raven', name: 'עורב צבעוני', emoji: '🪶', center: 'ע', letters: ['צ','ב','ו','ר','מ','ה'], minLength: 3, theme: 'mint',
      words: ['עצם','עצוב','עבר','ערב','מערה','עורב','צבע','מעבר','מערב','ערבה','בוער','רבוע','עובר','מבעבע']
    },
    {
      id: 'star-dog', name: 'כלב וכוכב', emoji: '⭐', center: 'כ', letters: ['ל','ב','ו','מ','ר','י'], minLength: 3, theme: 'honey',
      words: ['כלב','כוכב','מלך','כיכר','יכול','כרוב','מכור','כולל','רכוב','כביר','ברך','מבורך']
    },
    {
      id: 'silly-horse', name: 'סוס בסולם', emoji: '🐴', center: 'ס', letters: ['מ','ח','ר','ו','ל','י'], minLength: 3, theme: 'sky',
      words: ['סוס','סיר','סולם','סלים','סיום','מוסר','חסר','חיסול','מסור','רוסי','סלסול','מרסס','סוחר']
    }
  ];

  const FALLBACK_CORPUS_TEXT = `
    אבא אמא אימא אח אחות אור אוכל אופניים ארון אריה אדמה אהבה אוהב אויר אילן אלון ארנב אש אשכול
    בית בלון בננה ברווז ברק בוקר בובה בקבוק בריכה ברית בגד בגדים גן גינה גשם גביע גמל גמד גשר דבש דג דגל דלת
    הד הדס הדגמה הר הרים חוף חלון חתול חלב חליל חיוך חצר חיטה חמוד חזק חבר חגיגה טלה טיול טיפה טוב טעים ים ילד ילדה יונה
    ירח ירק כוכב כלב כיתה כיסא כרוב כדור כף כפית כובע כוורת לימון לילה לבן לבנה לחם למד מורה מים מילה מילים מלך מלכה מראה
    מחברת מחשב משפחה משקל מנורה מסיבה מתנה נחל נמר ניגון נוצה נייר נחש נסיעה ספר סיפור סוס סולם סירה סלון סוכר סתיו עץ
    ענן עולם עוגה עיפרון עכבר ערב עורב צבע פרח פרפר פרי פיל פיצה פעמון פסנתר ציפור צחוק צלחת צמר קיץ קרח קרן קשת קוביה
    רופא רכבת רימון רקד ריקוד רחוב רעש שמש שמח שלום שולחן שוק שיר שירה שער תות תפוח תוף תיק תמונה תמר תינוק תנין
    אדממה אורנים אחריות אוצרות בניינים ברורים גמדים גלידה דגדוגים חלומות חידות חישוקים כוכבים לימונים משחקים מכתבים
    מסמרים נמרים סיפורים עולמות פרפרים קלמרים רכבות שולחנות תפוחים
  `;

  const THEME_GRADIENTS = {
    honey: ['#ffe763', '#ffb130'],
    berry: ['#ffc1e2', '#ff65b1'],
    mint: ['#92ffd7', '#2ed6a3'],
    sky: ['#aee8ff', '#52b7ff']
  };

  const RANKS = [
    { pct: 0, name: 'ניצוץ ראשון' },
    { pct: .12, name: 'טיפת דבש' },
    { pct: .25, name: 'דבורה חרוצה' },
    { pct: .42, name: 'שומר/ת הכוורת' },
    { pct: .60, name: 'אלוף/ת המילים' },
    { pct: .78, name: 'מכשף/ת אותיות' },
    { pct: .94, name: 'מלכות הדבש' }
  ];

  const els = {
    levelSelect: document.getElementById('levelSelect'),
    newGameBtn: document.getElementById('newGameBtn'),
    corpusBtn: document.getElementById('corpusBtn'),
    editorBtn: document.getElementById('editorBtn'),
    helpBtn: document.getElementById('helpBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    levelName: document.getElementById('levelName'),
    levelEmoji: document.getElementById('levelEmoji'),
    pangramBadge: document.getElementById('pangramBadge'),
    scoreNum: document.getElementById('scoreNum'),
    scoreOrb: document.getElementById('scoreOrb'),
    progressFill: document.getElementById('progressFill'),
    rankText: document.getElementById('rankText'),
    foundText: document.getElementById('foundText'),
    foundToggleBtn: document.getElementById('foundToggleBtn'),
    foundToggleCount: document.getElementById('foundToggleCount'),
    currentWord: document.getElementById('currentWord'),
    gameCard: document.getElementById('gameCard'),
    sideCard: document.getElementById('sideCard'),
    sideScrim: document.getElementById('sideScrim'),
    sideCloseBtn: document.getElementById('sideCloseBtn'),
    hiveWrap: document.getElementById('hiveWrap'),
    gestureSvg: document.getElementById('gestureSvg'),
    gesturePolyline: document.getElementById('gesturePolyline'),
    deleteBtn: document.getElementById('deleteBtn'),
    shuffleBtn: document.getElementById('shuffleBtn'),
    enterBtn: document.getElementById('enterBtn'),
    wordsCloud: document.getElementById('wordsCloud'),
    foundCounter: document.getElementById('foundCounter'),
    hintBtn: document.getElementById('hintBtn'),
    revealTableBtn: document.getElementById('revealTableBtn'),
    hintGrid: document.getElementById('hintGrid'),
    starRow: document.getElementById('starRow'),
    toastWrap: document.getElementById('toastWrap'),
    confetti: document.getElementById('confetti'),
    soundSwitch: document.getElementById('soundSwitch'),
    partySwitch: document.getElementById('partySwitch'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    corpusRefreshBtn: document.getElementById('corpusRefreshBtn'),
    corpusStatus: document.getElementById('corpusStatus'),
    corpusMeta: document.getElementById('corpusMeta'),
    corpusDot: document.getElementById('corpusDot'),
    resetLevelBtn: document.getElementById('resetLevelBtn'),
    resetAllBtn: document.getElementById('resetAllBtn'),
    editName: document.getElementById('editName'),
    editEmoji: document.getElementById('editEmoji'),
    editCenter: document.getElementById('editCenter'),
    editLetters: document.getElementById('editLetters'),
    editMinLength: document.getElementById('editMinLength'),
    editTheme: document.getElementById('editTheme'),
    editWords: document.getElementById('editWords'),
    tryEditorBtn: document.getElementById('tryEditorBtn'),
    savePuzzleBtn: document.getElementById('savePuzzleBtn'),
    deleteCustomBtn: document.getElementById('deleteCustomBtn')
  };

  let puzzles = [];
  let currentPuzzle = null;
  let currentLetters = [];
  let input = '';
  let failClearTimer = null;
  let sidePanelOpen = false;
  let state = loadState();
  let settings = loadSettings();
  let audioCtx = null;
  let hintVisible = false;
  let corpus = {
    ready: false,
    loading: false,
    words: [],
    items: [],
    seedItems: [],
    source: 'empty',
    label: 'לא נטען',
    promise: null
  };
  let gesture = emptyGesture();

  function sanitizeWord(word) {
    const cleaned = String(word || '')
      .replace(NIKKUD_RE, '')
      .replace(/[׳״'"`’‘.,;:!?()\[\]{}\-–—_/\\|·•*+~^=<>0-9a-zA-Z]/g, '')
      .replace(/\s+/g, '');
    const letters = cleaned.match(HEBREW_RE) || [];
    return letters.map(ch => FINAL_TO_BASE[ch] || ch).join('');
  }

  function sanitizeCorpusWord(raw) {
    const cleaned = String(raw || '').trim().replace(NIKKUD_RE, '');
    if (!STRICT_HEBREW_RE.test(cleaned)) return '';
    return [...cleaned].map(ch => FINAL_TO_BASE[ch] || ch).join('');
  }

  function toFinalDisplay(word) {
    const base = sanitizeWord(word);
    if (!base) return '';
    const chars = [...base];
    const last = chars[chars.length - 1];
    if (BASE_TO_FINAL[last]) chars[chars.length - 1] = BASE_TO_FINAL[last];
    return chars.join('');
  }

  function normalizeLetter(letter) {
    return sanitizeWord(letter).slice(0, 1);
  }

  function unique(arr) {
    return [...new Set(arr.filter(Boolean))];
  }

  function shuffleArray(arr) {
    return arr.map(value => ({ value, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ value }) => value);
  }

  function scoreWord(word, puzzle) {
    const len = [...word].length;
    let score = len <= 3 ? 1 : (len === 4 ? 2 : len);
    if (isPangram(word, puzzle)) score += 7;
    return score;
  }

  function isPangram(word, puzzle) {
    const set = new Set([...word]);
    const all = [puzzle.center, ...puzzle.letters];
    return all.every(l => set.has(l));
  }

  function wordMask(word) {
    let mask = 0;
    for (const ch of word) {
      const bit = LETTER_TO_BIT[ch];
      if (bit === undefined) return 0;
      mask |= bit;
    }
    return mask;
  }

  function bitCount(mask) {
    let n = mask;
    let count = 0;
    while (n) {
      n &= n - 1;
      count++;
    }
    return count;
  }

  function maskToLetters(mask) {
    return HEBREW_LETTERS.filter(letter => (mask & LETTER_TO_BIT[letter]) !== 0);
  }

  function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function isCorpusCandidate(word) {
    if (!word || word.length < 3 || word.length > CORPUS_MAX_WORD_LENGTH) return false;
    const mask = wordMask(word);
    if (!mask) return false;
    const uniqueLetters = bitCount(mask);
    return uniqueLetters >= 2 && uniqueLetters <= 7;
  }

  function preparePuzzle(raw, custom = false) {
    const center = normalizeLetter(raw.center);
    const letters = unique((raw.letters || []).map(normalizeLetter)).filter(l => l !== center).slice(0, 6);
    const minLength = Number(raw.minLength || 3);
    const allowed = new Set([center, ...letters]);
    const words = unique((raw.words || []).map(sanitizeWord))
      .filter(w => w.length >= minLength && w.includes(center) && [...w].every(ch => allowed.has(ch)))
      .sort((a, b) => a.length - b.length || toFinalDisplay(a).localeCompare(toFinalDisplay(b), 'he'));
    return {
      id: raw.id || `custom-${Date.now()}`,
      name: raw.name || 'שלב בלי שם',
      emoji: raw.emoji || '✨',
      center,
      letters,
      minLength,
      theme: raw.theme || 'honey',
      words,
      custom,
      generated: !!raw.generated,
      source: raw.source || ''
    };
  }

  function loadCustomPuzzles() {
    try {
      return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]')
        .map(p => preparePuzzle(p, true))
        .filter(p => p.center && p.letters.length === 6 && p.words.length);
    } catch {
      return [];
    }
  }

  function saveCustomPuzzles(custom) {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
  }

  function loadGeneratedPuzzles() {
    try {
      return JSON.parse(localStorage.getItem(GENERATED_KEY) || '[]')
        .map(p => preparePuzzle({ ...p, generated: true }))
        .filter(p => p.center && p.letters.length === 6 && p.words.length);
    } catch {
      return [];
    }
  }

  function saveGeneratedPuzzle(puzzle) {
    const existing = loadGeneratedPuzzles().filter(p => p.id !== puzzle.id);
    const saved = [puzzle, ...existing].slice(0, GENERATED_LIMIT);
    localStorage.setItem(GENERATED_KEY, JSON.stringify(saved));
  }

  function rebuildPuzzleList() {
    const generated = loadGeneratedPuzzles();
    const custom = loadCustomPuzzles();
    puzzles = DEFAULT_PUZZLES.map(p => preparePuzzle(p)).concat(generated, custom);
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadSettings() {
    const defaults = { sound: true, party: true };
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
    } catch {
      return defaults;
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function getPuzzleState(id) {
    if (!state[id]) state[id] = { found: [], score: 0, hints: 0 };
    return state[id];
  }

  function setTheme(theme) {
    const colors = THEME_GRADIENTS[theme] || THEME_GRADIENTS.honey;
    document.documentElement.style.setProperty('--honey', colors[0]);
    document.documentElement.style.setProperty('--honey-dark', colors[1]);
  }

  function init() {
    seedFallbackCorpus();
    rebuildPuzzleList();
    renderLevelSelect();
    const requested = localStorage.getItem(CURRENT_PUZZLE_KEY);
    const first = puzzles.find(p => p.id === requested) || puzzles[0];
    loadPuzzle(first.id);
    bindEvents();
    updateSwitches();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('resize', updateGestureLine);
    loadCorpus(false).catch(() => {});
    setTimeout(() => toast('ברוכים הבאים לכוורת של מאיה 🐝', 'gold'), 360);
  }

  function seedFallbackCorpus() {
    const words = DEFAULT_PUZZLES.flatMap(puzzle => puzzle.words).concat(FALLBACK_CORPUS_TEXT.split(/\s+/));
    setCorpusWords(words, 'fallback', 'מיני קורפוס מקומי', true);
  }

  function renderLevelSelect() {
    els.levelSelect.innerHTML = '';
    puzzles.forEach(puzzle => {
      const opt = document.createElement('option');
      opt.value = puzzle.id;
      const tag = puzzle.custom ? ' · שלי' : (puzzle.generated ? ' · קורפוס' : '');
      opt.textContent = `${puzzle.emoji} ${puzzle.name}${tag}`;
      els.levelSelect.appendChild(opt);
    });
  }

  function loadPuzzle(id) {
    currentPuzzle = puzzles.find(p => p.id === id) || puzzles[0];
    localStorage.setItem(CURRENT_PUZZLE_KEY, currentPuzzle.id);
    els.levelSelect.value = currentPuzzle.id;
    setSidePanelOpen(false);
    clearFailedInputTimer();
    input = '';
    currentLetters = [...currentPuzzle.letters];
    setTheme(currentPuzzle.theme);
    clearGesture(true);
    renderPuzzle();
    renderProgress();
    renderFoundWords();
    renderHintTable();
    toast(`נטען: ${currentPuzzle.name}`, currentPuzzle.generated ? 'good' : 'gold');
  }

  function renderPuzzle() {
    els.levelName.textContent = currentPuzzle.name;
    els.levelEmoji.textContent = currentPuzzle.emoji;
    els.pangramBadge.textContent = `מילות זהב: ${currentPuzzle.words.filter(w => isPangram(w, currentPuzzle)).length}`;
    const tiles = [...els.hiveWrap.querySelectorAll('.tile')];
    tiles[0].textContent = currentPuzzle.center;
    tiles[0].dataset.letter = currentPuzzle.center;
    tiles[0].setAttribute('aria-label', `אות זהובה ${currentPuzzle.center}`);
    currentLetters.forEach((letter, idx) => {
      const tile = tiles[idx + 1];
      tile.textContent = letter;
      tile.dataset.letter = letter;
      tile.setAttribute('aria-label', `אות ${letter}`);
    });
    renderInput();
    els.gameCard.classList.toggle('level-finished', isLevelComplete());
  }

  function renderInput(className = '') {
    const display = toFinalDisplay(input);
    els.currentWord.textContent = display || 'לחצו או החליקו על אותיות';
    els.currentWord.className = `current-word ${display ? '' : 'empty'} ${className}`.trim();
    if (className) window.setTimeout(() => renderInput(), 420);
  }

  function renderProgress() {
    const ps = getPuzzleState(currentPuzzle.id);
    const found = ps.found || [];
    const total = currentPuzzle.words.length;
    const pct = total ? found.length / total : 0;
    const maxScore = currentPuzzle.words.reduce((sum, w) => sum + scoreWord(w, currentPuzzle), 0);
    const score = found.reduce((sum, w) => sum + scoreWord(w, currentPuzzle), 0);
    ps.score = score;
    els.scoreNum.textContent = String(score);
    els.scoreOrb.style.setProperty('--pct', `${Math.round((maxScore ? score / maxScore : 0) * 100)}%`);
    els.progressFill.style.width = `${Math.round(pct * 100)}%`;
    els.foundText.textContent = `${found.length} מתוך ${total} מילים`;
    els.foundCounter.textContent = `${found.length}/${total}`;
    els.foundToggleCount.textContent = `${found.length}/${total}`;
    els.foundToggleBtn.setAttribute('aria-label', `מילים שנמצאו: ${found.length} מתוך ${total}`);
    const rank = [...RANKS].reverse().find(r => pct >= r.pct) || RANKS[0];
    els.rankText.textContent = `דרגה: ${rank.name}`;
    const stars = Math.min(5, Math.floor(pct * 5.999));
    els.starRow.textContent = '★★★★★'.slice(0, stars) + '☆☆☆☆☆'.slice(0, 5 - stars);
    els.gameCard.classList.toggle('level-finished', isLevelComplete());
    saveState();
  }

  function renderFoundWords() {
    const ps = getPuzzleState(currentPuzzle.id);
    const found = [...(ps.found || [])].sort((a,b) => a.length - b.length || toFinalDisplay(a).localeCompare(toFinalDisplay(b), 'he'));
    els.wordsCloud.innerHTML = '';
    if (!found.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-list';
      empty.textContent = 'עוד אין מילים. הכוורת מחכה לבאזז הראשון.';
      els.wordsCloud.appendChild(empty);
      return;
    }
    found.forEach(word => {
      const chip = document.createElement('div');
      chip.className = `word-chip ${isPangram(word, currentPuzzle) ? 'golden' : ''}`;
      chip.textContent = toFinalDisplay(word);
      chip.title = `${scoreWord(word, currentPuzzle)} נקודות`;
      els.wordsCloud.appendChild(chip);
    });
  }

  function renderHintTable() {
    const ps = getPuzzleState(currentPuzzle.id);
    const foundSet = new Set(ps.found || []);
    const remaining = currentPuzzle.words.filter(w => !foundSet.has(w));
    const grouped = new Map();
    remaining.forEach(word => {
      const first = toFinalDisplay(word)[0];
      const key = `${word.length}-${first}`;
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    els.hintGrid.innerHTML = '';
    if (!remaining.length) {
      const row = document.createElement('div');
      row.className = 'hint-row';
      row.textContent = 'כל המילים נמצאו. הכוורת מצדיעה.';
      els.hintGrid.appendChild(row);
      return;
    }
    [...grouped.entries()]
      .map(([key, count]) => {
        const [len, first] = key.split('-');
        return { len: Number(len), first, count };
      })
      .sort((a,b) => a.len - b.len || a.first.localeCompare(b.first, 'he'))
      .forEach(item => {
        const row = document.createElement('div');
        row.className = 'hint-row';
        row.innerHTML = `<span>${item.len} אותיות, מתחיל ב־${item.first}</span><strong>${item.count}</strong>`;
        els.hintGrid.appendChild(row);
      });
  }

  function appendLetter(letter, tile) {
    startFreshAfterFailedInput();
    input += letter;
    renderInput();
    sparkleTile(tile);
    blip(420 + Math.min(input.length, 16) * 20, .08, 'triangle');
  }

  function sparkleTile(tile) {
    if (!tile) return;
    tile.classList.add('hit', 'spark');
    window.setTimeout(() => tile.classList.remove('hit'), 180);
    window.setTimeout(() => tile.classList.remove('spark'), 560);
  }

  function deleteLetter() {
    clearFailedInputTimer();
    input = input.slice(0, -1);
    renderInput();
    blip(180, .05, 'sine');
  }

  function shuffleLetters() {
    currentLetters = shuffleArray(currentLetters);
    renderPuzzle();
    blip(260, .08, 'square');
    toast('ערבבתי את האותיות. עכשיו הן נראות אשמות.', 'gold');
  }

  function submitWord() {
    const word = sanitizeWord(input);
    const ps = getPuzzleState(currentPuzzle.id);
    const allowed = new Set([currentPuzzle.center, ...currentPuzzle.letters]);
    const pretty = toFinalDisplay(word);

    if (!word) return toast('צריך קודם לבנות מילה.', 'bad');
    if (word.length < currentPuzzle.minLength) return fail(`קצר מדי. צריך לפחות ${currentPuzzle.minLength} אותיות.`);
    if (!word.includes(currentPuzzle.center)) return fail(`חסרה האות הזהובה ${currentPuzzle.center}. היא קצת דיווה.`);
    if (![...word].every(ch => allowed.has(ch))) return fail('יש במילה אות שלא גרה בכוורת הזאת.');
    if (ps.found.includes(word)) return fail(`${pretty} כבר ברשימה.`);
    if (!currentPuzzle.words.includes(word)) return fail(`${pretty} לא נמצאת ברשימת השלב. אפשר להוסיף אותה בעורך.`);

    ps.found.push(word);
    input = '';
    renderInput('success');
    renderProgress();
    renderFoundWords();
    renderHintTable();
    const score = scoreWord(word, currentPuzzle);
    const gold = isPangram(word, currentPuzzle);
    makeParticles(gold ? 'זהב!' : `+${score}`, gold);
    blip(gold ? 740 : 620, .13, 'sine');
    if (gold || isLevelComplete()) launchConfetti(gold ? 110 : 170);
    toast(gold ? `מילת זהב: ${pretty}!` : `יפה! ${pretty} שווה ${score} נקודות`, gold ? 'gold' : 'good');
    if (isLevelComplete()) {
      window.setTimeout(() => toast('כל המילים נמצאו. מאיה עושה גלגלון דבש.', 'gold'), 500);
    }
  }

  function fail(message) {
    const failedWord = sanitizeWord(input);
    renderInput('invalid');
    blip(120, .08, 'sawtooth');
    toast(message, 'bad');
    scheduleFailedInputClear(failedWord);
  }

  function clearFailedInputTimer() {
    if (!failClearTimer) return;
    window.clearTimeout(failClearTimer);
    failClearTimer = null;
  }

  function startFreshAfterFailedInput() {
    if (!failClearTimer) return;
    clearFailedInputTimer();
    input = '';
    renderInput();
  }

  function scheduleFailedInputClear(failedWord) {
    clearFailedInputTimer();
    if (!failedWord) return;
    failClearTimer = window.setTimeout(() => {
      failClearTimer = null;
      if (sanitizeWord(input) !== failedWord) return;
      input = '';
      renderInput();
    }, 430);
  }

  function isLevelComplete() {
    const ps = getPuzzleState(currentPuzzle.id);
    return currentPuzzle.words.length > 0 && (ps.found || []).length >= currentPuzzle.words.length;
  }

  function giveHint() {
    const ps = getPuzzleState(currentPuzzle.id);
    const foundSet = new Set(ps.found || []);
    const remaining = currentPuzzle.words.filter(w => !foundSet.has(w));
    if (!remaining.length) return toast('אין מה לרמוז. ניצחתם את הכוורת.', 'good');
    const word = remaining[Math.floor(Math.random() * remaining.length)];
    ps.hints = (ps.hints || 0) + 1;
    saveState();
    const shown = toFinalDisplay(word);
    const first = shown[0];
    const last = shown[shown.length - 1];
    toast(`רמז: מילה של ${word.length} אותיות, מתחילה ב־${first} ומסתיימת ב־${last}`, 'gold');
    hintVisible = true;
    els.hintGrid.hidden = false;
    els.revealTableBtn.textContent = 'הסתר טבלה';
    renderHintTable();
  }

  function toggleHintTable() {
    hintVisible = !hintVisible;
    els.hintGrid.hidden = !hintVisible;
    els.revealTableBtn.textContent = hintVisible ? 'הסתר טבלה' : 'טבלת אורכים';
    if (hintVisible) renderHintTable();
  }

  function setSidePanelOpen(open) {
    sidePanelOpen = !!open;
    els.sideCard.classList.toggle('open', sidePanelOpen);
    els.sideScrim.classList.toggle('open', sidePanelOpen);
    els.foundToggleBtn.classList.toggle('open', sidePanelOpen);
    els.foundToggleBtn.setAttribute('aria-expanded', String(sidePanelOpen));
  }

  function toggleSidePanel() {
    setSidePanelOpen(!sidePanelOpen);
  }

  function toast(message, type = '') {
    const node = document.createElement('div');
    node.className = `toast ${type}`.trim();
    node.textContent = message;
    els.toastWrap.appendChild(node);
    window.setTimeout(() => node.remove(), 2900);
  }

  function makeParticles(text, gold = false) {
    const rect = els.currentWord.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const amount = gold ? 12 : 7;
    for (let i = 0; i < amount; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.textContent = i === 0 ? text : (gold ? '✦' : ['🍯','✨','🐝'][i % 3]);
      p.style.left = `${centerX + (Math.random() - .5) * 120}px`;
      p.style.top = `${centerY + (Math.random() - .5) * 40}px`;
      p.style.setProperty('--dx', `${(Math.random() - .5) * 160}px`);
      p.style.color = gold ? '#f59e00' : ['#ff4fa3','#8565ff','#20b970'][i % 3];
      document.body.appendChild(p);
      window.setTimeout(() => p.remove(), 850);
    }
  }

  function resizeCanvas() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    els.confetti.width = Math.floor(window.innerWidth * dpr);
    els.confetti.height = Math.floor(window.innerHeight * dpr);
    els.confetti.style.width = `${window.innerWidth}px`;
    els.confetti.style.height = `${window.innerHeight}px`;
    const ctx = els.confetti.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function launchConfetti(baseAmount = 90) {
    if (!settings.party && baseAmount > 100) baseAmount = 55;
    const ctx = els.confetti.getContext('2d');
    const colors = ['#ffcf2e', '#ff4fa3', '#52b7ff', '#2ed6a3', '#8565ff'];
    const pieces = Array.from({ length: settings.party ? baseAmount : Math.floor(baseAmount * .55) }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * window.innerHeight * .35,
      r: 5 + Math.random() * 8,
      vx: -2 + Math.random() * 4,
      vy: 3 + Math.random() * 5,
      rot: Math.random() * Math.PI,
      spin: -.16 + Math.random() * .32,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > .45 ? 'rect' : 'circle'
    }));
    let frames = 0;
    function frame() {
      frames++;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      pieces.forEach(piece => {
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.vy += .045;
        piece.rot += piece.spin;
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rot);
        ctx.fillStyle = piece.color;
        if (piece.shape === 'rect') ctx.fillRect(-piece.r / 2, -piece.r / 2, piece.r, piece.r * .62);
        else { ctx.beginPath(); ctx.arc(0, 0, piece.r / 2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      });
      if (frames < 165) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
    frame();
  }

  function blip(freq = 440, volume = .09, type = 'sine') {
    if (!settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + .12);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + .14);
    } catch {}
  }

  function setCorpusWords(rawWords, source, label, silent = false) {
    const words = unique(rawWords.map(word => sanitizeWord(word)).filter(isCorpusCandidate));
    const items = words.map(w => ({ w, mask: wordMask(w), unique: bitCount(wordMask(w)), len: w.length }));
    corpus.ready = true;
    corpus.words = words;
    corpus.items = items;
    corpus.seedItems = items.filter(item => item.unique >= 5 && item.unique <= 7);
    corpus.source = source;
    corpus.label = label;
    if (!silent) updateCorpusStatus();
  }

  function parseCorpusText(text) {
    const raw = text.split(/\r?\n|\s+/);
    return unique(raw.map(sanitizeCorpusWord).filter(isCorpusCandidate));
  }

  function sampleWords(words, limit) {
    if (words.length <= limit) return words;
    const sample = words.slice(0, limit);
    for (let i = limit; i < words.length; i++) {
      const j = Math.floor(Math.random() * (i + 1));
      if (j < limit) sample[j] = words[i];
    }
    return sample;
  }

  function readCorpusCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CORPUS_CACHE_KEY) || 'null');
      if (!cached || !Array.isArray(cached.words) || cached.words.length < 1000) return null;
      return cached;
    } catch {
      return null;
    }
  }

  function saveCorpusCache(words) {
    try {
      localStorage.setItem(CORPUS_CACHE_KEY, JSON.stringify({ ts: Date.now(), words }));
    } catch {
      // The game works without a cache. Some browsers are tiny pantry goblins.
    }
  }

  async function loadCorpus(force = false) {
    if (corpus.loading) return corpus.promise;
    if (!force && corpus.source === 'remote') return corpus;

    corpus.loading = true;
    corpus.promise = (async () => {
      setCorpusStatus('טוענת קורפוס עברי...', 'בודקת מטמון ואז מנסה את GitHub', 'loading');
      const cached = !force ? readCorpusCache() : null;
      if (cached) {
        setCorpusWords(cached.words, 'cache', 'קורפוס ממטמון', true);
        updateCorpusStatus('קורפוס מוכן ממטמון', `${corpus.words.length.toLocaleString('he-IL')} מילים מסוננות. מעדכנת ברקע...`, 'cache');
      }

      try {
        const response = await fetch(RAW_WORDLIST_URL, { cache: force ? 'reload' : 'force-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        const words = parseCorpusText(text);
        if (words.length < 1000) throw new Error('מעט מדי מילים אחרי סינון');
        setCorpusWords(words, 'remote', 'hspell_simple.txt');
        saveCorpusCache(sampleWords(words, CORPUS_SAMPLE_LIMIT));
        updateCorpusStatus('קורפוס חי ומוכן', `${words.length.toLocaleString('he-IL')} מילים מסוננות מ־hspell_simple.txt`, 'ready');
      } catch (err) {
        if (cached) {
          updateCorpusStatus('קורפוס ממטמון מוכן', `${corpus.words.length.toLocaleString('he-IL')} מילים. GitHub לא ענה עכשיו, לא נורא.`, 'cache');
        } else {
          seedFallbackCorpus();
          updateCorpusStatus('מיני קורפוס מקומי', `${corpus.words.length.toLocaleString('he-IL')} מילים מובנות. כדי לקבל את הקורפוס הגדול צריך חיבור רשת.`, 'fallback');
        }
      } finally {
        corpus.loading = false;
        updateCorpusButton();
      }
      return corpus;
    })();
    updateCorpusButton();
    return corpus.promise;
  }

  function setCorpusStatus(status, meta = '', kind = '') {
    if (els.corpusStatus) els.corpusStatus.textContent = status;
    if (els.corpusMeta) els.corpusMeta.textContent = meta;
    if (els.corpusDot) {
      els.corpusDot.className = `corpus-dot ${kind}`.trim();
      els.corpusDot.setAttribute('aria-label', status);
    }
  }

  function updateCorpusStatus(status, meta, kind) {
    const statusText = status || (corpus.source === 'remote' ? 'קורפוס חי ומוכן' : corpus.label);
    const kindName = kind || (corpus.source === 'remote' ? 'ready' : corpus.source);
    const metaText = meta || `${corpus.words.length.toLocaleString('he-IL')} מילים מסוננות זמינות ליצירת שלבים אקראיים`;
    setCorpusStatus(statusText, metaText, kindName);
  }

  function updateCorpusButton() {
    if (!els.corpusBtn) return;
    els.corpusBtn.disabled = !!corpus.loading;
    els.corpusBtn.querySelector('.label-text').textContent = corpus.loading ? 'טוענת...' : 'שלב קורפוס';
  }

  async function generateCorpusPuzzle() {
    if (corpus.loading) {
      toast('רגע, הקורפוס עוד לועס אותיות.', 'gold');
      await corpus.promise;
    } else if (corpus.source === 'fallback') {
      await loadCorpus(false);
    }

    updateCorpusButton();
    const puzzle = buildRandomPuzzleFromCorpus();
    if (!puzzle) {
      const fallback = preparePuzzle({ ...randomItem(DEFAULT_PUZZLES), id: `random-safe-${Date.now()}`, name: 'כוורת אקראית קטנה', generated: true, source: 'fallback' });
      saveGeneratedPuzzle(fallback);
      rebuildPuzzleList();
      renderLevelSelect();
      loadPuzzle(fallback.id);
      toast('הקורפוס לא נתן שלב יפה, אז שלפתי שלב קטן ובטוח.', 'gold');
      return;
    }

    saveGeneratedPuzzle(puzzle);
    rebuildPuzzleList();
    renderLevelSelect();
    loadPuzzle(puzzle.id);
    launchConfetti(65);
    const sourceText = corpus.source === 'remote' ? 'מהקורפוס הגדול' : (corpus.source === 'cache' ? 'מהמטמון' : 'מהמיני קורפוס');
    toast(`נוצר שלב חדש ${sourceText}: ${puzzle.words.length} מילים`, 'good');
  }

  function buildRandomPuzzleFromCorpus() {
    const items = corpus.items || [];
    const seeds = corpus.seedItems || [];
    if (items.length < 50 || seeds.length < 10) return null;

    const minLength = 3;
    const idealCount = 32;
    const themes = Object.keys(THEME_GRADIENTS);
    const emojis = ['🧬','🌈','🍯','✨','🐝','🪄','🎲','🌻','🚀','🦄','🍓','🧁'];
    const seenMasks = new Set();
    let best = null;
    const tries = Math.min(520, Math.max(220, Math.floor(seeds.length / 8)));

    for (let i = 0; i < tries; i++) {
      const seed = randomItem(seeds);
      if (!seed) continue;
      let mask = seed.mask;
      let guard = 0;
      while (bitCount(mask) < 7 && guard < 10) {
        const donor = randomItem(seeds) || seed;
        const donorLetters = maskToLetters(donor.mask).filter(letter => (mask & LETTER_TO_BIT[letter]) === 0);
        const nextLetter = donorLetters.length ? randomItem(donorLetters) : randomItem(HEBREW_LETTERS);
        mask |= LETTER_TO_BIT[nextLetter];
        guard++;
      }
      if (bitCount(mask) !== 7 || seenMasks.has(mask)) continue;
      seenMasks.add(mask);

      const subset = [];
      for (const item of items) {
        if ((item.mask & ~mask) === 0 && item.len >= minLength) subset.push(item);
      }
      if (subset.length < 12) continue;

      const letters = maskToLetters(mask);
      for (const center of letters) {
        const centerBit = LETTER_TO_BIT[center];
        const chosen = subset.filter(item => (item.mask & centerBit) !== 0);
        const count = chosen.length;
        if (count < 12 || count > 90) continue;
        const golds = chosen.filter(item => item.unique === 7).length;
        if (golds < 1) continue;
        const avgLen = chosen.reduce((sum, item) => sum + item.len, 0) / count;
        const rarePenalty = letters.some(letter => ['ז','ט','ץ','ף'].includes(letter)) ? 5 : 0;
        const score = 120 - Math.abs(count - idealCount) * 1.8 + Math.min(golds, 6) * 8 - Math.max(0, avgLen - 6.2) * 7 - rarePenalty + Math.random() * 12;
        if (!best || score > best.score) {
          best = { mask, center, words: chosen.map(item => item.w), score, golds };
        }
      }
    }

    if (!best) return null;
    const letters = shuffleArray(maskToLetters(best.mask).filter(letter => letter !== best.center));
    const words = unique(best.words).sort((a, b) => a.length - b.length || toFinalDisplay(a).localeCompare(toFinalDisplay(b), 'he'));
    const now = Date.now();
    const label = corpus.source === 'remote' ? 'קורפוס' : (corpus.source === 'cache' ? 'מטמון' : 'מקומי');
    return preparePuzzle({
      id: `corpus-${now}-${best.center}-${best.mask}`,
      name: `כוורת ${label}`,
      emoji: randomItem(emojis),
      center: best.center,
      letters,
      minLength: 3,
      theme: randomItem(themes),
      words,
      generated: true,
      source: corpus.source
    });
  }

  function emptyGesture() {
    return { active: false, pointerId: null, tiles: [], points: [], moved: false, clearTimer: null };
  }

  function handlePointerDown(e) {
    const tile = e.target.closest('.tile');
    if (!tile) return;
    e.preventDefault();
    clearGesture(true);
    gesture = emptyGesture();
    gesture.active = true;
    gesture.pointerId = e.pointerId;
    els.hiveWrap.classList.add('sliding');
    try { els.hiveWrap.setPointerCapture(e.pointerId); } catch {}
    addTileToGesture(tile);
    updateGestureLine(e);
  }

  function handlePointerMove(e) {
    if (!gesture.active || e.pointerId !== gesture.pointerId) return;
    e.preventDefault();
    const tile = tileFromPoint(e.clientX, e.clientY);
    if (tile && tile.classList.contains('tile')) addTileToGesture(tile);
    if (gesture.tiles.length > 1) gesture.moved = true;
    updateGestureLine(e);
  }

  function handlePointerUp(e) {
    if (!gesture.active || e.pointerId !== gesture.pointerId) return;
    e.preventDefault();
    const wasSlide = gesture.tiles.length > 1 || gesture.moved;
    if (wasSlide) {
      updateGestureLine();
      window.setTimeout(() => submitWord(), 90);
    }
    clearGesture(false);
  }

  function handlePointerCancel(e) {
    if (!gesture.active || e.pointerId !== gesture.pointerId) return;
    clearGesture(false);
  }

  function tileFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el || !el.closest) return null;
    return el.closest('.tile');
  }

  function addTileToGesture(tile) {
    const last = gesture.tiles[gesture.tiles.length - 1];
    if (last === tile) return;
    gesture.tiles.push(tile);
    tile.classList.add('slide-selected');
    appendLetter(tile.dataset.letter, tile);
    const hiveRect = els.hiveWrap.getBoundingClientRect();
    const rect = tile.getBoundingClientRect();
    gesture.points.push({
      x: rect.left + rect.width / 2 - hiveRect.left,
      y: rect.top + rect.height / 2 - hiveRect.top
    });
  }

  function updateGestureLine(e) {
    if (!els.gestureSvg || !els.gesturePolyline) return;
    const rect = els.hiveWrap.getBoundingClientRect();
    els.gestureSvg.setAttribute('viewBox', `0 0 ${Math.max(1, rect.width)} ${Math.max(1, rect.height)}`);
    const points = gesture.points.slice();
    if (gesture.active && e && points.length) {
      points.push({
        x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)),
        y: Math.max(0, Math.min(rect.height, e.clientY - rect.top))
      });
    }
    els.gesturePolyline.setAttribute('points', points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
  }

  function clearGesture(immediate = false) {
    if (gesture.clearTimer) window.clearTimeout(gesture.clearTimer);
    const tiles = [...els.hiveWrap.querySelectorAll('.slide-selected')];
    const clear = () => {
      tiles.forEach(tile => tile.classList.remove('slide-selected'));
      els.hiveWrap.classList.remove('sliding');
      if (els.gesturePolyline) els.gesturePolyline.setAttribute('points', '');
    };
    if (immediate) clear();
    else gesture.clearTimer = window.setTimeout(clear, 220);
    gesture.active = false;
    gesture.pointerId = null;
  }

  function bindEvents() {
    els.levelSelect.addEventListener('change', e => loadPuzzle(e.target.value));
    els.newGameBtn.addEventListener('click', () => {
      const idx = Math.floor(Math.random() * puzzles.length);
      loadPuzzle(puzzles[idx].id);
    });
    els.corpusBtn.addEventListener('click', generateCorpusPuzzle);
    els.helpBtn.addEventListener('click', () => openModal('helpModal'));
    els.settingsBtn.addEventListener('click', () => openModal('settingsModal'));
    els.editorBtn.addEventListener('click', () => openModal('editorModal'));
    document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.close)));
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(backdrop.id); });
    });
    els.hiveWrap.addEventListener('pointerdown', handlePointerDown);
    els.hiveWrap.addEventListener('pointermove', handlePointerMove);
    els.hiveWrap.addEventListener('pointerup', handlePointerUp);
    els.hiveWrap.addEventListener('pointercancel', handlePointerCancel);
    els.deleteBtn.addEventListener('click', deleteLetter);
    els.shuffleBtn.addEventListener('click', shuffleLetters);
    els.enterBtn.addEventListener('click', submitWord);
    els.foundToggleBtn.addEventListener('click', toggleSidePanel);
    els.sideScrim.addEventListener('click', () => setSidePanelOpen(false));
    els.sideCloseBtn.addEventListener('click', () => setSidePanelOpen(false));
    els.hintBtn.addEventListener('click', giveHint);
    els.revealTableBtn.addEventListener('click', toggleHintTable);
    els.soundSwitch.addEventListener('click', () => { settings.sound = !settings.sound; saveSettings(); updateSwitches(); blip(520, .1); });
    els.partySwitch.addEventListener('click', () => { settings.party = !settings.party; saveSettings(); updateSwitches(); if (settings.party) launchConfetti(60); });
    els.fullscreenBtn.addEventListener('click', goFullscreen);
    els.corpusRefreshBtn.addEventListener('click', () => loadCorpus(true));
    els.resetLevelBtn.addEventListener('click', resetCurrentLevel);
    els.resetAllBtn.addEventListener('click', resetAllProgress);
    els.tryEditorBtn.addEventListener('click', validateEditor);
    els.savePuzzleBtn.addEventListener('click', saveEditorPuzzle);
    els.deleteCustomBtn.addEventListener('click', deleteCustomPuzzles);
    window.addEventListener('keydown', handleKeydown);
  }

  function handleKeydown(e) {
    const active = document.activeElement;
    if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return;
    if (e.key === 'Escape' && sidePanelOpen) { e.preventDefault(); setSidePanelOpen(false); return; }
    if (e.key === 'Enter') { e.preventDefault(); submitWord(); return; }
    if (e.key === 'Backspace') { e.preventDefault(); deleteLetter(); return; }
    if (e.key === ' ') { e.preventDefault(); shuffleLetters(); return; }
    const letter = normalizeLetter(e.key);
    if (!letter) return;
    const allowed = [currentPuzzle.center, ...currentPuzzle.letters];
    if (allowed.includes(letter)) {
      e.preventDefault();
      const tile = [...els.hiveWrap.querySelectorAll('.tile')].find(t => t.dataset.letter === letter);
      appendLetter(letter, tile);
    }
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.add('open');
    const close = modal.querySelector('.close-btn');
    if (close) close.focus({ preventScroll: true });
  }

  function closeModal(id) {
    document.getElementById(id).classList.remove('open');
  }

  function updateSwitches() {
    els.soundSwitch.classList.toggle('on', !!settings.sound);
    els.partySwitch.classList.toggle('on', !!settings.party);
    updateCorpusButton();
  }

  async function goFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      toast('הדפדפן לא הסכים למסך מלא. כנראה הוא צריך קפה.', 'bad');
    }
  }

  function resetCurrentLevel() {
    if (!currentPuzzle) return;
    state[currentPuzzle.id] = { found: [], score: 0, hints: 0 };
    saveState();
    clearFailedInputTimer();
    input = '';
    renderInput();
    renderProgress();
    renderFoundWords();
    renderHintTable();
    toast('השלב אופס. דף נקי, דבורה חדשה.', 'gold');
    closeModal('settingsModal');
  }

  function resetAllProgress() {
    state = {};
    saveState();
    clearFailedInputTimer();
    input = '';
    renderInput();
    renderProgress();
    renderFoundWords();
    renderHintTable();
    toast('כל ההתקדמות אופסה.', 'gold');
    closeModal('settingsModal');
  }

  function readEditorPuzzle() {
    const center = normalizeLetter(els.editCenter.value);
    const letters = unique([...els.editLetters.value].map(normalizeLetter)).filter(l => l && l !== center);
    const words = els.editWords.value.split(/[\s,;،]+/).map(sanitizeWord).filter(Boolean);
    return preparePuzzle({
      id: `custom-${Date.now()}`,
      name: els.editName.value.trim() || 'שלב של מאיה',
      emoji: els.editEmoji.value.trim() || '✨',
      center,
      letters,
      minLength: Number(els.editMinLength.value || 3),
      theme: els.editTheme.value,
      words
    }, true);
  }

  function validateEditor() {
    const puzzle = readEditorPuzzle();
    if (!puzzle.center) return toast('צריך אות מרכזית עברית אחת.', 'bad');
    if (puzzle.letters.length !== 6) return toast(`צריך בדיוק 6 אותיות מסביב. כרגע יש ${puzzle.letters.length}.`, 'bad');
    if (puzzle.words.length < 3) return toast('כדאי לפחות 3 מילים תקינות לשלב.', 'bad');
    const gold = puzzle.words.filter(w => isPangram(w, puzzle)).length;
    toast(`נראה טוב: ${puzzle.words.length} מילים תקינות, ${gold} מילות זהב.`, 'good');
  }

  function saveEditorPuzzle() {
    const puzzle = readEditorPuzzle();
    if (!puzzle.center) return toast('צריך אות מרכזית עברית אחת.', 'bad');
    if (puzzle.letters.length !== 6) return toast(`צריך בדיוק 6 אותיות מסביב. כרגע יש ${puzzle.letters.length}.`, 'bad');
    if (puzzle.words.length < 3) return toast('השלב צריך לפחות 3 מילים תקינות.', 'bad');
    const existing = loadCustomPuzzles();
    const saved = existing.concat([puzzle]);
    saveCustomPuzzles(saved);
    rebuildPuzzleList();
    renderLevelSelect();
    closeModal('editorModal');
    loadPuzzle(puzzle.id);
    toast('השלב נשמר ונכנס לכוורת.', 'good');
  }

  function deleteCustomPuzzles() {
    localStorage.removeItem(CUSTOM_KEY);
    rebuildPuzzleList();
    renderLevelSelect();
    closeModal('editorModal');
    loadPuzzle(puzzles[0].id);
    toast('שלבי ההורים נמחקו. הקן חזר לברירת המחדל.', 'gold');
  }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  init();
})();
