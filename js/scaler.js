// js/scaler.js

let ingredientCount = 0;

function addIngredientRow() {
    const container = document.getElementById('recipe-inputs');
    const row = document.createElement('div');
    row.className = 'recipe-input-row';
    row.dataset.index = ingredientCount++;

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Ingredient name';
    nameInput.className = 'ingredient-name';

    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.placeholder = 'Amount';
    amountInput.className = 'ingredient-amount';
    amountInput.step = '0.1';

    const unitSelect = document.createElement('select');
    unitSelect.className = 'ingredient-unit';
    unitSelect.innerHTML = `
        <option value="g">g</option>
        <option value="ml">ml</option>
        <option value="cup">cup(s)</option>
        <option value="tbsp">tbsp</option>
        <option value="tsp">tsp</option>
        <option value="piece">piece(s)</option>
    `;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn';
    removeBtn.textContent = '×';
    removeBtn.style.padding = '0.5rem';
    removeBtn.addEventListener('click', () => {
        row.remove();
        scaleRecipe();
    });

    row.appendChild(nameInput);
    row.appendChild(amountInput);
    row.appendChild(unitSelect);
    row.appendChild(removeBtn);
    container.appendChild(row);

    amountInput.addEventListener('input', scaleRecipe);
    nameInput.addEventListener('input', scaleRecipe);
}

function scaleRecipe() {
    const currentServings = parseFloat(document.getElementById('servings-current').value) || 1;
    const targetServings = parseFloat(document.getElementById('servings-target').value) || 1;
    const ratio = targetServings / currentServings;

    const rows = document.querySelectorAll('.recipe-input-row');
    const results = document.getElementById('scaled-results');

    let html = '';
    rows.forEach(row => {
        const name = row.querySelector('.ingredient-name').value || 'Unnamed';
        const amount = parseFloat(row.querySelector('.ingredient-amount').value) || 0;
        const unit = row.querySelector('.ingredient-unit').value;
        const scaledAmount = (amount * ratio).toFixed(2);

        html += `<p><strong>${name}:</strong> ${scaledAmount} ${unit}</p>`;
    });

    results.innerHTML = html || '<p>Add ingredients above to see scaled values.</p>';
}

document.getElementById('add-ingredient').addEventListener('click', addIngredientRow);
document.getElementById('servings-current').addEventListener('input', scaleRecipe);
document.getElementById('servings-target').addEventListener('input', scaleRecipe);

// Add one default row
addIngredientRow();

// Expose for testing
window.recipeScaler = { addIngredientRow, scaleRecipe };
