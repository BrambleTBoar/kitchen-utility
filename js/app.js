// js/app.js

(() => {
    const STORAGE_KEY = 'activeTab';


    /*
     * Return the page's tool tabs.
     */
    function getTabs() {
        return document.querySelectorAll(
            '.tab[data-tab]'
        );
    }


    /*
     * Return all tool panels.
     */
    function getPanels() {
        return document.querySelectorAll(
            '.tool-panel'
        );
    }


    /*
     * Determine whether a requested tab actually
     * exists before attempting to activate it.
     */
    function tabExists(tabName) {
        if (!tabName) {
            return false;
        }

        return Boolean(
            document.getElementById(
                tabName
            )
        );
    }


    /*
     * Activate a tool tab and hide all other panels.
     */
    function switchTab(tabName) {
        if (!tabExists(tabName)) {
            console.warn(
                `Kitchen Tools tab does not exist: ${tabName}`
            );

            return false;
        }

        const tabs = getTabs();
        const panels = getPanels();

        tabs.forEach(tab => {
            const isActive =
                tab.dataset.tab ===
                tabName;

            tab.classList.toggle(
                'active',
                isActive
            );

            tab.setAttribute(
                'aria-selected',
                isActive
                    ? 'true'
                    : 'false'
            );

            /*
             * Improve keyboard and assistive
             * technology navigation.
             */
            tab.tabIndex =
                isActive
                    ? 0
                    : -1;
        });


        panels.forEach(panel => {
            const isActive =
                panel.id ===
                tabName;

            panel.classList.toggle(
                'active',
                isActive
            );

            panel.hidden =
                !isActive;
        });


        try {
            localStorage.setItem(
                STORAGE_KEY,
                tabName
            );
        } catch (error) {
            /*
             * The application does not depend on
             * localStorage. Some private browsing,
             * kiosk, or restricted environments may
             * prevent access to it.
             */
            console.warn(
                'Unable to remember the active tab:',
                error
            );
        }


        return true;
    }


    /*
     * Restore the previously selected tab.
     *
     * If the saved tab no longer exists, leave the
     * HTML-defined default tab active.
     */
    function restoreSavedTab() {
        let savedTab = null;

        try {
            savedTab =
                localStorage.getItem(
                    STORAGE_KEY
                );
        } catch (error) {
            console.warn(
                'Unable to read the saved active tab:',
                error
            );

            return;
        }


        if (
            savedTab &&
            tabExists(savedTab)
        ) {
            switchTab(
                savedTab
            );
        }
    }


    /*
     * Arrow-key navigation is useful on desktops,
     * accessibility devices, and tablets with
     * attached keyboards.
     */
    function handleTabKeydown(event) {
        const navigationKeys = [
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
            'Home',
            'End'
        ];


        if (
            !navigationKeys.includes(
                event.key
            )
        ) {
            return;
        }


        const tabs =
            Array.from(
                getTabs()
            );


        if (tabs.length === 0) {
            return;
        }


        const currentIndex =
            tabs.indexOf(
                event.currentTarget
            );


        if (currentIndex === -1) {
            return;
        }


        event.preventDefault();


        let targetIndex =
            currentIndex;


        switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                targetIndex =
                    currentIndex - 1;

                if (targetIndex < 0) {
                    targetIndex =
                        tabs.length - 1;
                }

                break;


            case 'ArrowRight':
            case 'ArrowDown':
                targetIndex =
                    currentIndex + 1;

                if (
                    targetIndex >=
                    tabs.length
                ) {
                    targetIndex = 0;
                }

                break;


            case 'Home':
                targetIndex = 0;
                break;


            case 'End':
                targetIndex =
                    tabs.length - 1;
                break;


            default:
                return;
        }


        const targetTab =
            tabs[targetIndex];


        const targetName =
            targetTab.dataset.tab;


        if (
            targetName &&
            switchTab(targetName)
        ) {
            targetTab.focus();
        }
    }


    /*
     * Initialize tab controls.
     */
    function initializeTabs() {
        const tabs =
            getTabs();


        tabs.forEach(tab => {
            tab.addEventListener(
                'click',
                () => {
                    const tabName =
                        tab.dataset.tab;

                    if (tabName) {
                        switchTab(
                            tabName
                        );
                    }
                }
            );


            tab.addEventListener(
                'keydown',
                handleTabKeydown
            );
        });


        restoreSavedTab();


        /*
         * If there is no valid saved tab, normalize
         * tabindex based on whichever tab the HTML
         * currently marks as active.
         */
        const activeTab =
            document.querySelector(
                '.tab.active[data-tab]'
            );


        tabs.forEach(tab => {
            tab.tabIndex =
                tab === activeTab
                    ? 0
                    : -1;
        });
    }


    /*
     * Preserve modules registered by other
     * Kitchen Tools scripts.
     *
     * Never do:
     *
     * window.kitchenApp = { switchTab };
     *
     * because that would erase timers, scaler,
     * substitutions, and other modules.
     */
    window.kitchenApp =
        window.kitchenApp || {};


    window.kitchenApp.switchTab =
        switchTab;


    window.kitchenApp.tabs = {
        switchTab,
        tabExists,
        restoreSavedTab
    };


    initializeTabs();
})();
