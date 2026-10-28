// js/ingredient-weights.js

let ingredientWeightData = {};

/*
 * Cooking volume relationships:
 *
 * 1 cup = 16 tablespoons
 * 1 cup = 48 teaspoons
 *
 * Ingredient mass is calculated from the reference
 * grams-per-cup value in ingredient-weights.json.
 */

const volumeToCups = {
    cup: 1,
    tbsp: 1 / 16,
    tsp: 1 / 48
};


async function loadIngredientWeights() {
    try {
        const response = await fetch('js/ingredient-weights.json');

        if (!response.ok) {
            throw new Error(
                `Unable to load ingredient weights: HTTP ${response.status}`
            );
        }

        ingredientWeightData = await response.json();

        populateIngredientList();
        calculateIngredientWeight();

    } catch (error) {
        console.error('Failed to load ingredient weights:', error);

        const result = document.getElementById('weight-results');

        if (result) {
            result.innerHTML = `
                <p>
                    Unable to load ingredient weight data.
                </p>
            `;
        }
    }
}


function formatIngredientName(name) {
    return name
        .split(' ')
        .map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join(' ');
}


function populateIngredientList() {
    const select = document.getElementById('weight-ingredient');

    if (!select) {
        return;
    }

    select.innerHTML = '';

    const ingredients = Object.keys(ingredientWeightData)
        .sort((a, b) => a.localeCompare(b));

    ingredients.forEach(ingredient => {
        const option = document.createElement('option');

        option.value = ingredient;
        option.textContent = formatIngredientName(ingredient);

        select.appendChild(option);
    });
}


function convertVolumeToCups(amount, unit) {
    const conversionFactor = volumeToCups[unit];

    if (conversionFactor === undefined) {
        return null;
    }

    return amount * conversionFactor;
}


function getUnitLabel(unit, amount) {
    switch (unit) {
        case 'cup':
            return amount === 1 ? 'cup' : 'cups';

        case 'tbsp':
            return amount === 1
                ? 'tablespoon'
                : 'tablespoons';

        case 'tsp':
            return amount === 1
                ? 'teaspoon'
                : 'teaspoons';

        default:
            return unit;
    }
}


function calculateIngredientWeight() {
    const ingredientSelect =
        document.getElementById('weight-ingredient');

    const amountInput =
        document.getElementById('weight-amount');

    const unitSelect =
        document.getElementById('weight-unit');

    const result =
        document.getElementById('weight-results');


    if (
        !ingredientSelect ||
        !amountInput ||
        !unitSelect ||
        !result
    ) {
        return;
    }


    const ingredient = ingredientSelect.value;
    const amount = parseFloat(amountInput.value);
    const unit = unitSelect.value;


    if (
        !ingredient ||
        Number.isNaN(amount) ||
        amount <= 0
    ) {
        result.innerHTML = `
            <p>
                Enter an amount to calculate the approximate weight.
            </p>
        `;

        return;
    }


    const ingredientData =
        ingredientWeightData[ingredient];


    if (!ingredientData) {
        result.innerHTML = `
            <p>
                No weight data is available for this ingredient.
            </p>
        `;

        return;
    }


    const cups =
        convertVolumeToCups(amount, unit);


    if (cups === null) {
        result.innerHTML = `
            <p>
                Unsupported volume unit.
            </p>
        `;

        return;
    }


    const grams =
        cups * ingredientData.gramsPerCup;

    const ounces =
        grams / 28.3495;


    const unitLabel =
        getUnitLabel(unit, amount);

    const ingredientLabel =
        formatIngredientName(ingredient);


    result.innerHTML = `
        <p>
            <strong>
                ${amount} ${unitLabel} ${ingredientLabel}
            </strong>
        </p>

        <p>
            <strong>${grams.toFixed(1)} grams</strong>
        </p>

        <p>
            ${ounces.toFixed(2)} ounces
        </p>

        <p
            style="
                color: var(--text-muted);
                font-size: 0.85rem;
            "
        >
            Based on approximately
            ${ingredientData.gramsPerCup} g per cup.
        </p>
    `;
}


const ingredientSelect =
    document.getElementById('weight-ingredient');

const amountInput =
    document.getElementById('weight-amount');

const unitSelect =
    document.getElementById('weight-unit');


if (ingredientSelect) {
    ingredientSelect.addEventListener(
        'change',
        calculateIngredientWeight
    );
}


if (amountInput) {
    amountInput.addEventListener(
        'input',
        calculateIngredientWeight
    );
}


if (unitSelect) {
    unitSelect.addEventListener(
        'change',
        calculateIngredientWeight
    );
}


// Preserve modules already registered by app.js/timer.js.
window.kitchenApp = window.kitchenApp || {};

window.kitchenApp.ingredientWeights = {
    calculateIngredientWeight,
    convertVolumeToCups
};


loadIngredientWeights();
