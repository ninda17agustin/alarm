/* ==========================================================================
   Math Alarm - Core Logic, Web Audio Engine, Custom Audio Upload & Mobile Tabs
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const liveClockEl = document.getElementById('liveClock');
    const liveDateEl = document.getElementById('liveDate');
    const alarmForm = document.getElementById('alarmForm');
    const alarmTimeInput = document.getElementById('alarmTime');
    const alarmLabelInput = document.getElementById('alarmLabel');
    const alarmDifficultySelect = document.getElementById('alarmDifficulty');
    const alarmSoundSelect = document.getElementById('alarmSound');
    const testAlarmNowBtn = document.getElementById('testAlarmNowBtn');

    // Mobile Tab Elements
    const tabBtnForm = document.getElementById('tabBtnForm');
    const tabBtnList = document.getElementById('tabBtnList');
    const formCard = document.getElementById('formCard');
    const listCard = document.getElementById('listCard');
    const tabBadgeCount = document.getElementById('tabBadgeCount');

    // Custom Audio Elements
    const customAudioGroup = document.getElementById('customAudioGroup');
    const customAudioFileInput = document.getElementById('customAudioFile');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const previewCustomAudioBtn = document.getElementById('previewCustomAudioBtn');
    
    const alarmListEl = document.getElementById('alarmList');
    const emptyStateEl = document.getElementById('emptyState');
    const alarmCountBadge = document.getElementById('alarmCountBadge');

    // Ringing Modal Elements
    const alarmModalOverlay = document.getElementById('alarmModalOverlay');
    const ringingCard = document.getElementById('ringingCard');
    const ringingLabelEl = document.getElementById('ringingLabel');
    const ringingTimeEl = document.getElementById('ringingTime');
    const challengeDifficultyBadge = document.getElementById('challengeDifficultyBadge');
    const mathQuestionTextEl = document.getElementById('mathQuestionText');
    const mathAnswerForm = document.getElementById('mathAnswerForm');
    const mathAnswerInput = document.getElementById('mathAnswerInput');
    const feedbackToast = document.getElementById('feedbackToast');
    const feedbackText = document.getElementById('feedbackText');

    // Success Modal Elements
    const successModalOverlay = document.getElementById('successModalOverlay');
    const closeSuccessModalBtn = document.getElementById('closeSuccessModalBtn');

    // --- State Variables ---
    let alarms = JSON.parse(localStorage.getItem('math_alarms')) || [];
    let currentRingingAlarm = null;
    let currentProblem = null;
    
    // Audio State
    let audioContext = null;
    let alarmSoundInterval = null;
    let customAudioElement = null;
    let uploadedCustomAudioDataUrl = null;
    let uploadedCustomAudioName = null;
    let previewAudioElement = null;
    let lastTriggeredMinute = '';

    // Request System Notification Permission on load
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Set default time input to current time + 1 min
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    const defaultHours = String(now.getHours()).padStart(2, '0');
    const defaultMinutes = String(now.getMinutes()).padStart(2, '0');
    alarmTimeInput.value = `${defaultHours}:${defaultMinutes}`;

    // --- Mobile Tab Switching Logic ---
    if (tabBtnForm && tabBtnList) {
        tabBtnForm.addEventListener('click', () => {
            tabBtnForm.classList.add('active');
            tabBtnList.classList.remove('active');
            formCard.classList.add('active-tab');
            listCard.classList.remove('active-tab');
        });

        tabBtnList.addEventListener('click', () => {
            tabBtnList.classList.add('active');
            tabBtnForm.classList.remove('active');
            listCard.classList.add('active-tab');
            formCard.classList.remove('active-tab');
        });
    }

    // --- Custom Audio Input Change Handler ---
    alarmSoundSelect.addEventListener('change', () => {
        if (alarmSoundSelect.value === 'custom') {
            customAudioGroup.classList.remove('hidden');
        } else {
            customAudioGroup.classList.add('hidden');
            stopPreviewSound();
        }
    });

    customAudioFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('Ukuran file audio terlalu besar! Maksimal 5MB.');
            customAudioFileInput.value = '';
            fileNameDisplay.textContent = 'Belum ada file dipilih';
            previewCustomAudioBtn.disabled = true;
            uploadedCustomAudioDataUrl = null;
            return;
        }

        uploadedCustomAudioName = file.name;
        fileNameDisplay.textContent = file.name;

        const reader = new FileReader();
        reader.onload = function(event) {
            uploadedCustomAudioDataUrl = event.target.result;
            previewCustomAudioBtn.disabled = false;
            showNotification(`File audio "${file.name}" berhasil diunggah!`);
        };
        reader.readAsDataURL(file);
    });

    // Preview Custom Sound Button
    previewCustomAudioBtn.addEventListener('click', () => {
        if (!uploadedCustomAudioDataUrl) return;

        if (previewAudioElement && !previewAudioElement.paused) {
            stopPreviewSound();
        } else {
            previewAudioElement = new Audio(uploadedCustomAudioDataUrl);
            previewAudioElement.play();
            previewCustomAudioBtn.innerHTML = '<i class="fa-solid fa-square"></i> Stop Test';
            
            previewAudioElement.onended = () => {
                previewCustomAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i> Test Suara';
            };
        }
    });

    function stopPreviewSound() {
        if (previewAudioElement) {
            previewAudioElement.pause();
            previewAudioElement.currentTime = 0;
            previewAudioElement = null;
        }
        previewCustomAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i> Test Suara';
    }

    // --- Live Clock & Alarm Monitor Loop ---
    function updateClock() {
        const date = new Date();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const currentTimeStr = `${hours}:${minutes}:${seconds}`;
        const currentHHMM = `${hours}:${minutes}`;

        liveClockEl.textContent = currentTimeStr;

        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        liveDateEl.textContent = date.toLocaleDateString('id-ID', options);

        if (seconds === '00' && currentHHMM !== lastTriggeredMinute) {
            checkAndTriggerAlarm(currentHHMM);
        }
    }

    setInterval(updateClock, 1000);
    updateClock();

    // --- Alarms Management ---
    function saveAlarmsToStorage() {
        try {
            localStorage.setItem('math_alarms', JSON.stringify(alarms));
        } catch (err) {
            console.error('LocalStorage quota exceeded:', err);
            alert('Penyimpanan lokal penuh. Hapus beberapa alarm lama atau gunakan file audio yang lebih kecil.');
        }
        renderAlarmList();
    }

    function renderAlarmList() {
        alarmListEl.innerHTML = '';

        const activeCount = alarms.filter(a => a.active).length;
        alarmCountBadge.textContent = `${activeCount} Aktif`;
        if (tabBadgeCount) {
            tabBadgeCount.textContent = alarms.length;
        }

        if (alarms.length === 0) {
            alarmListEl.appendChild(emptyStateEl);
            emptyStateEl.style.display = 'block';
            return;
        }

        emptyStateEl.style.display = 'none';

        alarms.forEach(alarm => {
            const item = document.createElement('div');
            item.className = 'alarm-item';
            
            const soundDisplay = alarm.sound === 'custom' 
                ? `🎵 ${alarm.customAudioName || 'Audio Kustom'}` 
                : getSoundName(alarm.sound);

            item.innerHTML = `
                <div class="alarm-info">
                    <div class="alarm-time-text">${alarm.time}</div>
                    <div class="alarm-label-text">${escapeHtml(alarm.label)}</div>
                    <div>
                        <span class="alarm-tag"><i class="fa-solid fa-brain"></i> ${getDifficultyLabel(alarm.difficulty)}</span>
                        <span class="alarm-sound-tag"><i class="fa-solid fa-music"></i> ${escapeHtml(soundDisplay)}</span>
                    </div>
                </div>
                <div class="alarm-controls">
                    <label class="switch">
                        <input type="checkbox" data-id="${alarm.id}" class="toggle-alarm" ${alarm.active ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                    <button data-id="${alarm.id}" class="btn-icon-delete delete-alarm" title="Hapus Alarm">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
            alarmListEl.appendChild(item);
        });

        document.querySelectorAll('.toggle-alarm').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const alarm = alarms.find(a => a.id === id);
                if (alarm) {
                    alarm.active = e.target.checked;
                    saveAlarmsToStorage();
                }
            });
        });

        document.querySelectorAll('.delete-alarm').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                alarms = alarms.filter(a => a.id !== id);
                saveAlarmsToStorage();
                showNotification('Alarm telah dihapus');
            });
        });
    }

    function getDifficultyLabel(diff) {
        switch(diff) {
            case 'easy': return 'Mudah';
            case 'hard': return 'Sulit';
            default: return 'Sedang';
        }
    }

    function getSoundName(sound) {
        switch(sound) {
            case 'siren': return 'Cyber Siren';
            case 'pulse': return 'Digital Pulse';
            case 'radar': return 'Radar Wave';
            case 'bell': return 'Electronic Bell';
            default: return 'Custom Audio';
        }
    }

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, function(m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    }

    // Form Submit Event
    alarmForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const selectedSound = alarmSoundSelect.value;
        if (selectedSound === 'custom' && !uploadedCustomAudioDataUrl) {
            alert('Silakan pilih file audio kustom terlebih dahulu!');
            return;
        }

        const newAlarm = {
            id: 'alarm_' + Date.now(),
            time: alarmTimeInput.value,
            label: alarmLabelInput.value || 'Alarm Matematika',
            difficulty: alarmDifficultySelect.value,
            sound: selectedSound,
            customAudioDataUrl: selectedSound === 'custom' ? uploadedCustomAudioDataUrl : null,
            customAudioName: selectedSound === 'custom' ? uploadedCustomAudioName : null,
            active: true
        };

        alarms.push(newAlarm);
        saveAlarmsToStorage();
        showNotification(`Alarm ${newAlarm.time} berhasil disimpan!`);
        stopPreviewSound();

        // Switch to list tab on mobile after adding alarm
        if (window.innerWidth <= 768 && tabBtnList) {
            tabBtnList.click();
        }
    });

    // --- Audio Engine (Synthesizer + Custom Audio) ---
    function initAudioContext() {
        if (!audioContext) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioCtx();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

    function startAlarmSound(alarm) {
        stopAlarmSound();

        if (alarm.sound === 'custom' && alarm.customAudioDataUrl) {
            customAudioElement = new Audio(alarm.customAudioDataUrl);
            customAudioElement.loop = true;
            customAudioElement.play().catch(err => {
                console.warn('Custom audio playback error, falling back to synthesizer:', err);
                startSynthesizedSound('siren');
            });
        } else {
            startSynthesizedSound(alarm.sound || 'pulse');
        }
    }

    function startSynthesizedSound(type) {
        initAudioContext();
        let step = 0;
        alarmSoundInterval = setInterval(() => {
            if (!audioContext) return;
            const now = audioContext.currentTime;

            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();

            osc.connect(gain);
            gain.connect(audioContext.destination);

            if (type === 'siren') {
                const freq = (step % 2 === 0) ? 880 : 440;
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (type === 'pulse') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(750, now);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (type === 'radar') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.4);
                gain.gain.setValueAtTime(0.35, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
                osc.start(now);
                osc.stop(now + 0.45);
            } else { // bell
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
            }

            step++;
        }, 400);
    }

    function stopAlarmSound() {
        if (alarmSoundInterval) {
            clearInterval(alarmSoundInterval);
            alarmSoundInterval = null;
        }
        if (customAudioElement) {
            customAudioElement.pause();
            customAudioElement.currentTime = 0;
            customAudioElement = null;
        }
    }

    // --- Math Generator Logic ---
    function generateMathProblem(difficulty) {
        let num1, num2, operator, answer;

        if (difficulty === 'easy') {
            const ops = ['+', '-'];
            operator = ops[Math.floor(Math.random() * ops.length)];
            num1 = Math.floor(Math.random() * 40) + 10;
            num2 = Math.floor(Math.random() * 30) + 5;

            if (operator === '-') {
                if (num1 < num2) [num1, num2] = [num2, num1];
                answer = num1 - num2;
            } else {
                answer = num1 + num2;
            }
        } else if (difficulty === 'hard') {
            const ops = ['x', '÷'];
            operator = ops[Math.floor(Math.random() * ops.length)];
            
            if (operator === 'x') {
                num1 = Math.floor(Math.random() * 10) + 11;
                num2 = Math.floor(Math.random() * 8) + 3;
                answer = num1 * num2;
            } else {
                num2 = Math.floor(Math.random() * 8) + 2;
                answer = Math.floor(Math.random() * 12) + 3;
                num1 = num2 * answer;
            }
        } else { // Medium (Default)
            const ops = ['+', '-', 'x'];
            operator = ops[Math.floor(Math.random() * ops.length)];

            if (operator === 'x') {
                num1 = Math.floor(Math.random() * 10) + 3;
                num2 = Math.floor(Math.random() * 10) + 3;
                answer = num1 * num2;
            } else if (operator === '-') {
                num1 = Math.floor(Math.random() * 60) + 20;
                num2 = Math.floor(Math.random() * 40) + 5;
                if (num1 < num2) [num1, num2] = [num2, num1];
                answer = num1 - num2;
            } else {
                num1 = Math.floor(Math.random() * 50) + 15;
                num2 = Math.floor(Math.random() * 50) + 15;
                answer = num1 + num2;
            }
        }

        return {
            questionText: `${num1} ${operator} ${num2} = ?`,
            answer: answer
        };
    }

    // --- Alarm Trigger & Flow Control ---
    function checkAndTriggerAlarm(currentHHMM) {
        const matchingAlarm = alarms.find(a => a.active && a.time === currentHHMM);
        if (matchingAlarm) {
            lastTriggeredMinute = currentHHMM;
            triggerAlarm(matchingAlarm);
        }
    }

    function triggerAlarm(alarm) {
        currentRingingAlarm = alarm;
        
        ringingLabelEl.textContent = alarm.label || 'Bangun Pagi!';
        ringingTimeEl.textContent = alarm.time;
        challengeDifficultyBadge.textContent = `TINGKAT: ${getDifficultyLabel(alarm.difficulty).toUpperCase()}`;
        
        feedbackToast.classList.add('hidden');
        mathAnswerInput.value = '';

        currentProblem = generateMathProblem(alarm.difficulty);
        mathQuestionTextEl.textContent = currentProblem.questionText;

        // Show Modal Overlay immediately
        alarmModalOverlay.classList.remove('hidden');
        
        // Start Alarm Sound
        startAlarmSound(alarm);

        // Try focusing window if browser allows
        try { window.focus(); } catch(e) {}

        // System Notification if tab is in background
        if ('Notification' in window && Notification.permission === 'granted') {
            const notif = new Notification(`⏰ ALARM: ${alarm.label || 'Bangun Pagi!'}`, {
                body: `Soal: ${currentProblem.questionText}\nTap di sini untuk memasukkan jawaban & mematikan alarm!`,
                icon: 'https://cdn-icons-png.flaticon.com/512/2972/2972531.png',
                tag: 'math-alarm-ringing',
                requireInteraction: true
            });

            notif.onclick = function() {
                try { window.focus(); } catch(e) {}
                this.close();
            };
        }

        setTimeout(() => {
            mathAnswerInput.focus();
        }, 300);
    }

    // --- Test Alarm Button Event ---
    testAlarmNowBtn.addEventListener('click', () => {
        const selectedSound = alarmSoundSelect.value;
        const testAlarm = {
            id: 'test_alarm',
            time: liveClockEl.textContent.substring(0, 5),
            label: alarmLabelInput.value || 'Uji Alarm Matematika',
            difficulty: alarmDifficultySelect.value,
            sound: selectedSound,
            customAudioDataUrl: selectedSound === 'custom' ? uploadedCustomAudioDataUrl : null,
            customAudioName: selectedSound === 'custom' ? uploadedCustomAudioName : null,
            active: true
        };
        triggerAlarm(testAlarm);
    });

    // --- Math Answer Form Submission Logic ---
    mathAnswerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const rawValue = mathAnswerInput.value.trim();

        if (rawValue === '') {
            showFeedback('❌ Belum menjawab! Ketik jawaban Anda. Alarm tetap berbunyi.');
            shakeCard();
            mathAnswerInput.focus();
            return;
        }

        const userAnswer = parseInt(rawValue, 10);

        if (userAnswer !== currentProblem.answer) {
            currentProblem = generateMathProblem(currentRingingAlarm ? currentRingingAlarm.difficulty : 'medium');
            mathQuestionTextEl.textContent = currentProblem.questionText;
            
            showFeedback('❌ Jawaban salah! Soal baru muncul, alarm tetap berbunyi.');
            shakeCard();
            mathAnswerInput.value = '';
            mathAnswerInput.focus();
            return;
        }

        stopAlarmSound();
        alarmModalOverlay.classList.add('hidden');
        showSuccessModal();
    });

    function showFeedback(message) {
        feedbackText.textContent = message;
        feedbackToast.classList.remove('hidden');
    }

    function shakeCard() {
        ringingCard.classList.remove('shake-anim');
        void ringingCard.offsetWidth;
        ringingCard.classList.add('shake-anim');
    }

    function showSuccessModal() {
        successModalOverlay.classList.remove('hidden');
    }

    closeSuccessModalBtn.addEventListener('click', () => {
        successModalOverlay.classList.add('hidden');
    });

    // --- Toast Notification Helper ---
    function showNotification(message) {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${escapeHtml(message)}`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3500);
    }

    renderAlarmList();
});
