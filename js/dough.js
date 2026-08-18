// js/dough.js

function calculateDough(flour, hydration, salt, starter) {
    hydration = hydration || 0;
    salt = salt || 0;
    starter = starter || 0;

    const waterFromHydration = flour * (hydration / 100);
    const saltGrams = flour * (salt / 100);

    let starterFlour = 0;
    let starterWater = 0;

    if (starter > 0) {
        // Assume 100% hydration starter (50% flour, 50% water by weight)
        const starterTotal = flour * (starter / 100);
        starterFlour = starterTotal * 0.5;
        starterWater = starterTotal * 0.5;
    }

    const water = waterFromHydration - starterWater;
    const totalFlour = flour - starterFlour;
    const totalStarter = starterTotal || 0;

    return {
        flour: Math.round(totalFlour),
        water: Math.round(water * 10) / 10,
        salt: Math.round(saltGrams * 10) / 10,
        starter: Math.round(totalStarter * 10) / 10,
        total: Math.round((totalFlour + water + saltGrams + totalStarter) * 10) / 10
    };
}

function renderDoughResults() {
    const flour = parseFloat(document.getElementById('flour').value) || 0;
    const hydration = parseFloat(document.getElementById('hydration').value) || 0;
    const salt = parseFloat(document.getElementById('salt').value) || 0;
    const starter = parseFloat(document.getElementById('starter').value) || 0;

    const result = calculateDough(flour, hydration, salt, starter);
    const container = document.getElementById('dough-results');

    let html = `<p><strong>Flour:</strong> ${result.flour}g</p>`;
    html += `<p><strong>Water:</strong> ${result.water}g</p>`;
    html += `<p><strong>Salt:</strong> ${result.salt}g</p>`;
    if (result.starter > 0) {
        html += `<p><strong>Starter:</strong> ${result.starter}g (100% hydration)</p>`;
    }
    html += `<p><strong>Total dough:</strong> ${result.total}g</p>`;
    container.innerHTML = html;
}

const flourInput = document.getElementById('flour');
const hydrationInput = document.getElementById('hydration');
const saltInput = document.getElementById('salt');
const starterInput = document.getElementById('starter');

flourInput.addEventListener('input', renderDoughResults);
hydrationInput.addEventListener('input', renderDoughResults);
saltInput.addEventListener('input', renderDoughResults);
starterInput.addEventListener('input', renderDoughResults);

// Initial calculation
renderDoughResults();

// Expose for testing
window.doughCalc = { calculateDough, renderDoughResults };
