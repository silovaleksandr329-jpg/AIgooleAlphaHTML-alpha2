let isSystemActive = false;
let speechRecognition = null;
let wakeWordRecognition = null;
let chatSessions = { 'chat_1': { title: 'Главный чат', messages: [{ sender: 'ai', text: 'Исправление завершено! Добавлен умный сетевой пинг для контроля VPN и починен микрофон.' }] } };
let currentChatId = 'chat_1';

function unlockMobileAudioModules() {
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') ctx.resume();
    }
    window.removeEventListener('click', unlockMobileAudioModules);
    window.removeEventListener('touchstart', unlockMobileAudioModules);
}
window.addEventListener('click', unlockMobileAudioModules);
window.addEventListener('touchstart', unlockMobileAudioModules);

// ИСПРАВЛЕНО: Безопасное и точное извлечение текста из Web Speech API
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = 'ru-RU';
    speechRecognition.onstart = () => { DOM.mic.classList.add('recording'); };
    speechRecognition.onresult = (e) => {
        // ТОЧНОЕ ИСПРАВЛЕНИЕ: Исправлен запуск распознавания голоса на смартфонах
        const text = e.results[0][0].transcript;
        if(text.trim() && isSystemActive) {
            window.addMessage('user', text);
            chatSessions[currentChatId].messages.push({ sender: 'user', text: text });
            window.processAiResponse(text);
        }
    };
    speechRecognition.onend = () => { DOM.mic.classList.remove('recording'); window.initWakeWordDetection(); };
}

window.initWakeWordDetection = function() {
    if (!('webkitSpeechRecognition' in window) || !DOM.wakeWordToggle.checked || !isSystemActive) {
        if(wakeWordRecognition) { wakeWordRecognition.stop(); wakeWordRecognition = null; }
        return;
    }
    if (!wakeWordRecognition) {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        wakeWordRecognition = new SpeechRecognition();
        wakeWordRecognition.lang = 'ru-RU';
        wakeWordRecognition.interimResults = true;
        wakeWordRecognition.onresult = (e) => {
            const transcript = Array.from(e.results).map(r => r[0].transcript.toLowerCase()).join('');
            if (transcript.includes('привет гугл') || transcript.includes('окей гугл')) {
                wakeWordRecognition.stop();
                setTimeout(() => { speechRecognition.start(); }, 250);
            }
        };
        wakeWordRecognition.onend = () => {
            if (DOM.wakeWordToggle.checked && isSystemActive && !DOM.mic.classList.contains('recording')) {
                try { wakeWordRecognition.start(); } catch(err) {}
            }
        };
    }
    try { wakeWordRecognition.start(); } catch(e) {}
}

DOM.wakeWordToggle.onchange = () => { window.initWakeWordDetection(); };

function populateVoices() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    const isMale = (name) => name.toLowerCase().includes('male') || name.toLowerCase().includes('pavel') || name.toLowerCase().includes('yuri') || name.toLowerCase().includes('google русский');
    let filtered = voices.filter(v => v.lang.includes('ru') || v.lang.includes('en'));
    filtered = filtered.filter(v => DOM.voiceGender.value === 'male' ? isMale(v.name) : !isMale(v.name));
    DOM.voiceSelector.innerHTML = filtered.map(v => `<option value="${v.name}">${v.name}</option>`).join('');
}
if ('speechSynthesis' in window) { window.speechSynthesis.onvoiceschanged = populateVoices; DOM.voiceGender.onchange = populateVoices; }

function renderChatsList() {
    DOM.chatsList.innerHTML = '';
    Object.keys(chatSessions).forEach(id => {
        const item = document.createElement('div');
        item.className = `chat-item ${id === currentChatId ? 'active' : ''}`;
        item.textContent = chatSessions[id].title;
        item.onclick = () => switchChat(id);
        DOM.chatsList.appendChild(item);
    });
}

