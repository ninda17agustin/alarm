/* ==========================================================================
   Math Alarm - Core Logic, Native Time Picker & Ultra-Robust Notifications
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

    // Notification Banner Elements
    const notifBanner = document.getElementById('notifBanner');
    const enableNotifBtn = document.getElementById('enableNotifBtn');

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
    let alarms = [];
    try {
        alarms = JSON.parse(localStorage.getItem('math_alarms')) || [];
    } catch (e) {
        alarms = [];
    }

    let currentRingingAlarm = null;
    let currentProblem = null;
    let swRegistration = null;

    // Set default alarm time input (Current time + 1 Min)
    if (alarmTimeInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 1);
        const defaultHours = String(now.getHours()).padStart(2, '0');
        const defaultMinutes = String(now.getMinutes()).padStart(2, '0');
        alarmTimeInput.value = `${defaultHours}:${defaultMinutes}`;
    }

    // Audio State
    let audioContext = null;
    let alarmSoundInterval = null;
    let customAudioElement = null;
    let uploadedCustomAudioDataUrl = null;
    let uploadedCustomAudioName = null;
    let previewAudioElement = null;
    let lastTriggeredMinute = '';

    // --- Live Clock Engine ---
    function updateClock() {
        const date = new Date();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const currentTimeStr = `${hours}:${minutes}:${seconds}`;
        const currentHHMM = `${hours}:${minutes}`;

        if (liveClockEl) {
            liveClockEl.textContent = currentTimeStr;
        }

        if (liveDateEl) {
            const options = { weekday: 'long', day: 'numeric', month: 'long' };
            liveDateEl.textContent = date.toLocaleDateString('id-ID', options);
        }

        if (seconds === '00' && currentHHMM !== lastTriggeredMinute) {
            checkAndTriggerAlarm(currentHHMM);
        }
    }

    updateClock();
    setInterval(updateClock, 1000);

    // --- Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then((reg) => {
            swRegistration = reg;
        }).catch((err) => {
            console.warn('SW registration skipped:', err);
        });
    }

    // --- Robust Cross-Browser Notification Permission Helper ---
    function requestNotificationPermission() {
        return new Promise((resolve) => {
            if (!('Notification' in window)) {
                resolve('unsupported');
                return;
            }
            try {
                const permissionPromise = Notification.requestPermission((result) => {
                    resolve(result);
                });
                if (permissionPromise && typeof permissionPromise.then === 'function') {
                    permissionPromise.then(resolve);
                }
            } catch (e) {
                resolve(Notification.permission);
            }
        });
    }

    // Check Notification Status
    function checkNotificationStatus() {
        if ('Notification' in window && notifBanner) {
            if (Notification.permission !== 'granted') {
                notifBanner.classList.remove('hidden');
            } else {
                notifBanner.classList.add('hidden');
            }
        }
    }

    checkNotificationStatus();

    // Enable Notification Button Click Handler
    if (enableNotifBtn) {
        enableNotifBtn.addEventListener('click', async () => {
            if (!('Notification' in window)) {
                alert('Browser HP Anda tidak mendukung fitur Notifikasi Web.');
                return;
            }

            if (Notification.permission === 'denied') {
                alert('Izin Notifikasi DIBLOKIR oleh Browser HP Anda.\n\nCara Membuka Blokir Notifikasi di Chrome:\n1. Klik ikon Gembok 🔒 di sebelah kiri alamat website di Chrome.\n2. Pilih "Permissions / Izin" -> "Notifications / Notifikasi".\n3. Ubah dari "Block" menjadi "Allow / Izinkan".');
                return;
            }

            const permission = await requestNotificationPermission();
            if (permission === 'granted') {
                if (notifBanner) notifBanner.classList.add('hidden');
                showNotification('Notifikasi alarm berhasil diaktifkan!');
            } else if (permission === 'denied') {
                alert('Izin notifikasi diblokir. Silakan klik ikon gembok 🔒 di sebelah kiri alamat website di Chrome untuk mengizinkan.');
            }
        });
    }

    // --- Mobile Tab Switching Logic ---
    if (tabBtnForm && tabBtnList) {
        tabBtnForm.addEventListener('click', () => {
            tabBtnForm.classList.add('active');
            tabBtnList.classList.remove('active');
            if (formCard) formCard.classList.add('active-tab');
            if (listCard) listCard.classList.remove('active-tab');
        });

        tabBtnList.addEventListener('click', () => {
            tabBtnList.classList.add('active');
            tabBtnForm.classList.remove('active');
            if (listCard) listCard.classList.add('active-tab');
            if (formCard) formCard.classList.remove('active-tab');
        });
    }

    // --- Custom Audio Selection ---
    if (alarmSoundSelect) {
        alarmSoundSelect.addEventListener('change', () => {
            if (alarmSoundSelect.value === 'custom') {
                if (customAudioGroup) customAudioGroup.classList.remove('hidden');
            } else {
                if (customAudioGroup) customAudioGroup.classList.add('hidden');
                stopPreviewSound();
            }
        });
    }

    if (customAudioFileInput) {
        customAudioFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                alert('Ukuran file audio terlalu besar! Maksimal 5MB.');
                customAudioFileInput.value = '';
                if (fileNameDisplay) fileNameDisplay.textContent = 'Belum ada file dipilih';
                if (previewCustomAudioBtn) previewCustomAudioBtn.disabled = true;
                uploadedCustomAudioDataUrl = null;
                return;
            }

            uploadedCustomAudioName = file.name;
            if (fileNameDisplay) fileNameDisplay.textContent = file.name;

            const reader = new FileReader();
            reader.onload = function(event) {
                uploadedCustomAudioDataUrl = event.target.result;
                if (previewCustomAudioBtn) previewCustomAudioBtn.disabled = false;
                showNotification(`File audio "${file.name}" berhasil diunggah!`);
            };
            reader.readAsDataURL(file);
        });
    }

    // Preview Custom Sound Button
    if (previewCustomAudioBtn) {
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
    }

    function stopPreviewSound() {
        if (previewAudioElement) {
            previewAudioElement.pause();
            previewAudioElement.currentTime = 0;
            previewAudioElement = null;
        }
        if (previewCustomAudioBtn) {
            previewCustomAudioBtn.innerHTML = '<i class="fa-solid fa-play"></i> Test Suara';
        }
    }

    // --- Alarms Storage & Render ---
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
        if (!alarmListEl) return;
        alarmListEl.innerHTML = '';

        const activeCount = alarms.filter(a => a.active).length;
        if (alarmCountBadge) alarmCountBadge.textContent = `${activeCount} Aktif`;
        if (tabBadgeCount) tabBadgeCount.textContent = alarms.length;

        if (alarms.length === 0) {
            if (emptyStateEl) {
                alarmListEl.appendChild(emptyStateEl);
                emptyStateEl.style.display = 'block';
            }
            return;
        }

        if (emptyStateEl) emptyStateEl.style.display = 'none';

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
            case 'easy': return 'Mudah (1 Digit)';
            case 'hard': return 'Sulit';
            default: return 'Sedang (2 Digit)';
        }
    }

    function getSoundName(sound) {
        switch(sound) {
            case 'radar': return 'Radar (Default)';
            case 'siren': return 'Cyber Siren';
            case 'pulse': return 'Digital Pulse';
            case 'bell': return 'Electronic Bell';
            default: return 'Custom Audio';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, function(m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    }

    // Form Submit Event
    if (alarmForm) {
        alarmForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if ('Notification' in window && Notification.permission === 'default') {
                await requestNotificationPermission();
            }

            const selectedSound = alarmSoundSelect ? alarmSoundSelect.value : 'radar';
            if (selectedSound === 'custom' && !uploadedCustomAudioDataUrl) {
                alert('Silakan pilih file audio kustom terlebih dahulu!');
                return;
            }

            const newAlarm = {
                id: 'alarm_' + Date.now(),
                time: alarmTimeInput ? alarmTimeInput.value : '07:00',
                label: (alarmLabelInput && alarmLabelInput.value) ? alarmLabelInput.value : 'Bangun Pagi!',
                difficulty: alarmDifficultySelect ? alarmDifficultySelect.value : 'medium',
                sound: selectedSound,
                customAudioDataUrl: selectedSound === 'custom' ? uploadedCustomAudioDataUrl : null,
                customAudioName: selectedSound === 'custom' ? uploadedCustomAudioName : null,
                active: true
            };

            alarms.push(newAlarm);
            saveAlarmsToStorage();
            showNotification(`Alarm ${newAlarm.time} berhasil disimpan!`);
            stopPreviewSound();

            if (window.innerWidth <= 768 && tabBtnList) {
                tabBtnList.click();
            }
        });
    }

    // --- Audio Engine & Hardware Vibration (Synthesizer + Custom Audio) ---
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

        // Trigger hardware vibration on mobile phones
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate([500, 250, 500, 250, 500, 250, 500]);
            } catch (e) {}
        }

        if (alarm.sound === 'custom' && alarm.customAudioDataUrl) {
            customAudioElement = new Audio(alarm.customAudioDataUrl);
            customAudioElement.loop = true;
            customAudioElement.play().catch(err => {
                console.warn('Custom audio playback error, falling back to synthesizer:', err);
                startSynthesizedSound('radar');
            });
        } else {
            startSynthesizedSound(alarm.sound || 'radar');
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

            if (type === 'radar') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.4);
                gain.gain.setValueAtTime(0.35, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
                osc.start(now);
                osc.stop(now + 0.45);
            } else if (type === 'siren') {
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
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(0);
            } catch (e) {}
        }
    }

    // --- Math Generator Logic ---
    function generateMathProblem(difficulty) {
        let num1, num2, operator, answer;

        if (difficulty === 'easy') {
            const ops = ['+', '-'];
            operator = ops[Math.floor(Math.random() * ops.length)];
            num1 = Math.floor(Math.random() * 9) + 1;
            num2 = Math.floor(Math.random() * 9) + 1;

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
        } else { // Medium (Default 2 digit)
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
        
        if (ringingLabelEl) ringingLabelEl.textContent = alarm.label || 'Bangun Pagi!';
        if (ringingTimeEl) ringingTimeEl.textContent = alarm.time;
        if (challengeDifficultyBadge) challengeDifficultyBadge.textContent = `TINGKAT: ${getDifficultyLabel(alarm.difficulty).toUpperCase()}`;
        
        if (feedbackToast) feedbackToast.classList.add('hidden');
        if (mathAnswerInput) mathAnswerInput.value = '';

        currentProblem = generateMathProblem(alarm.difficulty);
        if (mathQuestionTextEl) mathQuestionTextEl.textContent = currentProblem.questionText;

        if (alarmModalOverlay) alarmModalOverlay.classList.remove('hidden');
        
        startAlarmSound(alarm);

        if ('Notification' in window && Notification.permission === 'granted') {
            const notifTitle = `⏰ ALARM: ${alarm.label || 'Bangun Pagi!'}`;
            const notifOptions = {
                body: `Soal: ${currentProblem.questionText}\nTap di sini untuk menjawab & mematikan alarm!`,
                icon: 'https://cdn-icons-png.flaticon.com/512/2972/2972531.png',
                tag: 'math-alarm-ringing',
                vibrate: [500, 250, 500, 250, 500],
                requireInteraction: true
            };

            if (swRegistration && swRegistration.showNotification) {
                swRegistration.showNotification(notifTitle, notifOptions);
            } else {
                const notif = new Notification(notifTitle, notifOptions);
                notif.onclick = function() {
                    try { window.focus(); } catch(e) {}
                    this.close();
                };
            }
        }

        setTimeout(() => {
            if (mathAnswerInput) mathAnswerInput.focus();
        }, 300);
    }

    // --- Test Alarm Button Event ---
    if (testAlarmNowBtn) {
        testAlarmNowBtn.addEventListener('click', async () => {
            if ('Notification' in window && Notification.permission === 'default') {
                await requestNotificationPermission();
            }

            const selectedSound = alarmSoundSelect ? alarmSoundSelect.value : 'radar';
            const testAlarm = {
                id: 'test_alarm',
                time: liveClockEl ? liveClockEl.textContent.substring(0, 5) : '07:00',
                label: (alarmLabelInput && alarmLabelInput.value) ? alarmLabelInput.value : 'Uji Alarm Matematika',
                difficulty: alarmDifficultySelect ? alarmDifficultySelect.value : 'medium',
                sound: selectedSound,
                customAudioDataUrl: selectedSound === 'custom' ? uploadedCustomAudioDataUrl : null,
                customAudioName: selectedSound === 'custom' ? uploadedCustomAudioName : null,
                active: true
            };
            triggerAlarm(testAlarm);
        });
    }

    // --- Math Answer Form Submission Logic ---
    if (mathAnswerForm) {
        mathAnswerForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const rawValue = mathAnswerInput ? mathAnswerInput.value.trim() : '';

            if (rawValue === '') {
                showFeedback('❌ Belum menjawab! Ketik jawaban Anda. Alarm tetap berbunyi.');
                shakeCard();
                if (mathAnswerInput) mathAnswerInput.focus();
                return;
            }

            const userAnswer = parseInt(rawValue, 10);

            if (userAnswer !== currentProblem.answer) {
                currentProblem = generateMathProblem(currentRingingAlarm ? currentRingingAlarm.difficulty : 'medium');
                if (mathQuestionTextEl) mathQuestionTextEl.textContent = currentProblem.questionText;
                
                showFeedback('❌ Jawaban salah! Soal baru muncul, alarm tetap berbunyi.');
                shakeCard();
                if (mathAnswerInput) {
                    mathAnswerInput.value = '';
                    mathAnswerInput.focus();
                }
                return;
            }

            stopAlarmSound();
            if (alarmModalOverlay) alarmModalOverlay.classList.add('hidden');
            showSuccessModal();
        });
    }

    function showFeedback(message) {
        if (feedbackText) feedbackText.textContent = message;
        if (feedbackToast) feedbackToast.classList.remove('hidden');
    }

    function shakeCard() {
        if (!ringingCard) return;
        ringingCard.classList.remove('shake-anim');
        void ringingCard.offsetWidth;
        ringingCard.classList.add('shake-anim');
    }

    function showSuccessModal() {
        if (successModalOverlay) successModalOverlay.classList.remove('hidden');
    }

    if (closeSuccessModalBtn) {
        closeSuccessModalBtn.addEventListener('click', () => {
            if (successModalOverlay) successModalOverlay.classList.add('hidden');
        });
    }

    // --- Toast Notification Helper ---
    function showNotification(message) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
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
