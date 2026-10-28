// js/timer.js

(() => {
    const timers = new Map();

    let timerIdCounter = 0;
    let sharedAudioContext = null;
    let tickerIntervalId = null;

    const TICK_INTERVAL_MS = 250;


    /*
     * Format seconds as MM:SS or HH:MM:SS.
     */
    function formatTime(totalSeconds) {
        const safeSeconds = Math.max(
            0,
            Math.ceil(totalSeconds)
        );

        const hours = Math.floor(
            safeSeconds / 3600
        );

        const minutes = Math.floor(
            (safeSeconds % 3600) / 60
        );

        const seconds =
            safeSeconds % 60;

        if (hours > 0) {
            return (
                `${hours.toString().padStart(2, '0')}:` +
                `${minutes.toString().padStart(2, '0')}:` +
                `${seconds.toString().padStart(2, '0')}`
            );
        }

        return (
            `${minutes.toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}`
        );
    }


    /*
     * Escape timer names before adding them
     * to generated HTML.
     */
    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }


    /*
     * Initialize audio while processing a direct
     * user interaction.
     *
     * Mobile browsers may block audio if the
     * AudioContext is first created only after
     * a timer finishes.
     */
    async function unlockAudio() {
        try {
            const AudioContextClass =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!AudioContextClass) {
                return false;
            }

            if (
                !sharedAudioContext ||
                sharedAudioContext.state === 'closed'
            ) {
                sharedAudioContext =
                    new AudioContextClass();
            }

            if (
                sharedAudioContext.state ===
                'suspended'
            ) {
                await sharedAudioContext.resume();
            }

            /*
             * Brief silent oscillator used to unlock
             * audio on stricter mobile browsers.
             */
            const oscillator =
                sharedAudioContext.createOscillator();

            const gainNode =
                sharedAudioContext.createGain();

            oscillator.connect(gainNode);

            gainNode.connect(
                sharedAudioContext.destination
            );

            gainNode.gain.value = 0;

            oscillator.start();

            oscillator.stop(
                sharedAudioContext.currentTime +
                0.01
            );

            return true;

        } catch (error) {
            console.warn(
                'Unable to initialize timer audio:',
                error
            );

            return false;
        }
    }


    /*
     * Calculate remaining time from an absolute
     * timestamp. This prevents drift when the
     * browser throttles background tabs.
     */
    function calculateRemainingSeconds(timer) {
        if (
            !timer.running ||
            !timer.endsAt
        ) {
            return Math.max(
                0,
                timer.remainingSeconds
            );
        }

        return Math.max(
            0,
            Math.ceil(
                (timer.endsAt - Date.now()) /
                1000
            )
        );
    }


    function addTimer(name, totalSeconds) {
        if (
            !Number.isFinite(totalSeconds) ||
            totalSeconds <= 0
        ) {
            return null;
        }

        const id =
            ++timerIdCounter;

        timers.set(id, {
            id,
            name:
                name ||
                `Timer ${id}`,
            totalSeconds,
            remainingSeconds:
                totalSeconds,
            endsAt: null,
            running: false,
            finished: false,
            alarmPlayed: false
        });

        renderTimerList();

        return id;
    }


    async function startTimer(id) {
        const timer =
            timers.get(id);

        if (
            !timer ||
            timer.running ||
            timer.finished
        ) {
            return;
        }

        /*
         * The Start button is a direct user action,
         * so this is a good time to unlock audio.
         */
        await unlockAudio();

        timer.running = true;
        timer.finished = false;
        timer.alarmPlayed = false;

        timer.endsAt =
            Date.now() +
            (timer.remainingSeconds * 1000);

        /*
         * Rebuild controls once to replace Start
         * with Pause.
         *
         * The DOM will not be rebuilt every tick.
         */
        renderTimerList();

        startTicker();
    }


    function stopTimer(id) {
        const timer =
            timers.get(id);

        if (!timer) {
            return;
        }

        /*
         * Capture the current accurate remaining
         * time before removing the end timestamp.
         */
        timer.remainingSeconds =
            calculateRemainingSeconds(timer);

        timer.running = false;
        timer.endsAt = null;

        /*
         * Rebuild once to replace Pause with Start.
         */
        renderTimerList();

        stopTickerIfIdle();
    }


    function resetTimer(id) {
        const timer =
            timers.get(id);

        if (!timer) {
            return;
        }

        timer.remainingSeconds =
            timer.totalSeconds;

        timer.endsAt = null;
        timer.running = false;
        timer.finished = false;
        timer.alarmPlayed = false;

        renderTimerList();

        stopTickerIfIdle();
    }


    function removeTimer(id) {
        timers.delete(id);

        renderTimerList();

        stopTickerIfIdle();
    }


    function finishTimer(timer) {
        timer.remainingSeconds = 0;
        timer.endsAt = null;
        timer.running = false;
        timer.finished = true;

        if (!timer.alarmPlayed) {
            timer.alarmPlayed = true;

            playAlarm();
        }
    }


    /*
     * One shared ticker updates every running timer.
     *
     * The ticker updates only the displayed text.
     * It does not recreate buttons during normal
     * countdown operation.
     */
    function startTicker() {
        if (tickerIntervalId !== null) {
            return;
        }

        tickerIntervalId =
            window.setInterval(
                updateRunningTimers,
                TICK_INTERVAL_MS
            );
    }


    function stopTicker() {
        if (tickerIntervalId === null) {
            return;
        }

        window.clearInterval(
            tickerIntervalId
        );

        tickerIntervalId = null;
    }


    function stopTickerIfIdle() {
        const hasRunningTimer =
            Array.from(
                timers.values()
            ).some(timer =>
                timer.running
            );

        if (!hasRunningTimer) {
            stopTicker();
        }
    }


    function updateRunningTimers() {
        let stateChanged = false;

        timers.forEach(timer => {
            if (!timer.running) {
                return;
            }

            const previousSeconds =
                timer.remainingSeconds;

            timer.remainingSeconds =
                calculateRemainingSeconds(
                    timer
                );

            if (
                timer.remainingSeconds <= 0
            ) {
                finishTimer(timer);

                stateChanged = true;

                return;
            }

            /*
             * Update only when the visible second
             * has changed.
             */
            if (
                timer.remainingSeconds !==
                previousSeconds
            ) {
                updateTimerDisplay(timer);
            }
        });

        /*
         * A finished timer needs new controls and
         * finished-state styling, so rebuild only
         * when a state transition occurs.
         */
        if (stateChanged) {
            renderTimerList();
        }

        stopTickerIfIdle();
    }


    /*
     * Update only text in an existing timer card.
     *
     * The buttons remain mounted and stable, which
     * prevents touchscreen taps from being lost.
     */
    function updateTimerDisplay(timer) {
        const timerElement =
            document.querySelector(
                `.timer-item[data-id="${timer.id}"]`
            );

        if (!timerElement) {
            return;
        }

        const timeElement =
            timerElement.querySelector(
                '.timer-time'
            );

        const statusElement =
            timerElement.querySelector(
                '.timer-status'
            );

        if (timeElement) {
            timeElement.textContent =
                formatTime(
                    timer.remainingSeconds
                );
        }

        if (statusElement) {
            statusElement.textContent =
                timer.finished
                    ? 'FINISHED!'
                    : timer.running
                        ? 'Running'
                        : 'Paused';
        }
    }


    function playAlarm() {
        try {
            if (
                !sharedAudioContext ||
                sharedAudioContext.state ===
                    'closed'
            ) {
                console.warn(
                    'Timer finished, but audio was not initialized.'
                );

                triggerVibration();

                return;
            }

            if (
                sharedAudioContext.state ===
                'suspended'
            ) {
                sharedAudioContext
                    .resume()
                    .catch(error => {
                        console.warn(
                            'Unable to resume timer audio:',
                            error
                        );
                    });
            }

            const beepTimes = [
                0,
                0.45,
                0.9,
                1.35
            ];

            beepTimes.forEach(
                startOffset => {
                    const oscillator =
                        sharedAudioContext
                            .createOscillator();

                    const gainNode =
                        sharedAudioContext
                            .createGain();

                    oscillator.connect(
                        gainNode
                    );

                    gainNode.connect(
                        sharedAudioContext
                            .destination
                    );

                    oscillator.frequency.value =
                        880;

                    oscillator.type =
                        'sine';

                    const startTime =
                        sharedAudioContext
                            .currentTime +
                        startOffset;

                    const stopTime =
                        startTime +
                        0.28;

                    gainNode.gain.setValueAtTime(
                        0.32,
                        startTime
                    );

                    gainNode.gain.exponentialRampToValueAtTime(
                        0.01,
                        stopTime
                    );

                    oscillator.start(
                        startTime
                    );

                    oscillator.stop(
                        stopTime
                    );
                }
            );

            triggerVibration();

        } catch (error) {
            console.warn(
                'Timer alarm unavailable:',
                error
            );

            triggerVibration();
        }
    }


    function triggerVibration() {
        if ('vibrate' in navigator) {
            navigator.vibrate([
                250,
                150,
                250,
                150,
                500
            ]);
        }
    }


    function getTimerStatus(timer) {
        if (timer.finished) {
            return 'FINISHED!';
        }

        if (timer.running) {
            return 'Running';
        }

        return 'Paused';
    }


    function renderTimerList() {
        const container =
            document.getElementById(
                'timer-list'
            );

        if (!container) {
            return;
        }

        const timerArray =
            Array.from(
                timers.values()
            );

        if (timerArray.length === 0) {
            container.innerHTML = `
                <p class="timer-empty">
                    No active timers.
                </p>
            `;

            return;
        }

        let html = '';

        timerArray.forEach(timer => {
            /*
             * Refresh the value before rendering,
             * but do not repeatedly redraw after
             * the card has been inserted.
             */
            if (timer.running) {
                timer.remainingSeconds =
                    calculateRemainingSeconds(
                        timer
                    );
            }

            const timeDisplay =
                formatTime(
                    timer.remainingSeconds
                );

            const statusClass =
                timer.finished
                    ? 'finished'
                    : '';

            const statusText =
                getTimerStatus(timer);

            html += `
                <div
                    class="timer-item ${statusClass}"
                    data-id="${timer.id}"
                >
                    <div class="timer-name">
                        ${escapeHtml(timer.name)}
                    </div>

                    <div class="timer-time">
                        ${timeDisplay}
                    </div>

                    <div class="timer-status">
                        ${statusText}
                    </div>

                    <div class="timer-controls">
            `;

            if (
                !timer.running &&
                !timer.finished
            ) {
                html += `
                    <button
                        class="btn timer-start"
                        type="button"
                        data-action="start"
                        data-timer-id="${timer.id}"
                    >
                        Start
                    </button>
                `;
            }

            if (timer.running) {
                html += `
                    <button
                        class="btn timer-pause"
                        type="button"
                        data-action="pause"
                        data-timer-id="${timer.id}"
                    >
                        Pause
                    </button>
                `;
            }

            if (!timer.running) {
                html += `
                    <button
                        class="btn timer-reset"
                        type="button"
                        data-action="reset"
                        data-timer-id="${timer.id}"
                    >
                        Reset
                    </button>
                `;
            }

            html += `
                        <button
                            class="btn timer-remove"
                            type="button"
                            data-action="remove"
                            data-timer-id="${timer.id}"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML =
            html;
    }


    function clampDurationInputs() {
        const hoursInput =
            document.getElementById(
                'timer-hours'
            );

        const minutesInput =
            document.getElementById(
                'timer-minutes'
            );

        const secondsInput =
            document.getElementById(
                'timer-seconds'
            );

        if (
            !hoursInput ||
            !minutesInput ||
            !secondsInput
        ) {
            return;
        }

        let hours =
            parseInt(
                hoursInput.value,
                10
            ) || 0;

        let minutes =
            parseInt(
                minutesInput.value,
                10
            ) || 0;

        let seconds =
            parseInt(
                secondsInput.value,
                10
            ) || 0;

        hours =
            Math.max(
                0,
                Math.min(24, hours)
            );

        minutes =
            Math.max(
                0,
                Math.min(59, minutes)
            );

        seconds =
            Math.max(
                0,
                Math.min(59, seconds)
            );

        hoursInput.value =
            hours;

        minutesInput.value =
            minutes;

        secondsInput.value =
            seconds;
    }


    async function createTimerFromForm() {
        const nameInput =
            document.getElementById(
                'timer-name'
            );

        const hoursInput =
            document.getElementById(
                'timer-hours'
            );

        const minutesInput =
            document.getElementById(
                'timer-minutes'
            );

        const secondsInput =
            document.getElementById(
                'timer-seconds'
            );

        if (
            !nameInput ||
            !hoursInput ||
            !minutesInput ||
            !secondsInput
        ) {
            return;
        }

        /*
         * Unlock audio while handling the user's
         * Start New Timer tap.
         */
        await unlockAudio();

        clampDurationInputs();

        const name =
            nameInput.value.trim();

        const hours =
            parseInt(
                hoursInput.value,
                10
            ) || 0;

        const minutes =
            parseInt(
                minutesInput.value,
                10
            ) || 0;

        const seconds =
            parseInt(
                secondsInput.value,
                10
            ) || 0;

        const totalSeconds =
            (hours * 3600) +
            (minutes * 60) +
            seconds;

        if (totalSeconds <= 0) {
            return;
        }

        const id =
            addTimer(
                name,
                totalSeconds
            );

        if (id === null) {
            return;
        }

        await startTimer(id);

        nameInput.value = '';
    }


    function setPreset(minutes) {
        const hoursInput =
            document.getElementById(
                'timer-hours'
            );

        const minutesInput =
            document.getElementById(
                'timer-minutes'
            );

        const secondsInput =
            document.getElementById(
                'timer-seconds'
            );

        if (
            !hoursInput ||
            !minutesInput ||
            !secondsInput
        ) {
            return;
        }

        hoursInput.value =
            Math.floor(
                minutes / 60
            );

        minutesInput.value =
            minutes % 60;

        secondsInput.value =
            0;
    }


    /*
     * Recalculate timers immediately when returning
     * from a background tab or locked screen.
     */
    function refreshRunningTimers() {
        let stateChanged = false;

        timers.forEach(timer => {
            if (!timer.running) {
                return;
            }

            timer.remainingSeconds =
                calculateRemainingSeconds(
                    timer
                );

            if (
                timer.remainingSeconds <= 0
            ) {
                finishTimer(timer);

                stateChanged = true;

                return;
            }

            updateTimerDisplay(timer);
        });

        if (stateChanged) {
            renderTimerList();
        }

        stopTickerIfIdle();
    }


    function handleTimerControlClick(event) {
        const button =
            event.target.closest(
                '[data-action][data-timer-id]'
            );

        if (!button) {
            return;
        }

        const timerId =
            Number.parseInt(
                button.dataset.timerId,
                10
            );

        if (!Number.isInteger(timerId)) {
            return;
        }

        const action =
            button.dataset.action;

        switch (action) {
            case 'start':
                startTimer(timerId);
                break;

            case 'pause':
                stopTimer(timerId);
                break;

            case 'reset':
                resetTimer(timerId);
                break;

            case 'remove':
                removeTimer(timerId);
                break;

            default:
                break;
        }
    }


    function initializeTimerControls() {
        const addTimerButton =
            document.getElementById(
                'add-timer'
            );

        const timerList =
            document.getElementById(
                'timer-list'
            );

        if (addTimerButton) {
            addTimerButton.addEventListener(
                'click',
                createTimerFromForm
            );
        }

        /*
         * One stable delegated click handler handles
         * every timer button.
         */
        if (timerList) {
            timerList.addEventListener(
                'click',
                handleTimerControlClick
            );
        }

        document
            .querySelectorAll(
                '.timer-preset'
            )
            .forEach(button => {
                button.addEventListener(
                    'click',
                    async () => {
                        await unlockAudio();

                        const minutes =
                            Number.parseInt(
                                button.dataset
                                    .minutes,
                                10
                            );

                        if (
                            Number.isInteger(
                                minutes
                            )
                        ) {
                            setPreset(minutes);
                        }
                    }
                );
            });

        [
            'timer-hours',
            'timer-minutes',
            'timer-seconds'
        ].forEach(id => {
            const input =
                document.getElementById(id);

            if (input) {
                input.addEventListener(
                    'change',
                    clampDurationInputs
                );
            }
        });

        document.addEventListener(
            'visibilitychange',
            () => {
                if (!document.hidden) {
                    refreshRunningTimers();
                }
            }
        );

        window.addEventListener(
            'focus',
            refreshRunningTimers
        );

        window.addEventListener(
            'pageshow',
            refreshRunningTimers
        );
    }


    window.kitchenApp =
        window.kitchenApp || {};

    window.kitchenApp.timers = {
        addTimer,
        startTimer,
        stopTimer,
        resetTimer,
        removeTimer,
        formatTime,
        createTimerFromForm,
        setPreset,
        refreshRunningTimers,
        unlockAudio
    };

    initializeTimerControls();
    renderTimerList();
})();