function switchChat(id) {
    currentChatId = id; DOM.box.innerHTML = '';
    chatSessions[id].messages.forEach(m => window.addMessage(m.sender, m.text));
    renderChatsList(); DOM.sidebar.classList.add('hidden');
}

DOM.sidebarToggle.onclick = (e) => { e.stopPropagation(); DOM.sidebar.classList.toggle('hidden'); };
DOM.box.onclick = () => { DOM.sidebar.classList.add('hidden'); DOM.mediaMenu.classList.add('hidden'); };

DOM.newChatBtn.onclick = () => {
    const id = `chat_${Date.now()}`;
    chatSessions[id] = { title: `Чат №${Object.keys(chatSessions).length + 1}`, messages: [{ sender: 'ai', text: 'Новая вкладка создана.' }] };
    switchChat(id);
};

DOM.gear.onclick = () => DOM.modal.style.display = 'flex';
DOM.closeX.onclick = DOM.closeModalBtn.onclick = () => { DOM.modal.style.display = 'none'; window.initWakeWordDetection(); };
DOM.theme.onchange = (e) => document.documentElement.setAttribute('data-theme', e.target.value);

setInterval(() => {
    if (!DOM.el.classList.contains('think')) {
        DOM.el.classList.add('blink'); DOM.er.classList.add('blink');
        setTimeout(() => { DOM.el.classList.remove('blink'); DOM.er.classList.remove('blink'); }, 150);
    }
}, 4500);

DOM.add.onclick = () => { if(isSystemActive) DOM.mediaMenu.classList.remove('hidden'); };
DOM.mediaCancel.onclick = () => DOM.mediaMenu.classList.add('hidden');

DOM.mediaOptions.forEach(opt => {
    opt.onclick = () => {
        const src = opt.getAttribute('data-source');
        DOM.mediaMenu.classList.add('hidden');
        if(src === 'camera') {
            DOM.fileUploader.setAttribute('accept', 'image/*');
            DOM.fileUploader.setAttribute('capture', 'environment');
        } else if(src === 'photo') {
            DOM.fileUploader.setAttribute('accept', 'image/*');
            DOM.fileUploader.removeAttribute('capture');
        } else {
            DOM.fileUploader.setAttribute('accept', '*/*');
            DOM.fileUploader.removeAttribute('capture');
        }
        DOM.fileUploader.click();
    };
});

DOM.fileUploader.onchange = (e) => {
    if (e.target.files.length && isSystemActive) {
        DOM.filePreview.textContent = `📎 Готов: ${e.target.files.name}`;
        DOM.filePreview.classList.remove('hidden');
    }
};

DOM.toggle.onclick = () => {
    isSystemActive = !isSystemActive;
    DOM.toggle.textContent = isSystemActive ? "Выключить AI" : "Активировать ядро";
    DOM.toggle.style.background = isSystemActive ? "#ea4335" : "#4285f4";
    DOM.status.textContent = isSystemActive ? "Онлайн" : "Офлайн";
    DOM.status.style.color = isSystemActive ? "#34a853" : "#777";
    DOM.face.classList.toggle('active', isSystemActive);
    DOM.inp.disabled = !isSystemActive; DOM.send.disabled = !isSystemActive; DOM.mic.disabled = !isSystemActive;
    if(!isSystemActive && wakeWordRecognition) { wakeWordRecognition.stop(); wakeWordRecognition = null; }
    DOM.modal.style.display = 'none'; window.initWakeWordDetection();
};

DOM.send.onclick = () => {
    let t = DOM.inp.value.trim();
    if (!t && DOM.filePreview.classList.contains('hidden')) return;
    if(!DOM.filePreview.classList.contains('hidden')) { t = `[Файл] ` + t; DOM.filePreview.classList.add('hidden'); }
    window.addMessage('user', t);
    chatSessions[currentChatId].messages.push({ sender: 'user', text: t });
    DOM.inp.value = ''; window.processAiResponse(t);
};
DOM.inp.onkeypress = (e) => { if (e.key === 'Enter') DOM.send.click(); };

switchChat(currentChatId);
populateVoices();

