// js/ingredient-weights.js

(() => {
    let ingredientWeightData = {};
    let ingredientWeightsLoaded = false;
    let ingredientWeightsLoading = false;


    /*
     * Cooking volume relationships.
     *
     * 1 cup = 16 tablespoons
     * 1 cup = 48 teaspoons
     */
    const volumeToCups = {
        cup: 1,
        tbsp: 1 / 16,
        tsp: 1 / 48
    };


    function formatIngredientName(name) {
        return String(name)
            .split(' ')
            .map(word => {
                if (!word) {
                    return '';
                }

                return (
                    word.charAt(0).toUpperCase() +
                    word.slice(1)
                );
            })
            .join(' ');
    }


    function getIngredientSelect() {
        return document.getElementById(
            'weight-ingredient'
        );
    }


    function getAmountInput() {
        return document.getElementById(
            'weight-amount'
        );
    }


    function getUnitSelect() {
        return document.getElementById(
            'weight-unit'
        );
    }


    function getResultsContainer() {
        return document.getElementById(
            'weight-results'
        );
    }


    function setControlsEnabled(enabled) {
        const ingredientSelect =
            getIngredientSelect();

        const amountInput =
            getAmountInput();

        const unitSelect =
            getUnitSelect();


        if (ingredientSelect) {
            ingredientSelect.disabled =
                !enabled;
        }


        if (amountInput) {
            amountInput.disabled =
                !enabled;
        }


        if (unitSelect) {
            unitSelect.disabled =
                !enabled;
        }
    }


    function renderLoadingState() {
        const result =
            getResultsContainer();


        if (!result) {
            return;
        }


        result.innerHTML = `
            <p>
                Loading ingredient weight data...
            </p>
        `;
    }


    function renderLoadError(error) {
        const result =
            getResultsContainer();


        console.error(
            'Failed to load ingredient weights:',
            error
        );


        if (!result) {
            return;
        }


        result.innerHTML = `
            <p>
                Unable to load ingredient
                weight data.
            </p>

            <p>
                Refresh the page and try again.
            </p>
        `;
    }


    /*
     * Validate the overall JSON structure during
     * loading.
     *
     * Detailed gramsPerCup validation is also
     * performed before every calculation.
     */
    function validateIngredientData(data) {
        if (
            !data ||
            typeof data !== 'object' ||
            Array.isArray(data)
        ) {
            return false;
        }


        return (
            Object.keys(data).length > 0
        );
    }


    async function loadIngredientWeights() {
        if (
            ingredientWeightsLoaded ||
            ingredientWeightsLoading
        ) {
            return;
        }


        ingredientWeightsLoading =
            true;


        setControlsEnabled(false);
        renderLoadingState();


        try {
            const response =
                await fetch(
                    'js/ingredient-weights.json',
                    {
                        cache: 'no-cache'
                    }
                );


            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }


            const loadedData =
                await response.json();


            if (
                !validateIngredientData(
                    loadedData
                )
            ) {
                throw new Error(
                    'Ingredient weight data is not a valid object.'
                );
            }


            ingredientWeightData =
                loadedData;

            ingredientWeightsLoaded =
                true;

            ingredientWeightsLoading =
                false;


            populateIngredientList();

            setControlsEnabled(true);

            calculateIngredientWeight();

        } catch (error) {
            ingredientWeightsLoading =
                false;

            ingredientWeightsLoaded =
                false;


            setControlsEnabled(true);

            renderLoadError(error);
        }
    }


    function populateIngredientList() {
        const select =
            getIngredientSelect();


        if (!select) {
            return;
        }


        /*
         * Remember the user's current selection
         * if the list is rebuilt.
         */
        const previousSelection =
            select.value;


        select.replaceChildren();


        const ingredients =
            Object.keys(
                ingredientWeightData
            )
                .sort(
                    (first, second) =>
                        first.localeCompare(
                            second
                        )
                );


        ingredients.forEach(
            ingredient => {
                const option =
                    document.createElement(
                        'option'
                    );


                option.value =
                    ingredient;


                option.textContent =
                    formatIngredientName(
                        ingredient
                    );


                select.appendChild(
                    option
                );
            }
        );


        if (
            previousSelection &&
            ingredientWeightData[
                previousSelection
            ]
        ) {
            select.value =
                previousSelection;
        }
    }


    function convertVolumeToCups(
        amount,
        unit
    ) {
        if (
            !Number.isFinite(amount) ||
            amount < 0
        ) {
            return Number.NaN;
        }


        const conversionFactor =
            volumeToCups[unit];


        if (
            !Number.isFinite(
                conversionFactor
            ) ||
            conversionFactor <= 0
        ) {
            return Number.NaN;
        }


        return (
            amount *
            conversionFactor
        );
    }


    function getUnitLabel(
        unit,
        amount
    ) {
        switch (unit) {
            case 'cup':
                return (
                    amount === 1
                        ? 'cup'
                        : 'cups'
                );

            case 'tbsp':
                return (
                    amount === 1
                        ? 'tablespoon'
                        : 'tablespoons'
                );

            case 'tsp':
                return (
                    amount === 1
                        ? 'teaspoon'
                        : 'teaspoons'
                );

            default:
                return unit;
        }
    }


    function formatWeight(
        value,
        decimalPlaces
    ) {
        if (!Number.isFinite(value)) {
            return '';
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


        return String(
            parseFloat(
                value.toFixed(
                    decimalPlaces
                )
            )
        );
    }


    function calculateIngredientWeight() {
        const ingredientSelect =
            getIngredientSelect();

        const amountInput =
            getAmountInput();

        const unitSelect =
            getUnitSelect();

        const result =
            getResultsContainer();


        if (
            !ingredientSelect ||
            !amountInput ||
            !unitSelect ||
            !result
        ) {
            return;
        }


        if (!ingredientWeightsLoaded) {
            if (ingredientWeightsLoading) {
                renderLoadingState();
            }

            return;
        }


        const ingredient =
            ingredientSelect.value;


        const rawAmount =
            amountInput.value.trim();


        if (rawAmount === '') {
            result.innerHTML = `
                <p>
                    Enter an amount to calculate
                    the approximate weight.
                </p>
            `;

            return;
        }


        const amount =
            Number.parseFloat(
                rawAmount
            );


        const unit =
            unitSelect.value;


        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            result.innerHTML = `
                <p>
                    Enter an amount greater
                    than zero.
                </p>
            `;

            return;
        }


        if (
            !Object.hasOwn(
                volumeToCups,
                unit
            )
        ) {
            result.innerHTML = `
                <p>
                    Unsupported volume unit.
                </p>
            `;

            return;
        }


        const ingredientData =
            ingredientWeightData[
                ingredient
            ];


        if (
            !ingredientData ||
            typeof ingredientData !==
                'object'
        ) {
            result.innerHTML = `
                <p>
                    No weight data is available
                    for this ingredient.
                </p>
            `;

            return;
        }


        /*
         * This check anticipates Fix #6 as well:
         * malformed JSON must never produce NaN
         * results in the UI.
         */
        const gramsPerCup =
            Number(
                ingredientData
                    .gramsPerCup
            );


        if (
            !Number.isFinite(
                gramsPerCup
            ) ||
            gramsPerCup <= 0
        ) {
            console.error(
                `Invalid gramsPerCup value for "${ingredient}".`,
                ingredientData
            );


            result.innerHTML = `
                <p>
                    Reference weight data for
                    this ingredient is invalid.
                </p>
            `;

            return;
        }


        const cups =
            convertVolumeToCups(
                amount,
                unit
            );


        if (!Number.isFinite(cups)) {
            result.innerHTML = `
                <p>
                    Unable to convert the
                    selected volume.
                </p>
            `;

            return;
        }


        const grams =
            cups *
            gramsPerCup;


        const ounces =
            grams /
            28.3495;


        if (
            !Number.isFinite(grams) ||
            !Number.isFinite(ounces)
        ) {
            result.innerHTML = `
                <p>
                    Unable to calculate the
                    ingredient weight.
                </p>
            `;

            return;
        }


        const unitLabel =
            getUnitLabel(
                unit,
                amount
            );


        const ingredientLabel =
            formatIngredientName(
                ingredient
            );


        result.innerHTML = `
            <p>
                <strong>
                    ${amount}
                    ${unitLabel}
                    ${ingredientLabel}
                </strong>
            </p>

            <p>
                <strong>
                    ${formatWeight(
                        grams,
                        1
                    )}
                    grams
                </strong>
            </p>

            <p>
                ${formatWeight(
                    ounces,
                    2
                )}
                ounces
            </p>

            <p
                style="
                    color: var(--text-muted);
                    font-size: 0.85rem;
                "
            >
                Based on approximately
                ${formatWeight(
                    gramsPerCup,
                    1
                )}
                g per cup.
            </p>

            <p
                style="
                    color: var(--text-muted);
                    font-size: 0.8rem;
                "
            >
                Approximate value. Ingredient
                weight can vary by brand,
                packing, and measuring method.
            </p>
        `;
    }


    function initializeIngredientWeights() {
        const ingredientSelect =
            getIngredientSelect();

        const amountInput =
            getAmountInput();

        const unitSelect =
            getUnitSelect();

        const result =
            getResultsContainer();


        if (
            !ingredientSelect ||
            !amountInput ||
            !unitSelect ||
            !result
        ) {
            console.error(
                'Ingredient Weights elements were not found.'
            );

            return;
        }


        ingredientSelect.addEventListener(
            'change',
            calculateIngredientWeight
        );


        amountInput.addEventListener(
            'input',
            calculateIngredientWeight
        );


        unitSelect.addEventListener(
            'change',
            calculateIngredientWeight
        );


        loadIngredientWeights();
    }


    /*
     * Expose only the intentional public API.
     *
     * ingredientWeightData,
     * formatIngredientName,
     * getUnitLabel,
     * and other helpers remain private inside
     * this file.
     */
    window.kitchenApp =
        window.kitchenApp || {};


    window.kitchenApp.ingredientWeights = {
        calculateIngredientWeight,
        convertVolumeToCups,
        loadIngredientWeights
    };


    initializeIngredientWeights();
})();
