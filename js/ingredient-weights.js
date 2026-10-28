// js/ingredient-weights.js

(() => {
    let ingredientWeightData = {};
    let ingredientWeightsLoaded = false;
    let ingredientWeightsLoading = false;

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
                ${String(error.message || error)}
            </p>
        `;
    }


    /*
     * Validate every ingredient record before
     * accepting the dataset.
     *
     * Requirements:
     *
     * {
     *   "ingredient name": {
     *       "gramsPerCup": number > 0
     *   }
     * }
     */
    function validateIngredientData(data) {
        const errors = [];

        if (
            !data ||
            typeof data !== 'object' ||
            Array.isArray(data)
        ) {
            return {
                valid: false,
                errors: [
                    'Ingredient weight data must be a JSON object.'
                ],
                cleanedData: {}
            };
        }


        const entries =
            Object.entries(data);


        if (entries.length === 0) {
            return {
                valid: false,
                errors: [
                    'Ingredient weight database is empty.'
                ],
                cleanedData: {}
            };
        }


        const cleanedData = {};


        entries.forEach(
            ([ingredient, record]) => {

                const normalizedIngredient =
                    String(ingredient).trim();


                if (!normalizedIngredient) {
                    errors.push(
                        'An ingredient has an empty name.'
                    );

                    return;
                }


                if (
                    !record ||
                    typeof record !== 'object' ||
                    Array.isArray(record)
                ) {
                    errors.push(
                        `"${normalizedIngredient}" does not contain a valid data object.`
                    );

                    return;
                }


                /*
                 * Require the property to exist.
                 */
                if (
                    !Object.hasOwn(
                        record,
                        'gramsPerCup'
                    )
                ) {
                    errors.push(
                        `"${normalizedIngredient}" is missing gramsPerCup.`
                    );

                    return;
                }


                const gramsPerCup =
                    Number(
                        record.gramsPerCup
                    );


                if (
                    !Number.isFinite(
                        gramsPerCup
                    )
                ) {
                    errors.push(
                        `"${normalizedIngredient}" has a non-numeric gramsPerCup value.`
                    );

                    return;
                }


                if (gramsPerCup <= 0) {
                    errors.push(
                        `"${normalizedIngredient}" has gramsPerCup <= 0.`
                    );

                    return;
                }


                /*
                 * Extremely high values are probably
                 * data-entry mistakes.
                 *
                 * Honey is around 340 g/cup, so
                 * 2,000 g/cup leaves plenty of room
                 * while catching obvious bad values.
                 */
                if (gramsPerCup > 2000) {
                    errors.push(
                        `"${normalizedIngredient}" has an implausibly high gramsPerCup value (${gramsPerCup}).`
                    );

                    return;
                }


                /*
                 * Duplicate ingredient names that
                 * differ only by capitalization or
                 * whitespace should not silently
                 * coexist.
                 */
                const normalizedKey =
                    normalizedIngredient
                        .toLowerCase();


                const existingKey =
                    Object.keys(
                        cleanedData
                    ).find(
                        existingIngredient =>
                            existingIngredient
                                .toLowerCase() ===
                            normalizedKey
                    );


                if (existingKey) {
                    errors.push(
                        `"${normalizedIngredient}" duplicates "${existingKey}".`
                    );

                    return;
                }


                cleanedData[
                    normalizedIngredient
                ] = {
                    gramsPerCup
                };
            }
        );


        return {
            valid:
                errors.length === 0 &&
                Object.keys(
                    cleanedData
                ).length > 0,

            errors,

            cleanedData
        };
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


            const validation =
                validateIngredientData(
                    loadedData
                );


            if (!validation.valid) {
                const errorMessage =
                    validation.errors.join(
                        '\n'
                    );


                console.error(
                    'Ingredient weight dataset failed validation:',
                    validation.errors
                );


                throw new Error(
                    errorMessage
                );
            }


            ingredientWeightData =
                validation.cleanedData;


            ingredientWeightsLoaded =
                true;

            ingredientWeightsLoading =
                false;


            console.info(
                `Loaded ${Object.keys(
                    ingredientWeightData
                ).length} validated ingredient weight records.`
            );


            populateIngredientList();

            setControlsEnabled(true);

            calculateIngredientWeight();

        } catch (error) {
            ingredientWeightsLoading =
                false;

            ingredientWeightsLoaded =
                false;

            ingredientWeightData = {};


            setControlsEnabled(false);

            renderLoadError(error);
        }
    }


    function populateIngredientList() {
        const select =
            getIngredientSelect();


        if (!select) {
            return;
        }


        const previousSelection =
            select.value;


        select.replaceChildren();


        const ingredients =
            Object.keys(
                ingredientWeightData
            ).sort(
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
            Object.hasOwn(
                ingredientWeightData,
                previousSelection
            )
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


        const unit =
            unitSelect.value;


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


        /*
         * This should never occur after successful
         * dataset validation, but leaving the guard
         * in place protects against runtime changes.
         */
        if (
            !ingredientData ||
            !Number.isFinite(
                ingredientData
                    .gramsPerCup
            ) ||
            ingredientData
                .gramsPerCup <= 0
        ) {
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


        const gramsPerCup =
            ingredientData
                .gramsPerCup;


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


    window.kitchenApp =
        window.kitchenApp || {};


    window.kitchenApp.ingredientWeights = {
        calculateIngredientWeight,
        convertVolumeToCups,
        loadIngredientWeights,
        validateIngredientData
    };


    initializeIngredientWeights();
})();
