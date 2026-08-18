// js/substitutions.js

let substitutionData = {};

async function loadSubstitutions() {
    try {
        const response = await fetch('js/substitutions.json');
        substitutionData = await response.json();
    } catch (e) {
        // Fallback: inline data if fetch fails
        substitutionData = window.substitutionDataFallback || {};
    }
}

function findSubstitutions(ingredient) {
    const key = ingredient.toLowerCase().trim();
    return substitutionData[key] || [];
}

function renderSubstitutions() {
    const search = document.getElementById('sub-search').value;
    const container = document.getElementById('sub-results');

    if (!search.trim()) {
        container.innerHTML = '<p style="color: var(--text-muted);">Type an ingredient to find substitutions.</p>';
        return;
    }

    const results = findSubstitutions(search);

    if (results.length === 0) {
        container.innerHTML = `<p>No substitutions found for "<strong>${search}</strong>".</p>`;
        return;
    }

    let html = `<p>Substitutions for <strong>${search}</strong>:</p>`;
    results.forEach((sub, i) => {
        html += `<div style="margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border);">`;
        html += `<p><strong>${i + 1}. ${sub.substitute}</strong> — ${sub.ratio}</p>`;
        html += `<p style="color: var(--text-muted); font-size: 0.85rem;">${sub.notes}</p>`;
        html += `</div>`;
    });

    container.innerHTML = html;
}

document.getElementById('sub-search').addEventListener('input', renderSubstitutions);

// Load data on init
loadSubstitutions();

// Fallback inline data (in case fetch fails on file:// protocol)
window.substitutionDataFallback = {
    "butter": [
        { "substitute": "coconut oil", "ratio": "1:1", "notes": "Solid at room temp, works in baking" },
        { "substitute": "applesauce", "ratio": "1:1 (half butter, half applesauce)", "notes": "Lower fat, lighter texture" }
    ],
    "eggs": [
        { "substitute": "mashed banana", "ratio": "1 egg = 1/4 banana", "notes": "Adds sweetness, best in baking" },
        { "substitute": "flax egg", "ratio": "1 egg = 1 tbsp ground flax + 3 tbsp water", "notes": "Let sit 5 minutes" }
    ]
};

// Expose for testing
window.substitutionFinder = { findSubstitutions, renderSubstitutions };
