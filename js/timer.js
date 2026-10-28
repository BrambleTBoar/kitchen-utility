// js/timer.js

(() => {
    const STORAGE_KEY = 'kitchenToolsTimers';
    const STORAGE_VERSION = 1;
    const TICK_INTERVAL_MS = 250;

    const timers = new Map();

    let timerIdCounter = 0;
    let sharedAudioContext = null;
    let tickerIntervalId = null;


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


    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }


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


    function calculateRemainingSeconds(timer) {
        if (
            !timer.running ||
            !Number.isFinite(timer.endsAt)
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


    /*
     * Convert live timer objects into plain data
     * safe to place in localStorage.
     */
    function serializeTimers() {
        return {
            version: STORAGE_VERSION,

            timerIdCounter,

            timers:
                Array.from(
                    timers.values()
                ).map(timer => ({
                    id: timer.id,
                    name: timer.name,
                    totalSeconds:
                        timer.totalSeconds,
                    remainingSeconds:
                        timer.running
                            ? calculateRemainingSeconds(
                                timer
                            )
                            : timer.remainingSeconds,
                    endsAt:
                        timer.endsAt,
                    running:
                        timer.running,
                    finished:
                        timer.finished
                }))
        };
    }


    function saveTimers() {
        try {
            const serialized =
                serializeTimers();

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(
                    serialized
                )
            );

        } catch (error) {
            /*
             * A browser kiosk/private mode may
             * prohibit localStorage. Timers still
             * work for the active page session.
             */
            console.warn(
                'Unable to save timers:',
                error
            );
        }
    }


    function clearSavedTimers() {
        try {
            localStorage.removeItem(
                STORAGE_KEY
            );
        } catch (error) {
            console.warn(
                'Unable to clear saved timers:',
                error
            );
        }
    }


    function validateStoredTimer(
        storedTimer
    ) {
        if (
            !storedTimer ||
            typeof storedTimer !== 'object'
        ) {
            return null;
        }

        const id =
            Number(storedTimer.id);

        const totalSeconds =
            Number(
                storedTimer.totalSeconds
            );

        const remainingSeconds =
            Number(
                storedTimer.remainingSeconds
            );

        const rawEndsAt =
            storedTimer.endsAt;

        const endsAt =
            rawEndsAt === null
                ? null
                : Number(rawEndsAt);

        const name =
            typeof storedTimer.name ===
                'string'
                ? storedTimer.name
                    .trim()
                    .slice(0, 200)
                : 'Timer';

        const running =
            storedTimer.running === true;

        const finished =
            storedTimer.finished === true;


        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {
            return null;
        }


        if (
            !Number.isFinite(
                totalSeconds
            ) ||
            totalSeconds <= 0
        ) {
            return null;
        }


        if (
            !Number.isFinite(
                remainingSeconds
            ) ||
            remainingSeconds < 0
        ) {
            return null;
        }


        if (
            running &&
            (
                !Number.isFinite(endsAt) ||
                endsAt <= 0
            )
        ) {
            return null;
        }


        return {
            id,
            name:
                name ||
                `Timer ${id}`,
            totalSeconds,
            remainingSeconds:
                Math.min(
                    remainingSeconds,
                    totalSeconds
                ),
            endsAt:
                running
                    ? endsAt
                    : null,
            running,
            finished,
            alarmPlayed:
                finished
        };
    }


    function restoreTimers() {
        let storedValue;

        try {
            storedValue =
                localStorage.getItem(
                    STORAGE_KEY
                );
        } catch (error) {
            console.warn(
                'Unable to read saved timers:',
                error
            );

            return;
        }


        if (!storedValue) {
            return;
        }


        try {
            const savedState =
                JSON.parse(
                    storedValue
                );


            if (
                !savedState ||
                typeof savedState !==
                    'object' ||
                savedState.version !==
                    STORAGE_VERSION ||
                !Array.isArray(
                    savedState.timers
                )
            ) {
                clearSavedTimers();
                return;
            }


            let highestId = 0;


            savedState.timers.forEach(
                storedTimer => {

                    const timer =
                        validateStoredTimer(
                            storedTimer
                        );


                    if (!timer) {
                        return;
                    }


                    highestId =
                        Math.max(
                            highestId,
                            timer.id
                        );


                    /*
                     * A running timer may have
                     * elapsed while the page was
                     * closed.
                     */
                    if (timer.running) {
                        timer.remainingSeconds =
                            calculateRemainingSeconds(
                                timer
                            );


                        if (
                            timer.remainingSeconds <=
                            0
                        ) {
                            timer.remainingSeconds = 0;
                            timer.endsAt = null;
                            timer.running = false;
                            timer.finished = true;

                            /*
                             * Do not sound the alarm
                             * simply because an old
                             * expired timer was
                             * restored.
                             */
                            timer.alarmPlayed = true;
                        }
                    }


                    timers.set(
                        timer.id,
                        timer
                    );
                }
            );


            timerIdCounter =
                Math.max(
                    Number.isInteger(
                        savedState
                            .timerIdCounter
                    )
                        ? savedState
                            .timerIdCounter
                        : 0,
                    highestId
                );


            /*
             * Rewrite storage after cleanup so
             * expired/corrected state is saved.
             */
            saveTimers();

        } catch (error) {
            console.warn(
                'Saved timer data was invalid and has been discarded:',
                error
            );

            clearSavedTimers();
        }
    }


    function addTimer(
        name,
        totalSeconds
    ) {
        if (
            !Number.isFinite(
                totalSeconds
            ) ||
            totalSeconds <= 0
        ) {
            return null;
        }


        const id =
            ++timerIdCounter;


        timers.set(id, {
            id,
            name:
                String(
                    name ||
                    `Timer ${id}`
                )
                    .trim()
                    .slice(0, 200) ||
                `Timer ${id}`,
            totalSeconds,
            remainingSeconds:
                totalSeconds,
            endsAt: null,
            running: false,
            finished: false,
            alarmPlayed: false
        });


        saveTimers();
        renderTimerList();


        return id;
    }


    async function startTimer(id) {
        const timer =
            timers.get(id);


        if (
            !timer ||
            timer.running ||
            timer.finished ||
            timer.remainingSeconds <= 0
        ) {
            return;
        }


        await unlockAudio();


        timer.running = true;
        timer.finished = false;
        timer.alarmPlayed = false;


        timer.endsAt =
            Date.now() +
            (
                timer.remainingSeconds *
                1000
            );


        saveTimers();
        renderTimerList();
        startTicker();
    }


    function stopTimer(id) {
        const timer =
            timers.get(id);


        if (
            !timer ||
            !timer.running
        ) {
            return;
        }


        timer.remainingSeconds =
            calculateRemainingSeconds(
                timer
            );


        timer.running = false;
        timer.endsAt = null;


        saveTimers();
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


        saveTimers();
        renderTimerList();
        stopTickerIfIdle();
    }


    function removeTimer(id) {
        if (!timers.has(id)) {
            return;
        }


        timers.delete(id);


        saveTimers();
        renderTimerList();
        stopTickerIfIdle();
    }


    function finishTimer(
        timer,
        shouldAlarm = true
    ) {
        timer.remainingSeconds = 0;
        timer.endsAt = null;
        timer.running = false;
        timer.finished = true;


        if (
            shouldAlarm &&
            !timer.alarmPlayed
        ) {
            timer.alarmPlayed = true;

            playAlarm();
        } else {
            timer.alarmPlayed = true;
        }


        saveTimers();
    }


    function startTicker() {
        if (
            tickerIntervalId !== null
        ) {
            return;
        }


        tickerIntervalId =
            window.setInterval(
                updateRunningTimers,
                TICK_INTERVAL_MS
            );
    }


    function stopTicker() {
        if (
            tickerIntervalId === null
        ) {
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
            ).some(
                timer =>
                    timer.running
            );


        if (!hasRunningTimer) {
            stopTicker();
        }
    }


    function updateRunningTimers() {
        let stateChanged = false;
        let storageChanged = false;


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
                finishTimer(
                    timer,
                    true
                );

                stateChanged = true;

                return;
            }


            if (
                timer.remainingSeconds !==
                previousSeconds
            ) {
                updateTimerDisplay(
                    timer
                );

                storageChanged = true;
            }
        });


        /*
         * Persist visible remaining time periodically
         * as well as on state changes.
         *
         * Running timers still restore from endsAt,
         * so this is mostly useful as human-readable
         * consistency in the stored state.
         */
        if (storageChanged) {
            saveTimers();
        }


        if (stateChanged) {
            renderTimerList();
        }


        stopTickerIfIdle();
    }


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
                getTimerStatus(
                    timer
                );
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


                    gainNode.gain
                        .setValueAtTime(
                            0.32,
                            startTime
                        );


                    gainNode.gain
                        .exponentialRampToValueAtTime(
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
        if (
            'vibrate' in navigator
        ) {
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


        if (
            timerArray.length === 0
        ) {
            container.innerHTML = `
                <p class="timer-empty">
                    No active timers.
                </p>
            `;

            return;
        }


        let html = '';


        timerArray.forEach(timer => {
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
                getTimerStatus(
                    timer
                );


            html += `
                <div
                    class="timer-item ${statusClass}"
                    data-id="${timer.id}"
                >

                    <div class="timer-name">
                        ${escapeHtml(
                            timer.name
                        )}
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
            Number.parseInt(
                hoursInput.value,
                10
            ) || 0;


        let minutes =
            Number.parseInt(
                minutesInput.value,
                10
            ) || 0;


        let seconds =
            Number.parseInt(
                secondsInput.value,
                10
            ) || 0;


        hours =
            Math.max(
                0,
                Math.min(
                    24,
                    hours
                )
            );


        minutes =
            Math.max(
                0,
                Math.min(
                    59,
                    minutes
                )
            );


        seconds =
            Math.max(
                0,
                Math.min(
                    59,
                    seconds
                )
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


        await unlockAudio();

        clampDurationInputs();


        const name =
            nameInput.value.trim();


        const hours =
            Number.parseInt(
                hoursInput.value,
                10
            ) || 0;


        const minutes =
            Number.parseInt(
                minutesInput.value,
                10
            ) || 0;


        const seconds =
            Number.parseInt(
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
                /*
                 * The page is currently active,
                 * so an alarm is appropriate.
                 */
                finishTimer(
                    timer,
                    true
                );

                stateChanged = true;

                return;
            }


            updateTimerDisplay(
                timer
            );
        });


        saveTimers();


        if (stateChanged) {
            renderTimerList();
        }


        stopTickerIfIdle();
    }


    function handleTimerControlClick(
        event
    ) {
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


        if (
            !Number.isInteger(
                timerId
            )
        ) {
            return;
        }


        const action =
            button.dataset.action;


        switch (action) {
            case 'start':
                startTimer(
                    timerId
                );
                break;

            case 'pause':
                stopTimer(
                    timerId
                );
                break;

            case 'reset':
                resetTimer(
                    timerId
                );
                break;

            case 'remove':
                removeTimer(
                    timerId
                );
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
                            setPreset(
                                minutes
                            );
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
                document.getElementById(
                    id
                );


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


        /*
         * Save the latest state if the browser is
         * navigating away.
         */
        window.addEventListener(
            'pagehide',
            saveTimers
        );
    }


    /*
     * Restore saved timers before the first render.
     */
    restoreTimers();


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
        unlockAudio,
        saveTimers
    };


    initializeTimerControls();
    renderTimerList();


    /*
     * Resume ticker only when at least one restored
     * timer is still actively running.
     */
    if (
        Array.from(
            timers.values()
        ).some(
            timer =>
                timer.running
        )
    ) {
        startTicker();
    }
})();
