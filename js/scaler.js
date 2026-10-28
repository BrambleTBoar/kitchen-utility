// js/scaler.js

(() => {
    let ingredientCount = 0;


    /*
     * Safely escape user-entered ingredient names
     * before inserting them into generated HTML.
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
     * Format scaled amounts without unnecessary
     * trailing zeroes.
     *
     * Examples:
     * 2.00  -> 2
     * 1.50  -> 1.5
     * 1.333 -> 1.33
     */
    function formatScaledAmount(amount) {
        if (!Number.isFinite(amount)) {
            return '0';
        }

        if (
            Math.abs(
                amount -
                Math.round(amount)
            ) < 0.005
        ) {
            return String(
                Math.round(amount)
            );
        }

        return String(
            parseFloat(
                amount.toFixed(2)
            )
        );
    }


    /*
     * Build one touchscreen-friendly ingredient
     * input card.
     */
    function createIngredientRow() {
        ingredientCount++;

        const row =
            document.createElement('div');

        row.className =
            'recipe-input-row';

        row.dataset.index =
            String(ingredientCount);


        /*
         * Ingredient name field.
         */
        const nameGroup =
            document.createElement('div');

        nameGroup.className =
            'recipe-field';


        const nameLabel =
            document.createElement('label');

        nameLabel.textContent =
            'Ingredient';


        const nameInput =
            document.createElement('input');

        nameInput.type =
            'text';

        nameInput.placeholder =
            'Flour, sugar, milk...';

        nameInput.className =
            'ingredient-name';

        nameInput.autocomplete =
            'off';


        nameGroup.appendChild(
            nameLabel
        );

        nameGroup.appendChild(
            nameInput
        );


        /*
         * Ingredient amount field.
         */
        const amountGroup =
            document.createElement('div');

        amountGroup.className =
            'recipe-field';


        const amountLabel =
            document.createElement('label');

        amountLabel.textContent =
            'Amount';


        const amountInput =
            document.createElement('input');

        amountInput.type =
            'number';

        amountInput.placeholder =
            'Amount';

        amountInput.className =
            'ingredient-amount';

        amountInput.min =
            '0';

        amountInput.step =
            '0.1';

        amountInput.inputMode =
            'decimal';


        amountGroup.appendChild(
            amountLabel
        );

        amountGroup.appendChild(
            amountInput
        );


        /*
         * Ingredient unit field.
         */
        const unitGroup =
            document.createElement('div');

        unitGroup.className =
            'recipe-field';


        const unitLabel =
            document.createElement('label');

        unitLabel.textContent =
            'Unit';


        const unitSelect =
            document.createElement('select');

        unitSelect.className =
            'ingredient-unit';

        unitSelect.innerHTML = `
            <option value="g">grams</option>
            <option value="kg">kilograms</option>

            <option value="oz">ounces</option>
            <option value="lb">pounds</option>

            <option value="ml">milliliters</option>
            <option value="l">liters</option>

            <option value="cup">cups</option>
            <option value="tbsp">tablespoons</option>
            <option value="tsp">teaspoons</option>

            <option value="piece">pieces</option>
        `;


        unitGroup.appendChild(
            unitLabel
        );

        unitGroup.appendChild(
            unitSelect
        );


        /*
         * Remove button.
         */
        const removeButton =
            document.createElement('button');

        removeButton.type =
            'button';

        removeButton.className =
            'btn recipe-remove';

        removeButton.textContent =
            'Remove';


        /*
         * Input changes update the results
         * immediately.
         */
        nameInput.addEventListener(
            'input',
            scaleRecipe
        );

        amountInput.addEventListener(
            'input',
            scaleRecipe
        );

        unitSelect.addEventListener(
            'change',
            scaleRecipe
        );

        removeButton.addEventListener(
            'click',
            () => {
                row.remove();
                scaleRecipe();
            }
        );


        row.appendChild(
            nameGroup
        );

        row.appendChild(
            amountGroup
        );

        row.appendChild(
            unitGroup
        );

        row.appendChild(
            removeButton
        );


        return {
            row,
            nameInput
        };
    }


    /*
     * Add one ingredient card to the page.
     */
    function addIngredientRow(options = {}) {
        const container =
            document.getElementById(
                'ingredient-list'
            );

        if (!container) {
            console.error(
                'Unable to find #ingredient-list.'
            );

            return null;
        }


        const {
            focus = true
        } = options;


        const {
            row,
            nameInput
        } = createIngredientRow();


        container.appendChild(
            row
        );


        scaleRecipe();


        /*
         * Focus only when the row was created by
         * a deliberate user action. The initial
         * row should not unexpectedly steal focus
         * when the page loads.
         */
        if (focus) {
            nameInput.focus();
        }


        return row;
    }


    /*
     * Read one ingredient row.
     */
    function getIngredientFromRow(row) {
        const nameInput =
            row.querySelector(
                '.ingredient-name'
            );

        const amountInput =
            row.querySelector(
                '.ingredient-amount'
            );

        const unitSelect =
            row.querySelector(
                '.ingredient-unit'
            );


        if (
            !nameInput ||
            !amountInput ||
            !unitSelect
        ) {
            return null;
        }


        const name =
            nameInput.value.trim();

        const rawAmount =
            amountInput.value.trim();

        const amount =
            rawAmount === ''
                ? Number.NaN
                : Number.parseFloat(
                    rawAmount
                );

        const unit =
            unitSelect.value;


        return {
            name,
            amount,
            unit,
            hasName:
                name.length > 0,
            hasAmount:
                Number.isFinite(amount)
        };
    }


    /*
     * Calculate all scaled ingredients.
     */
    function scaleRecipe() {
        const currentInput =
            document.getElementById(
                'servings-current'
            );

        const targetInput =
            document.getElementById(
                'servings-target'
            );

        const results =
            document.getElementById(
                'scaled-results'
            );


        if (
            !currentInput ||
            !targetInput ||
            !results
        ) {
            return;
        }


        const currentServings =
            Number.parseFloat(
                currentInput.value
            );

        const targetServings =
            Number.parseFloat(
                targetInput.value
            );


        if (
            !Number.isFinite(
                currentServings
            ) ||
            currentServings <= 0 ||
            !Number.isFinite(
                targetServings
            ) ||
            targetServings <= 0
        ) {
            results.innerHTML = `
                <p>
                    Enter valid original and target
                    serving amounts greater than zero.
                </p>
            `;

            return;
        }


        const ratio =
            targetServings /
            currentServings;


        const rows =
            document.querySelectorAll(
                '#ingredient-list .recipe-input-row'
            );


        if (rows.length === 0) {
            results.innerHTML = `
                <p>
                    Add ingredients to scale the recipe.
                </p>
            `;

            return;
        }


        let ingredientHtml = '';
        let completeIngredientCount = 0;
        let incompleteIngredientCount = 0;


        rows.forEach(row => {
            const ingredient =
                getIngredientFromRow(row);


            if (!ingredient) {
                return;
            }


            /*
             * Completely empty rows are ignored.
             */
            if (
                !ingredient.hasName &&
                !ingredient.hasAmount
            ) {
                return;
            }


            /*
             * A partly completed row should not
             * silently become zero or "Unnamed."
             */
            if (
                !ingredient.hasName ||
                !ingredient.hasAmount ||
                ingredient.amount < 0
            ) {
                incompleteIngredientCount++;
                return;
            }


            const scaledAmount =
                ingredient.amount *
                ratio;


            ingredientHtml += `
                <div class="scaled-ingredient">
                    <strong>
                        ${escapeHtml(
                            ingredient.name
                        )}
                    </strong>

                    <span>
                        ${formatScaledAmount(
                            scaledAmount
                        )}
                        ${escapeHtml(
                            ingredient.unit
                        )}
                    </span>
                </div>
            `;


            completeIngredientCount++;
        });


        let html = `
            <div class="scale-summary">
                <strong>
                    ${formatScaledAmount(
                        currentServings
                    )}
                    servings
                    →
                    ${formatScaledAmount(
                        targetServings
                    )}
                    servings
                </strong>

                <span>
                    Scale factor:
                    ${ratio.toFixed(2)}×
                </span>
            </div>
        `;


        if (completeIngredientCount > 0) {
            html +=
                ingredientHtml;
        } else {
            html += `
                <p>
                    Enter an ingredient name
                    and amount above.
                </p>
            `;
        }


        if (incompleteIngredientCount > 0) {
            html += `
                <p class="scaler-warning">
                    ${incompleteIngredientCount}
                    incomplete ingredient
                    ${incompleteIngredientCount === 1
                        ? 'row was'
                        : 'rows were'}
                    not included.
                </p>
            `;
        }


        results.innerHTML =
            html;
    }


    /*
     * Remove every ingredient row and create one
     * fresh row. This is exposed for future use,
     * such as a Clear Recipe button.
     */
    function clearIngredients() {
        const container =
            document.getElementById(
                'ingredient-list'
            );

        if (!container) {
            return;
        }


        container.replaceChildren();

        addIngredientRow({
            focus: false
        });
    }


    /*
     * Initialize scaler controls.
     */
    function initializeRecipeScaler() {
        const addButton =
            document.getElementById(
                'add-ingredient'
            );

        const currentInput =
            document.getElementById(
                'servings-current'
            );

        const targetInput =
            document.getElementById(
                'servings-target'
            );

        const ingredientList =
            document.getElementById(
                'ingredient-list'
            );

        const results =
            document.getElementById(
                'scaled-results'
            );


        if (
            !addButton ||
            !currentInput ||
            !targetInput ||
            !ingredientList ||
            !results
        ) {
            console.error(
                'Recipe Scaler elements were not found.'
            );

            return;
        }


        addButton.addEventListener(
            'click',
            () => {
                addIngredientRow({
                    focus: true
                });
            }
        );


        currentInput.addEventListener(
            'input',
            scaleRecipe
        );

        targetInput.addEventListener(
            'input',
            scaleRecipe
        );


        /*
         * Prevent duplicate default rows if this
         * script is ever initialized more than once.
         */
        if (
            ingredientList.children.length === 0
        ) {
            addIngredientRow({
                focus: false
            });
        } else {
            scaleRecipe();
        }
    }


    /*
     * Expose only the intentional public API.
     *
     * Helpers such as escapeHtml,
     * createIngredientRow, and
     * getIngredientFromRow remain private.
     */
    window.kitchenApp =
        window.kitchenApp || {};


    window.kitchenApp.recipeScaler = {
        addIngredientRow,
        scaleRecipe,
        clearIngredients,
        formatScaledAmount
    };


    /*
     * Preserve backward compatibility with the
     * original Kitchen Utility global API.
     */
    window.recipeScaler = {
        addIngredientRow,
        scaleRecipe
    };


    initializeRecipeScaler();
})();
