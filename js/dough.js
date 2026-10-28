// js/dough.js

(() => {
    /*
     * Calculate a dough formula using baker's
     * percentages.
     *
     * Flour is the base weight.
     *
     * Hydration, salt, and starter are expressed
     * as percentages of flour weight.
     */
    function calculateDough(
        flour,
        hydration,
        salt,
        starter
    ) {
        if (
            !Number.isFinite(flour) ||
            flour <= 0
        ) {
            return null;
        }

        const safeHydration =
            Number.isFinite(hydration)
                ? Math.max(0, hydration)
                : 0;

        const safeSalt =
            Number.isFinite(salt)
                ? Math.max(0, salt)
                : 0;

        const safeStarter =
            Number.isFinite(starter)
                ? Math.max(0, starter)
                : 0;


        const water =
            flour *
            (safeHydration / 100);

        const saltWeight =
            flour *
            (safeSalt / 100);

        const starterWeight =
            flour *
            (safeStarter / 100);

        const total =
            flour +
            water +
            saltWeight +
            starterWeight;


        return {
            flour,
            water,
            salt: saltWeight,
            starter: starterWeight,
            total,
            hydration: safeHydration,
            saltPercentage: safeSalt,
            starterPercentage: safeStarter
        };
    }


    /*
     * Format gram values cleanly without showing
     * unnecessary trailing zeroes.
     */
    function formatGrams(value) {
        if (!Number.isFinite(value)) {
            return '0';
        }

        if (
            Math.abs(
                value -
                Math.round(value)
            ) < 0.005
        ) {
            return String(
                Math.round(value)
            );
        }

        return parseFloat(
            value.toFixed(1)
        ).toString();
    }


    /*
     * Read input values and update the result card.
     */
    function renderDoughResults() {
        const flourInput =
            document.getElementById(
                'flour'
            );

        const hydrationInput =
            document.getElementById(
                'hydration'
            );

        const saltInput =
            document.getElementById(
                'salt'
            );

        const starterInput =
            document.getElementById(
                'starter'
            );

        const results =
            document.getElementById(
                'dough-results'
            );


        if (
            !flourInput ||
            !hydrationInput ||
            !saltInput ||
            !starterInput ||
            !results
        ) {
            return;
        }


        const flour =
            parseFloat(
                flourInput.value
            );

        const hydration =
            parseFloat(
                hydrationInput.value
            );

        const salt =
            parseFloat(
                saltInput.value
            );

        const starter =
            parseFloat(
                starterInput.value
            );


        if (
            !Number.isFinite(flour) ||
            flour <= 0
        ) {
            results.innerHTML = `
                <p>
                    Enter a flour amount greater
                    than zero.
                </p>
            `;

            return;
        }


        if (
            !Number.isFinite(hydration) ||
            hydration < 0 ||
            !Number.isFinite(salt) ||
            salt < 0 ||
            !Number.isFinite(starter) ||
            starter < 0
        ) {
            results.innerHTML = `
                <p>
                    Enter valid non-negative
                    percentages.
                </p>
            `;

            return;
        }


        const result =
            calculateDough(
                flour,
                hydration,
                salt,
                starter
            );


        if (!result) {
            results.innerHTML = `
                <p>
                    Unable to calculate the dough.
                </p>
            `;

            return;
        }


        results.innerHTML = `
            <div class="dough-result-list">

                <p>
                    <strong>Flour:</strong>
                    ${formatGrams(
                        result.flour
                    )} g
                </p>

                <p>
                    <strong>Water:</strong>
                    ${formatGrams(
                        result.water
                    )} g
                </p>

                <p>
                    <strong>Salt:</strong>
                    ${formatGrams(
                        result.salt
                    )} g
                </p>

                <p>
                    <strong>Starter:</strong>
                    ${formatGrams(
                        result.starter
                    )} g
                </p>

                <p>
                    <strong>Total dough:</strong>
                    ${formatGrams(
                        result.total
                    )} g
                </p>

            </div>

            <div class="dough-formula-summary">

                <p>
                    <strong>Baker's percentages</strong>
                </p>

                <p>
                    Flour: 100%
                </p>

                <p>
                    Water:
                    ${result.hydration}%
                </p>

                <p>
                    Salt:
                    ${result.saltPercentage}%
                </p>

                <p>
                    Starter:
                    ${result.starterPercentage}%
                </p>

            </div>
        `;
    }


    /*
     * Initialize the Dough Calculator controls.
     */
    function initializeDoughCalculator() {
        const inputIds = [
            'flour',
            'hydration',
            'salt',
            'starter'
        ];


        inputIds.forEach(id => {
            const input =
                document.getElementById(id);

            if (!input) {
                console.warn(
                    `Dough calculator input not found: ${id}`
                );

                return;
            }


            input.addEventListener(
                'input',
                renderDoughResults
            );


            input.addEventListener(
                'change',
                renderDoughResults
            );
        });


        renderDoughResults();
    }


    /*
     * Share only the public Dough Calculator API.
     *
     * calculateDough is useful for future testing
     * without exposing internal helper functions
     * such as formatGrams.
     */
    window.kitchenApp =
        window.kitchenApp || {};


    window.kitchenApp.dough = {
        calculateDough,
        renderDoughResults
    };


    /*
     * Preserve backward compatibility with the
     * original project's global if other existing
     * code references it.
     */
    window.doughCalc = {
        calculateDough,
        renderDoughResults
    };


    initializeDoughCalculator();
})();
