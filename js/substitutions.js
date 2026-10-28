// js/substitutions.js

let substitutionData = {};

const substitutionAliases = {
    eggs: 'egg',
    flour: 'all-purpose flour',
    apflour: 'all-purpose flour',
    'ap flour': 'all-purpose flour',
    'plain flour': 'all-purpose flour',

    breadcrumbs: 'bread crumbs',
    breadcrumb: 'bread crumbs',

    'brown sugars': 'brown sugar',
    'powdered sugars': 'powdered sugar',
    'confectioners sugar': 'powdered sugar',
    'confectioner sugar': 'powdered sugar',
    'icing sugar': 'powdered sugar',

    butters: 'butter',
    milks: 'milk',
    oils: 'vegetable oil',

    'heavy whipping cream': 'heavy cream',
    'whipping cream': 'heavy cream',

    yogurt: 'sour cream',
    yoghurt: 'sour cream',
    'greek yoghurt': 'sour cream',
    'greek yogurt': 'sour cream',

    'corn starch': 'cornstarch',

    'cream of tartars': 'cream of tartar',

    'self raising flour': 'self-rising flour',
    'self rising flour': 'self-rising flour',

    'bicarb soda': 'baking soda',
    bicarbonate: 'baking soda',
    'bicarbonate of soda': 'baking soda',

    'baking powders': 'baking powder',
    'baking sodas': 'baking soda',

    honey: 'honey',
    honeys: 'honey',

    'maple syrups': 'maple syrup',
    molasses: 'molasses',

    'white wines': 'white wine',
    'red wines': 'red wine',

    'rice wine vinegar': 'rice vinegar',
    'cider vinegar': 'apple cider vinegar',

    lemons: 'lemon juice',
    lemon: 'lemon juice',
    limes: 'lime juice',
    lime: 'lime juice',

    'soy sauces': 'soy sauce',
    tamari: 'soy sauce',

    worcestershire: 'worcestershire sauce',
    worcester: 'worcestershire sauce',

    dijon: 'dijon mustard',

    'tomato pastes': 'tomato paste',
    'tomato sauces': 'tomato sauce',

    'chicken stock': 'chicken broth',
    'beef stock': 'beef broth',
    'vegetable stock': 'vegetable broth',
    'veggie broth': 'vegetable broth',
    'veggie stock': 'vegetable broth',

    garlics: 'garlic',
    ginger: 'fresh ginger',

    herbs: 'fresh herbs',
    basil: 'fresh basil',
    oregano: 'fresh oregano',
    thyme: 'fresh thyme',
    rosemary: 'fresh rosemary',

    vanilla: 'vanilla extract',

    yeasts: 'yeast'
};


async function loadSubstitutions() {
    try {
        const response = await fetch('js/substitutions.json');

        if (!response.ok) {
            throw new Error(
                `Unable to load substitutions: HTTP ${response.status}`
            );
        }

        substitutionData = await response.json();

        renderSubstitutionWelcome();

    } catch (error) {
        console.error(
            'Failed to load substitutions:',
            error
        );

        const container =
            document.getElementById('sub-results');

        if (container) {
            container.innerHTML = `
                <p>
                    Unable to load the substitution database.
                </p>
            `;
        }
    }
}


function normalizeSearchText(value) {
    return String(value)
        .toLowerCase()
        .trim()
        .replace(/[_-]+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ');
}


function resolveAlias(value) {
    const normalized =
        normalizeSearchText(value);

    return substitutionAliases[normalized] ||
           normalized;
}


function formatIngredientName(name) {
    return String(name)
        .split(' ')
        .map(word =>
            word.charAt(0).toUpperCase() +
            word.slice(1)
        )
        .join(' ');
}


function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}


function calculateEditDistance(firstValue, secondValue) {
    const first =
        normalizeSearchText(firstValue);

    const second =
        normalizeSearchText(secondValue);

    const rows =
        first.length + 1;

    const columns =
        second.length + 1;

    const matrix =
        Array.from(
            { length: rows },
            () => Array(columns).fill(0)
        );

    for (let row = 0; row < rows; row++) {
        matrix[row][0] = row;
    }

    for (let column = 0; column < columns; column++) {
        matrix[0][column] = column;
    }

    for (let row = 1; row < rows; row++) {
        for (
            let column = 1;
            column < columns;
            column++
        ) {
            const cost =
                first[row - 1] ===
                second[column - 1]
                    ? 0
                    : 1;

            matrix[row][column] =
                Math.min(
                    matrix[row - 1][column] + 1,
                    matrix[row][column - 1] + 1,
                    matrix[row - 1][column - 1] +
                        cost
                );
        }
    }

    return matrix[rows - 1][columns - 1];
}


