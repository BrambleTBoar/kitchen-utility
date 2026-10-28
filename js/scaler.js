// js/scaler.js

(() => {
    let ingredientCount = 0;
    let activeAmountInput = null;


    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }


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
            Number.parseFloat(
                amount.toFixed(2)
            )
        );
    }


    function setActiveAmountInput(
        input
    ) {
        document
            .querySelectorAll(
                '.ingredient-row.active-amount-row'
            )
            .forEach(row => {
                row.classList.remove(
                    'active-amount-row'
                );
            });


        activeAmountInput =
            input || null;


        const targetLabel =
            document.getElementById(
                'fraction-target-label'
            );


        if (!activeAmountInput) {
            if (targetLabel) {
                targetLabel.textContent =
                    'Tap an Amount field first';
            }

            return;
        }


        const row =
            activeAmountInput.closest(
                '.ingredient-row'
            );


        if (row) {
            row.classList.add(
                'active-amount-row'
            );
        }


        const nameInput =
            row
                ? row.querySelector(
                    '.ingredient-name'
                )
                : null;


        const ingredientName =
            nameInput &&
            nameInput.value.trim()
                ? nameInput.value.trim()
                : `Ingredient ${row?.dataset.index || ''}`;


        if (targetLabel) {
            targetLabel.textContent =
                `Applying fraction to ${ingredientName}`;
        }
    }


    function applyFractionToActiveInput(
        fractionValue
    ) {
        if (
            !activeAmountInput ||
            !Number.isFinite(
                fractionValue
            ) ||
            fractionValue <= 0 ||
            fractionValue >= 1
        ) {
            return;
        }


        const currentAmount =
            Number.parseFloat(
                activeAmountInput.value
            );


        const wholeNumber =
            Number.isFinite(
                currentAmount
            ) &&
            currentAmount >= 0
                ? Math.floor(
                    currentAmount
                )
                : 0;


        const newAmount =
            wholeNumber +
            fractionValue;


        activeAmountInput.value =
            Number.parseFloat(
                newAmount.toFixed(4)
            ).toString();


        activeAmountInput.dispatchEvent(
            new Event(
                'input',
                {
                    bubbles: true
                }
            )
        );


        activeAmountInput.focus();
    }


    function createUnitSelect() {
        const unitSelect =
            document.createElement(
                'select'
            );


        unitSelect.className =
            'ingredient-unit';


        unitSelect.setAttribute(
            'aria-label',
            'Ingredient unit'
        );


        unitSelect.innerHTML = `
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="oz">oz</option>
            <option value="lb">lb</option>
            <option value="ml">mL</option>
            <option value="l">L</option>
            <option value="cup">cups</option>
            <option value="tbsp">tbsp</option>
            <option value="tsp">tsp</option>
            <option value="piece">pieces</option>
        `;


        return unitSelect;
    }


    function createIngredientRow() {
        ingredientCount++;


        const row =
            document.createElement(
                'div'
            );


        row.className =
            'ingredient-row';


        row.dataset.index =
            String(
                ingredientCount
            );


        const nameInput =
            document.createElement(
                'input'
            );


        nameInput.type =
            'text';


        nameInput.className =
            'ingredient-name';


        nameInput.placeholder =
            'Ingredient';


        nameInput.autocomplete =
            'off';


        nameInput.setAttribute(
            'aria-label',
            `Ingredient ${ingredientCount} name`
        );


        const amountInput =
            document.createElement(
                'input'
            );


        amountInput.type =
            'number';


        amountInput.className =
            'ingredient-amount';


        amountInput.placeholder =
            '0';


        amountInput.min =
            '0';


        amountInput.step =
            'any';


        amountInput.inputMode =
            'decimal';


        amountInput.setAttribute(
            'aria-label',
            `Ingredient ${ingredientCount} amount`
        );


        const unitSelect =
            createUnitSelect();


        const removeButton =
            document.createElement(
                'button'
            );


        removeButton.type =
            'button';


        removeButton.className =
            'ingredient-remove';


        removeButton.textContent =
            '×';


        removeButton.title =
            'Remove ingredient';


        removeButton.setAttribute(
            'aria-label',
            `Remove ingredient ${ingredientCount}`
        );


        nameInput.addEventListener(
            'input',
            () => {
                scaleRecipe();

                if (
                    activeAmountInput ===
                    amountInput
                ) {
                    setActiveAmountInput(
                        amountInput
                    );
                }
            }
        );


        amountInput.addEventListener(
            'focus',
            () => {
                setActiveAmountInput(
                    amountInput
                );
            }
        );


        amountInput.addEventListener(
            'pointerdown',
            () => {
                setActiveAmountInput(
                    amountInput
                );
            }
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
                if (
                    activeAmountInput ===
                    amountInput
                ) {
                    activeAmountInput =
                        null;
                }


                row.remove();


                const firstRemainingAmount =
                    document.querySelector(
                        '.ingredient-amount'
                    );


                setActiveAmountInput(
                    firstRemainingAmount
                );


                scaleRecipe();
            }
        );


        row.appendChild(
            nameInput
        );


        row.appendChild(
            amountInput
        );


        row.appendChild(
            unitSelect
        );


        row.appendChild(
            removeButton
        );


        return {
            row,
            nameInput,
            amountInput
        };
    }


    function addIngredientRow(
        options = {}
    ) {
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
            focusName = true
        } = options;


        const {
            row,
            nameInput,
            amountInput
        } = createIngredientRow();


        container.appendChild(
            row
        );


        setActiveAmountInput(
            amountInput
        );


        scaleRecipe();


        if (focusName) {
            nameInput.focus();
        }


        return row;
    }


    function getIngredientFromRow(
        row
    ) {
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


        return {
            name,
            amount,
            unit:
                unitSelect.value,

            hasName:
                name.length > 0,

            hasAmount:
                Number.isFinite(
                    amount
                )
        };
    }


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
                    Enter valid serving amounts
                    greater than zero.
                </p>
            `;

            return;
        }


        const ratio =
            targetServings /
            currentServings;


        const rows =
            document.querySelectorAll(
                '#ingredient-list .ingredient-row'
            );


        let ingredientHtml = '';
        let completeCount = 0;
        let incompleteCount = 0;


        rows.forEach(row => {
            const ingredient =
                getIngredientFromRow(
                    row
                );


            if (!ingredient) {
                return;
            }


            if (
                !ingredient.hasName &&
                !ingredient.hasAmount
            ) {
                return;
            }


            if (
                !ingredient.hasName ||
                !ingredient.hasAmount ||
                ingredient.amount < 0
            ) {
                incompleteCount++;
                return;
            }


            const scaledAmount =
                ingredient.amount *
                ratio;


            ingredientHtml += `
                <div class="scaled-ingredient">
                    <span>
                        ${escapeHtml(
                            ingredient.name
                        )}
                    </span>

                    <strong>
                        ${formatScaledAmount(
                            scaledAmount
                        )}
                        ${escapeHtml(
                            ingredient.unit
                        )}
                    </strong>
                </div>
            `;


            completeCount++;
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
                    ${ratio.toFixed(2)}×
                </span>
            </div>
        `;


        if (completeCount > 0) {
            html += `
                <div class="scaled-ingredient-list">
                    ${ingredientHtml}
                </div>
            `;
        } else {
            html += `
                <p>
                    Enter ingredient names
                    and amounts above.
                </p>
            `;
        }


        if (incompleteCount > 0) {
            html += `
                <p class="scaler-warning">
                    ${incompleteCount}
                    incomplete ingredient
                    ${
                        incompleteCount === 1
                            ? 'row was'
                            : 'rows were'
                    }
                    not included.
                </p>
            `;
        }


        results.innerHTML =
            html;
    }


    function clearIngredients() {
        const container =
            document.getElementById(
                'ingredient-list'
            );


        if (!container) {
            return;
        }


        container.replaceChildren();


        activeAmountInput =
            null;


        addIngredientRow({
            focusName: false
        });
    }


    function handleFractionClick(
        event
    ) {
        const button =
            event.target.closest(
                '[data-fraction]'
            );


        if (!button) {
            return;
        }


        const fractionValue =
            Number.parseFloat(
                button.dataset.fraction
            );


        applyFractionToActiveInput(
            fractionValue
        );
    }


    function initializeRecipeScaler() {
        const addButton =
            document.getElementById(
                'add-ingredient'
            );


        const clearButton =
            document.getElementById(
                'clear-ingredients'
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


        const fractionButtons =
            document.getElementById(
                'fraction-buttons'
            );


        const results =
            document.getElementById(
                'scaled-results'
            );


        if (
            !addButton ||
            !clearButton ||
            !currentInput ||
            !targetInput ||
            !ingredientList ||
            !fractionButtons ||
            !results
        ) {
            console.error(
                'Compact Recipe Scaler elements were not found.'
            );

            return;
        }


        addButton.addEventListener(
            'click',
            () => {
                addIngredientRow({
                    focusName: true
                });
            }
        );


        clearButton.addEventListener(
            'click',
            clearIngredients
        );


        currentInput.addEventListener(
            'input',
            scaleRecipe
        );


        targetInput.addEventListener(
            'input',
            scaleRecipe
        );


        fractionButtons.addEventListener(
            'click',
            handleFractionClick
        );


        if (
            ingredientList
                .children
                .length === 0
        ) {
            addIngredientRow({
                focusName: false
            });
        } else {
            const firstAmountInput =
                ingredientList.querySelector(
                    '.ingredient-amount'
                );


            setActiveAmountInput(
                firstAmountInput
            );


            scaleRecipe();
        }
    }


    window.kitchenApp =
        window.kitchenApp || {};


    window.kitchenApp.recipeScaler = {
        addIngredientRow,
        scaleRecipe,
        clearIngredients,
        setActiveAmountInput,
        applyFractionToActiveInput
    };


    window.recipeScaler = {
        addIngredientRow,
        scaleRecipe
    };


    initializeRecipeScaler();
})();
