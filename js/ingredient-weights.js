let ingredientWeightData = {};

async function loadIngredientWeights() {
    try {
        const response = await fetch('js/ingredient-weights.json');
        ingredientWeightData = await response.json();
        populateIngredientList();
        calculateIngredientWeight();
    } catch (error) {
        console.error('Failed to load ingredient weights:', error);
    }
}

function populateIngredientList() {
    const select = document.getElementById('weight-ingredient');
    select.innerHTML = '';

    Object.keys(ingredientWeightData).forEach(ingredient => {
        const option = document.createElement('option');
        option.value = ingredient;
        option.textContent = ingredient
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        select.appendChild(option);
    });
}

function calculateIngredientWeight() {
    const ingredient = document.getElementById('weight-ingredient').value;
    const amount = parseFloat(document.getElementById('weight-amount').value);

    const result = document.getElementById('weight-results');

    if (!ingredient || isNaN(amount) || amount <= 0) {
        result.innerHTML = '<p>Enter an amount to calculate the approximate weight.</p>';
        return;
    }

    const data = ingredientWeightData[ingredient];

    if (!data) {
        result.innerHTML = '<p>No weight data available for this ingredient.</p>';
        return;
    }

    const grams = amount * data.gramsPerCup;
    const ounces = grams / 28.3495;

    result.innerHTML = `
        <p><strong>${amount} cup${amount === 1 ? '' : 's'} ${ingredient}</strong></p>
        <p>${grams.toFixed(1)} grams</p>
        <p>${ounces.toFixed(2)} ounces</p>
        <p style="color: var(--text-muted); font-size: 0.85rem;">
            Based on approximately ${data.gramsPerCup} g per cup.
        </p>
    `;
}

document.getElementById('weight-ingredient').addEventListener('change', calculateIngredientWeight);
document.getElementById('weight-amount').addEventListener('input', calculateIngredientWeight);

window.kitchenApp = window.kitchenApp || {};
window.kitchenApp.ingredientWeights = {
    calculateIngredientWeight
};

loadIngredientWeights();