function scoreIngredientMatch(ingredient, searchText) {
    const normalizedIngredient =
        normalizeSearchText(ingredient);

    const normalizedSearch =
        normalizeSearchText(searchText);

    const resolvedSearch =
        resolveAlias(searchText);

    /*
     * Exact ingredient match.
     */
    if (normalizedIngredient === normalizedSearch) {
        return 1000;
    }

    /*
     * Exact alias match.
     */
    if (normalizedIngredient === resolvedSearch) {
        return 950;
    }

    /*
     * Ingredient begins with the user's search.
     */
    if (
        normalizedIngredient.startsWith(
            normalizedSearch
        )
    ) {
        return 800 -
            normalizedIngredient.length;
    }

    /*
     * Search appears anywhere in the ingredient.
     */
    if (
        normalizedIngredient.includes(
            normalizedSearch
        )
    ) {
        return 700 -
            normalizedIngredient.indexOf(
                normalizedSearch
            );
    }

    /*
     * Resolved alias appears in the ingredient.
     */
    if (
        resolvedSearch !== normalizedSearch &&
        normalizedIngredient.includes(
            resolvedSearch
        )
    ) {
        return 650;
    }

    /*
     * Match individual words.
     */
    const searchWords =
        normalizedSearch
            .split(' ')
            .filter(Boolean);

    const ingredientWords =
        normalizedIngredient
            .split(' ')
            .filter(Boolean);

    const matchingWords =
        searchWords.filter(searchWord =>
            ingredientWords.some(
                ingredientWord =>
                    ingredientWord.startsWith(
                        searchWord
                    ) ||
                    searchWord.startsWith(
                        ingredientWord
                    )
            )
        ).length;

    if (
        searchWords.length > 0 &&
        matchingWords === searchWords.length
    ) {
        return 550 + matchingWords;
    }

    /*
     * Typo tolerance. Short searches require a
     * closer match to avoid noisy results.
     */
    const editDistance =
        calculateEditDistance(
            normalizedIngredient,
            normalizedSearch
        );

    const maximumDistance =
        normalizedSearch.length <= 4
            ? 1
            : normalizedSearch.length <= 8
                ? 2
                : 3;

    if (editDistance <= maximumDistance) {
        return 400 - editDistance;
    }

    /*
     * Check typos against each part of a
     * multi-word ingredient.
     */
    let bestWordDistance =
        Number.POSITIVE_INFINITY;

    ingredientWords.forEach(word => {
        const distance =
            calculateEditDistance(
                word,
                normalizedSearch
            );

        bestWordDistance =
            Math.min(
                bestWordDistance,
                distance
            );
    });

    if (
        bestWordDistance <= maximumDistance
    ) {
        return 300 - bestWordDistance;
    }

    return 0;
}


function findMatchingIngredients(searchText) {
    const normalizedSearch =
        normalizeSearchText(searchText);

    if (!normalizedSearch) {
        return [];
    }

    return Object.keys(substitutionData)
        .map(ingredient => ({
            ingredient,
            score: scoreIngredientMatch(
                ingredient,
                normalizedSearch
            )
        }))
        .filter(match =>
            match.score > 0
        )
        .sort((first, second) => {
            if (second.score !== first.score) {
                return second.score -
                       first.score;
            }

            return first.ingredient.localeCompare(
                second.ingredient
            );
        });
}


function findSubstitutions(ingredient) {
    const resolvedIngredient =
        resolveAlias(ingredient);

    return substitutionData[
        resolvedIngredient
    ] || [];
}


function renderSubstitutionWelcome() {
    const container =
        document.getElementById('sub-results');

    if (!container) {
        return;
    }

    const popularIngredients = [
        'butter',
        'egg',
        'buttermilk',
        'heavy cream',
        'baking powder',
        'cornstarch',
        'milk',
        'brown sugar'
    ];

    const buttons =
        popularIngredients
            .filter(ingredient =>
                substitutionData[ingredient]
            )
            .map(ingredient => `
                <button
                    type="button"
                    class="substitution-suggestion"
                    data-ingredient="${escapeHtml(
                        ingredient
                    )}"
                >
                    ${escapeHtml(
                        formatIngredientName(
                            ingredient
                        )
                    )}
                </button>
            `)
            .join('');

    container.innerHTML = `
        <div class="substitution-welcome">
            <p>
                Search for an ingredient or choose
                a common substitution below.
            </p>

            <div class="substitution-suggestions">
                ${buttons}
            </div>
        </div>
    `;
}


