// js/converter.js

const conversions = {
    temperature: {
        units: ['°C', '°F', 'K'],
        toKelvin: {
            '°C': v => v + 273.15,
            '°F': v => (v - 32) * 5/9 + 273.15,
            'K': v => v
        },
        fromKelvin: {
            '°C': v => v - 273.15,
            '°F': v => (v - 273.15) * 9/5 + 32,
            'K': v => v
        }
    },
    volume: {
        units: ['ml', 'l', 'cup', 'tbsp', 'tsp', 'fl oz'],
        toMl: {
            'ml': v => v,
            'l': v => v * 1000,
            'cup': v => v * 236.588,
            'tbsp': v => v * 14.787,
            'tsp': v => v * 4.929,
            'fl oz': v => v * 29.574
        },
        fromMl: {
            'ml': v => v,
            'l': v => v / 1000,
            'cup': v => v / 236.588,
            'tbsp': v => v / 14.787,
            'tsp': v => v / 4.929,
            'fl oz': v => v / 29.574
        }
    },
    weight: {
        units: ['g', 'kg', 'oz', 'lb'],
        toGrams: {
            'g': v => v,
            'kg': v => v * 1000,
            'oz': v => v * 28.3495,
            'lb': v => v * 453.592
        },
        fromGrams: {
            'g': v => v,
            'kg': v => v / 1000,
            'oz': v => v / 28.3495,
            'lb': v => v / 453.592
        }
    }
};

let currentType = 'temperature';

function populateSelects() {
    const fromSelect = document.getElementById('converter-from');
    const toSelect = document.getElementById('converter-to');
    const units = conversions[currentType].units;

    fromSelect.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
    toSelect.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');

    // Default "from" to first unit, "to" to second
    if (units.length >= 2) {
        toSelect.value = units[1];
    }
}

function convert(value, from, to) {
    const conv = conversions[currentType];

    if (currentType === 'temperature') {
        const kelvin = conv.toKelvin[from](value);
        return conv.fromKelvin[to](kelvin);
    } else if (currentType === 'volume') {
        const ml = conv.toMl[from](value);
        return conv.fromMl[to](ml);
    } else {
        const grams = conv.toGrams[from](value);
        return conv.fromGrams[to](grams);
    }
}

function renderConverter() {
    const value = parseFloat(document.getElementById('converter-value').value) || 0;
    const from = document.getElementById('converter-from').value;
    const to = document.getElementById('converter-to').value;

    const result = convert(value, from, to);
    const container = document.getElementById('converter-results');

    container.innerHTML = `<p><strong>${value} ${from}</strong> = <strong>${result.toFixed(2)} ${to}</strong></p>`;
}

document.querySelectorAll('.converter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.converter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentType = tab.dataset.type;
        populateSelects();
        renderConverter();
    });
});

document.getElementById('converter-value').addEventListener('input', renderConverter);
document.getElementById('converter-from').addEventListener('change', renderConverter);
document.getElementById('converter-to').addEventListener('change', renderConverter);

populateSelects();
renderConverter();

// Expose for testing
window.unitConverter = { convert, renderConverter, setConverterType: (t) => { currentType = t; populateSelects(); renderConverter(); } };
