// js/timer.js

const timers = new Map();
let timerIdCounter = 0;

function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function addTimer(name, minutes) {
    const id = ++timerIdCounter;
    const totalSeconds = Math.round(minutes * 60);

    timers.set(id, {
        id,
        name: name || `Timer ${id}`,
        totalSeconds,
        remainingSeconds: totalSeconds,
        running: false,
        intervalId: null,
        finished: false
    });

    renderTimerList();
    return id;
}

function startTimer(id) {
    const timer = timers.get(id);
    if (!timer || timer.running || timer.finished) return;

    timer.running = true;
    timer.intervalId = setInterval(() => {
        timer.remainingSeconds--;
        renderTimerList();

        if (timer.remainingSeconds <= 0) {
            timer.remainingSeconds = 0;
            timer.running = false;
            timer.finished = true;
            clearInterval(timer.intervalId);
            playAlarm();
        }
    }, 1000);

    renderTimerList();
}

function stopTimer(id) {
    const timer = timers.get(id);
    if (!timer) return;

    timer.running = false;
    if (timer.intervalId) {
        clearInterval(timer.intervalId);
        timer.intervalId = null;
    }
    renderTimerList();
}

function resetTimer(id) {
    const timer = timers.get(id);
    if (!timer) return;

    stopTimer(id);
    timer.remainingSeconds = timer.totalSeconds;
    timer.finished = false;
    renderTimerList();
}

function removeTimer(id) {
    const timer = timers.get(id);
    if (timer && timer.intervalId) {
        clearInterval(timer.intervalId);
    }
    timers.delete(id);
    renderTimerList();
}

function playAlarm() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
            audioCtx.close();
        }, 500);
    } catch (e) {
        // Audio not supported, ignore
    }
}

function renderTimerList() {
    const container = document.getElementById('timer-list');
    const timerArray = Array.from(timers.values());

    if (timerArray.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No timers. Add one below.</p>';
        return;
    }

    let html = '';
    timerArray.forEach(timer => {
        const timeDisplay = formatTime(timer.remainingSeconds);
        const statusClass = timer.finished ? 'finished' : '';
        const statusText = timer.finished ? 'FINISHED!' : (timer.running ? 'Running' : 'Paused');

        html += `<div class="timer-item ${statusClass}" data-id="${timer.id}">`;
        html += `<div class="timer-name">${timer.name}</div>`;
        html += `<div class="timer-time">${timeDisplay}</div>`;
        html += `<div style="font-size: 0.8rem; color: var(--text-muted);">${statusText}</div>`;
        html += `<div class="timer-controls">`;

        if (!timer.running && !timer.finished) {
            html += `<button class="btn" onclick="window.kitchenApp.timers.startTimer(${timer.id})">Start</button>`;
        } else if (timer.running) {
            html += `<button class="btn" onclick="window.kitchenApp.timers.stopTimer(${timer.id})">Pause</button>`;
        }

        if (!timer.running) {
            html += `<button class="btn" onclick="window.kitchenApp.timers.resetTimer(${timer.id})">Reset</button>`;
        }

        html += `<button class="btn" style="background: #666;" onclick="window.kitchenApp.timers.removeTimer(${timer.id})">Remove</button>`;
        html += `</div></div>`;
    });

    container.innerHTML = html;
}

// Add timer form
document.getElementById('add-timer').addEventListener('click', () => {
    const name = prompt('Timer name (optional):') || '';
    const minutes = prompt('Minutes:', '10');
    const mins = parseFloat(minutes);
    if (!isNaN(mins) && mins > 0) {
        addTimer(name, mins);
    }
});

// Expose for testing and HTML onclick handlers
window.kitchenApp = window.kitchenApp || {};

window.kitchenApp.timers = {
    addTimer,
    startTimer,
    stopTimer,
    resetTimer,
    removeTimer,
    formatTime
};