function renderSubstitutionCards(ingredient) {
    const container =
        document.getElementById('sub-results');

    if (!container) {
        return;
    }

    const substitutions =
        substitutionData[ingredient] || [];

    if (substitutions.length === 0) {
        container.innerHTML = `
            <p>
                No substitutions found for
                <strong>
                    ${escapeHtml(
                        formatIngredientName(
                            ingredient
                        )
                    )}
                </strong>.
            </p>
        `;

        return;
    }

    const cards =
        substitutions
            .map((substitution, index) => `
                <article class="substitution-card">
                    <div class="substitution-number">
                        ${index + 1}
                    </div>

                    <div class="substitution-card-content">
                        <h3>
                            ${escapeHtml(
                                substitution.substitute
                            )}
                        </h3>

                        <p class="substitution-ratio">
                            <strong>Use:</strong>
                            ${escapeHtml(
                                substitution.ratio
                            )}
                        </p>

                        <p class="substitution-notes">
                            ${escapeHtml(
                                substitution.notes
                            )}
                        </p>
                    </div>
                </article>
            `)
            .join('');

    container.innerHTML = `
        <div class="substitution-heading">
            <span>Substitutions for</span>

            <strong>
                ${escapeHtml(
                    formatIngredientName(
                        ingredient
                    )
                )}
            </strong>
        </div>

        <div class="substitution-card-list">
            ${cards}
        </div>
    `;
}


function renderMatchingIngredients(matches) {
    const container =
        document.getElementById('sub-results');

    if (!container) {
        return;
    }

    const visibleMatches =
        matches.slice(0, 10);

    const buttons =
        visibleMatches
            .map(match => `
                <button
                    type="button"
                    class="substitution-suggestion"
                    data-ingredient="${escapeHtml(
                        match.ingredient
                    )}"
                >
                    ${escapeHtml(
                        formatIngredientName(
                            match.ingredient
                        )
                    )}
                </button>
            `)
            .join('');

    container.innerHTML = `
        <div class="substitution-match-panel">
            <p>
                Select an ingredient:
            </p>

            <div class="substitution-suggestions">
                ${buttons}
            </div>
        </div>
    `;
}


function renderNoMatches(searchText) {
    const container =
        document.getElementById('sub-results');

    if (!container) {
        return;
    }

    container.innerHTML = `
        <p>
            No substitution entries matched
            <strong>
                ${escapeHtml(searchText)}
            </strong>.
        </p>

        <p class="substitution-help">
            Try a shorter search such as
            <strong>cream</strong>,
            <strong>flour</strong>,
            <strong>vinegar</strong>,
            or <strong>broth</strong>.
        </p>
    `;
}


function renderSubstitutions() {
    const searchInput =
        document.getElementById('sub-search');

    if (!searchInput) {
        return;
    }

    const searchText =
        searchInput.value.trim();

    if (!searchText) {
        renderSubstitutionWelcome();
        return;
    }

    const resolvedSearch =
        resolveAlias(searchText);

    /*
     * Direct ingredient or alias match.
     */
    if (substitutionData[resolvedSearch]) {
        renderSubstitutionCards(
            resolvedSearch
        );

        return;
    }

    const matches =
        findMatchingIngredients(searchText);

    if (matches.length === 0) {
        renderNoMatches(searchText);
        return;
    }

    /*
     * Automatically show a single strong match.
     * Otherwise, show touch-friendly choices.
     */
    if (
        matches.length === 1 ||
        matches[0].score >= 900
    ) {
        renderSubstitutionCards(
            matches[0].ingredient
        );

        return;
    }

    renderMatchingIngredients(matches);
}


function selectSubstitutionIngredient(
    ingredient
) {
    const searchInput =
        document.getElementById('sub-search');

    if (searchInput) {
        searchInput.value =
            formatIngredientName(ingredient);
    }

    renderSubstitutionCards(ingredient);
}


function initializeSubstitutionFinder() {
    const searchInput =
        document.getElementById('sub-search');

    const resultsContainer =
        document.getElementById('sub-results');

    if (!searchInput || !resultsContainer) {
        console.error(
            'Substitution Finder elements were not found.'
        );

        return;
    }

    searchInput.addEventListener(
        'input',
        renderSubstitutions
    );

    searchInput.addEventListener(
        'keydown',
        event => {
            if (event.key !== 'Enter') {
                return;
            }

            event.preventDefault();

            const matches =
                findMatchingIngredients(
                    searchInput.value
                );

            if (matches.length > 0) {
                selectSubstitutionIngredient(
                    matches[0].ingredient
                );
            }
        }
    );

    /*
     * Event delegation allows dynamically
     * generated suggestion buttons to work.
     */
    resultsContainer.addEventListener(
        'click',
        event => {
            const button =
                event.target.closest(
                    '.substitution-suggestion'
                );

            if (!button) {
                return;
            }

            const ingredient =
                button.dataset.ingredient;

            if (
                ingredient &&
                substitutionData[ingredient]
            ) {
                selectSubstitutionIngredient(
                    ingredient
                );
            }
        }
    );
}


window.kitchenApp =
    window.kitchenApp || {};

window.kitchenApp.substitutionFinder = {
    findSubstitutions,
    findMatchingIngredients,
    renderSubstitutions,
    selectSubstitutionIngredient
};

/*
 * Keep compatibility with the original global.
 */
window.substitutionFinder = {
    findSubstitutions,
    renderSubstitutions
};

initializeSubstitutionFinder();
loadSubstitutions();
