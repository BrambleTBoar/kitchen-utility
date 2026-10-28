// js/converter.js

(() => {
    /*
     * Each non-temperature unit is represented by a
     * multiplier relative to its category's base unit.
     *
     * Volume base unit: milliliters
     * Weight base unit: grams
     */
    const conversions = {
        temperature: {
            celsius: {
                label: 'Celsius (°C)'
            },
            fahrenheit: {
                label: 'Fahrenheit (°F)'
            },
            kelvin: {
                label: 'Kelvin (K)'
            }
        },

        volume: {
            ml: {
                label: 'Milliliters (mL)',
                factor: 1
            },
            l: {
                label: 'Liters (L)',
                factor: 1000
            },
            tsp: {
                label: 'Teaspoons (tsp)',
                factor: 4.92892
            },
            tbsp: {
                label: 'Tablespoons (tbsp)',
                factor: 14.7868
            },
            floz: {
                label: 'Fluid Ounces (fl oz)',
                factor: 29.5735
            },
            cup: {
                label: 'Cups',
                factor: 236.588
            },
            pint: {
                label: 'Pints (US)',
                factor: 473.176
            },
            quart: {
                label: 'Quarts (US)',
                factor: 946.353
            },
            gallon: {
                label: 'Gallons (US)',
                factor: 3785.41
            }
        },

        weight: {
            g: {
                label: 'Grams (g)',
                factor: 1
            },
            kg: {
                label: 'Kilograms (kg)',
                factor: 1000
            },
            oz: {
                label: 'Ounces (oz)',
                factor: 28.3495
            },
            lb: {
                label: 'Pounds (lb)',
                factor: 453.592
            }
        }
    };


    let currentType =
        'temperature';


    /*
     * Temperature requires formulas rather than
     * simple multiplication factors.
     */
    function convertTemperature(
        value,
        from,
        to
    ) {
        if (!Number.isFinite(value)) {
            return Number.NaN;
        }

        if (
            !conversions.temperature[from] ||
            !conversions.temperature[to]
        ) {
            return Number.NaN;
        }

        if (from === to) {
            return value;
        }


        /*
         * Normalize to Celsius first.
         */
        let celsius;

        switch (from) {
            case 'celsius':
                celsius =
                    value;
                break;

            case 'fahrenheit':
                celsius =
                    (value - 32) *
                    (5 / 9);
                break;

            case 'kelvin':
                celsius =
                    value -
                    273.15;
                break;

            default:
                return Number.NaN;
        }


        /*
         * Convert Celsius into the requested unit.
         */
        switch (to) {
            case 'celsius':
                return celsius;

            case 'fahrenheit':
                return (
                    celsius *
                    (9 / 5)
                ) + 32;

            case 'kelvin':
                return (
                    celsius +
                    273.15
                );

            default:
                return Number.NaN;
        }
    }


    /*
     * Convert volume or weight through the
     * category's base unit.
     */
    function convertByFactor(
        value,
        from,
        to,
        category
    ) {
        if (!Number.isFinite(value)) {
            return Number.NaN;
        }


        const categoryData =
            conversions[category];


        if (!categoryData) {
            return Number.NaN;
        }


        const fromData =
            categoryData[from];

        const toData =
            categoryData[to];


        if (
            !fromData ||
            !toData ||
            !Number.isFinite(
                fromData.factor
            ) ||
            !Number.isFinite(
                toData.factor
            ) ||
            fromData.factor <= 0 ||
            toData.factor <= 0
        ) {
            return Number.NaN;
        }


        const baseValue =
            value *
            fromData.factor;


        return (
            baseValue /
            toData.factor
        );
    }


    /*
     * Public conversion function.
     */
    function convert(
        value,
        from,
        to,
        type = currentType
    ) {
        if (!Number.isFinite(value)) {
            return Number.NaN;
        }


        switch (type) {
            case 'temperature':
                return convertTemperature(
                    value,
                    from,
                    to
                );

            case 'volume':
            case 'weight':
                return convertByFactor(
                    value,
                    from,
                    to,
                    type
                );

            default:
                return Number.NaN;
        }
    }


    /*
     * Prevent physically impossible temperature
     * results below absolute zero.
     */
    function isValidTemperature(
        value,
        unit
    ) {
        if (!Number.isFinite(value)) {
            return false;
        }


        switch (unit) {
            case 'celsius':
                return (
                    value >=
                    -273.15
                );

            case 'fahrenheit':
                return (
                    value >=
                    -459.67
                );

            case 'kelvin':
                return (
                    value >= 0
                );

            default:
                return false;
        }
    }


    function formatNumber(value) {
        if (!Number.isFinite(value)) {
            return '';
        }


        /*
         * Very small non-zero values should not
         * misleadingly display as zero.
         */
        const absoluteValue =
            Math.abs(value);


        if (
            absoluteValue > 0 &&
            absoluteValue < 0.001
        ) {
            return value.toExponential(
                3
            );
        }


        if (
            Math.abs(
                value -
                Math.round(value)
            ) < 0.000001
        ) {
            return String(
                Math.round(value)
            );
        }


        return String(
            parseFloat(
                value.toFixed(4)
            )
        );
    }


    function getUnitLabel(
        type,
        unit
    ) {
        const category =
            conversions[type];


        if (
            !category ||
            !category[unit]
        ) {
            return unit;
        }


        return (
            category[unit].label ||
            unit
        );
    }


    /*
     * Populate From and To selects for the chosen
     * conversion category.
     */
    function populateSelects() {
        const fromSelect =
            document.getElementById(
                'converter-from'
            );

        const toSelect =
            document.getElementById(
                'converter-to'
            );


        if (
            !fromSelect ||
            !toSelect
        ) {
            return;
        }


        const category =
            conversions[currentType];


        if (!category) {
            return;
        }


        const previousFrom =
            fromSelect.value;

        const previousTo =
            toSelect.value;


        fromSelect.replaceChildren();
        toSelect.replaceChildren();


        Object.entries(
            category
        ).forEach(
            ([unit, unitData]) => {
                const fromOption =
                    document.createElement(
                        'option'
                    );

                fromOption.value =
                    unit;

                fromOption.textContent =
                    unitData.label;


                const toOption =
                    document.createElement(
                        'option'
                    );

                toOption.value =
                    unit;

                toOption.textContent =
                    unitData.label;


                fromSelect.appendChild(
                    fromOption
                );

                toSelect.appendChild(
                    toOption
                );
            }
        );


        const units =
            Object.keys(category);


        /*
         * Restore previous selections if they
         * belong to this category.
         */
        if (
            units.includes(
                previousFrom
            )
        ) {
            fromSelect.value =
                previousFrom;
        } else {
            fromSelect.value =
                units[0];
        }


        if (
            units.includes(
                previousTo
            )
        ) {
            toSelect.value =
                previousTo;
        } else {
            toSelect.value =
                units[1] ||
                units[0];
        }
    }


    function renderConverter() {
        const valueInput =
            document.getElementById(
                'converter-value'
            );

        const fromSelect =
            document.getElementById(
                'converter-from'
            );

        const toSelect =
            document.getElementById(
                'converter-to'
            );

        const results =
            document.getElementById(
                'converter-results'
            );


        if (
            !valueInput ||
            !fromSelect ||
            !toSelect ||
            !results
        ) {
            return;
        }


        const rawValue =
            valueInput.value.trim();


        if (rawValue === '') {
            results.innerHTML = `
                <p>
                    Enter a value to convert.
                </p>
            `;

            return;
        }


        const value =
            Number.parseFloat(
                rawValue
            );

        const from =
            fromSelect.value;

        const to =
            toSelect.value;


        if (!Number.isFinite(value)) {
            results.innerHTML = `
                <p>
                    Enter a valid number.
                </p>
            `;

            return;
        }


        if (
            currentType ===
                'temperature' &&
            !isValidTemperature(
                value,
                from
            )
        ) {
            results.innerHTML = `
                <p>
                    That temperature is below
                    absolute zero.
                </p>
            `;

            return;
        }


        const convertedValue =
            convert(
                value,
                from,
                to,
                currentType
            );


        if (
            !Number.isFinite(
                convertedValue
            )
        ) {
            results.innerHTML = `
                <p>
                    Unable to perform this conversion.
                </p>
            `;

            return;
        }


        const fromLabel =
            getUnitLabel(
                currentType,
                from
            );

        const toLabel =
            getUnitLabel(
                currentType,
                to
            );


        results.innerHTML = `
            <p>
                <strong>
                    ${formatNumber(value)}
                    ${fromLabel}
                </strong>
            </p>

            <p>
                =
            </p>

            <p>
                <strong>
                    ${formatNumber(
                        convertedValue
                    )}
                    ${toLabel}
                </strong>
            </p>
        `;
    }


    function setConverterType(type) {
        if (!conversions[type]) {
            console.warn(
                `Unknown converter type: ${type}`
            );

            return false;
        }


        currentType =
            type;


        document
            .querySelectorAll(
                '.converter-tab'
            )
            .forEach(tab => {
                const isActive =
                    tab.dataset.type ===
                    type;


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
            });


        populateSelects();
        renderConverter();


        return true;
    }


    function initializeConverter() {
        const valueInput =
            document.getElementById(
                'converter-value'
            );

        const fromSelect =
            document.getElementById(
                'converter-from'
            );

        const toSelect =
            document.getElementById(
                'converter-to'
            );

        const results =
            document.getElementById(
                'converter-results'
            );


        if (
            !valueInput ||
            !fromSelect ||
            !toSelect ||
            !results
        ) {
            console.error(
                'Unit Converter elements were not found.'
            );

            return;
        }


        document
            .querySelectorAll(
                '.converter-tab'
            )
            .forEach(tab => {
                tab.addEventListener(
                    'click',
                    () => {
                        const type =
                            tab.dataset.type;


                        if (type) {
                            setConverterType(
                                type
                            );
                        }
                    }
                );
            });


        valueInput.addEventListener(
            'input',
            renderConverter
        );


        fromSelect.addEventListener(
            'change',
            renderConverter
        );


        toSelect.addEventListener(
            'change',
            renderConverter
        );


        populateSelects();
        renderConverter();
    }


    /*
     * Expose only the intentional public converter
     * API. All conversion tables and helper
     * functions remain private.
     */
    window.kitchenApp =
        window.kitchenApp || {};


    window.kitchenApp.converter = {
        convert,
        renderConverter,
        setConverterType
    };


    /*
     * Preserve backward compatibility with the
     * original Kitchen Utility global.
     */
    window.unitConverter = {
        convert,
        renderConverter,
        setConverterType
    };


    initializeConverter();
})();
