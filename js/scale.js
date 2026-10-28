// js/scaler.js

let ingredientCount = 0;

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function addIngredientRow() {
    const container = document.getElementById('ingredient-list');

    if (!container) {
        console.error('Recipe scaler ingredient-list container was not found.');
        return;
    }

    const row = document.createElement('div');

    row.className = 'recipe-input-row';
    row.dataset.index = ingredientCount++;

    const nameInput = document.createElement('input');

    nameInput.type = 'text';
    nameInput.placeholder = 'Ingredient name';
    nameInput.className = 'ingredient-name';
    nameInput.autocomplete = 'off';

    const amountInput = document.createElement('input');

    amountInput.type = 'number';
    amountInput.placeholder = 'Amount';
    amountInput.className = 'ingredient-amount';
    amountInput.min = '0';
    amountInput.step = '0.1';
    amountInput.inputMode = 'decimal';

    const unitSelect = document.createElement('select');

    unitSelect.className = 'ingredient-unit';

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

    const removeButton = document.createElement('button');

    removeButton.type = 'button';
    removeButton.className = 'btn recipe-remove';
    removeButton.textContent = 'Remove';

    removeButton.addEventListener('click', () => {
        row.remove();
        scaleRecipe();
    });

    nameInput.addEventListener('input', scaleRecipe);
    amountInput.addEventListener('input', scaleRecipe);
    unitSelect.addEventListener('change', scaleRecipe);

    row.appendChild(nameInput);
    row.appendChild(amountInput);
    row.appendChild(unitSelect);
    row.appendChild(removeButton);

    container.appendChild(row);

    scaleRecipe();

    /*
     * Handy for touchscreen use:
     * immediately focus the ingredient name.
     */
    nameInput.focus();
}

function scaleRecipe() {
    const currentServingsInput =
        document.getElementById('servings-current');

    const targetServingsInput =
        document.getElementById('servings-target');

    const results =
        document.getElementById('scaled-results');

    if (
        !currentServingsInput ||
        !targetServingsInput ||
        !results
    ) {
        return;
    }

    const currentServings =
        parseFloat(currentServingsInput.value);

    const targetServings =
        parseFloat(targetServingsInput.value);

    if (
        !Number.isFinite(currentServings) ||
        currentServings <= 0 ||
        !Number.isFinite(targetServings) ||
        targetServings <= 0
    ) {
        results.innerHTML = `
            <p>
                Enter valid original and target serving amounts.
            </p>
        `;

        return;
    }

    const ratio =
        targetServings / currentServings;

    const rows =
        document.querySelectorAll('.recipe-input-row');

    if (rows.length === 0) {
        results.innerHTML = `
            <p>
                Add ingredients above to see scaled values.
            </p>
        `;

        return;
    }

    let html = `
        <p>
            <strong>
                Scaling ${currentServings} servings
                to ${targetServings} servings
            </strong>
        </p>

        <p>
            Scale factor: ${ratio.toFixed(2)}×
        </p>
    `;

    let ingredientResults = '';

    rows.forEach(row => {
        const nameInput =
            row.querySelector('.ingredient-name');

        const amountInput =
            row.querySelector('.ingredient-amount');

        const unitSelect =
            row.querySelector('.ingredient-unit');

        if (
            !nameInput ||
            !amountInput ||
            !unitSelect
        ) {
            return;
        }

        const name =
            nameInput.value.trim();

        const amount =
            parseFloat(amountInput.value);

        const unit =
            unitSelect.value;

        if (
            !name &&
            !Number.isFinite(amount)
        ) {
            return;
        }

        const displayName =
            escapeHtml(name || 'Unnamed ingredient');

        const originalAmount =
            Number.isFinite(amount) ? amount : 0;

        const scaledAmount =
            originalAmount * ratio;

        ingredientResults += `
            <p>
                <strong>${displayName}:</strong>
                ${formatScaledAmount(scaledAmount)}
                ${escapeHtml(unit)}
            </p>
        `;
    });

    if (!ingredientResults) {
        ingredientResults = `
            <p>
                Enter an ingredient name and amount.
            </p>
        `;
    }

    results.innerHTML =
        html + ingredientResults;
}

function formatScaledAmount(amount) {
    if (!Number.isFinite(amount)) {
        return '0';
    }

    /*
     * Keep useful precision without ugly values
     * such as 2.00 or 1.333333333.
     */
    if (Number.isInteger(amount)) {
        return amount.toString();
    }

    return parseFloat(
        amount.toFixed(2)
    ).toString();
}

const addIngredientButton =
    document.getElementById('add-ingredient');

if (addIngredientButton) {
    addIngredientButton.addEventListener(
        'click',
        addIngredientRow
    );
}

const currentServingsInput =
    document.getElementById('servings-current');

if (currentServingsInput) {
    currentServingsInput.addEventListener(
        'input',
        scaleRecipe
    );
}

const targetServingsInput =
    document.getElementById('servings-target');

if (targetServingsInput) {
    targetServingsInput.addEventListener(
        'input',
        scaleRecipe
    );
}

/*
 * Start with one ingredient row.
 */
addIngredientRow();

/*
 * Preserve the application's module namespace.
 */
window.kitchenApp =
    window.kitchenApp || {};

window.kitchenApp.recipeScaler = {
    addIngredientRow,
    scaleRecipe,
    formatScaledAmount
};

/*
 * Keep backward compatibility with the original
 * Kitchen Utility global.
 */
window.recipeScaler = {
    addIngredientRow,
    scaleRecipe
};
