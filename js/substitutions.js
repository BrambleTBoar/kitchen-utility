// js/substitutions.js

(() => {
    let substitutionData = {};
    let substitutionsLoaded = false;
    let substitutionsLoading = false;

    /*
     * Aliases should represent alternate names,
     * spelling variants, plurals, or equivalent
     * terminology.
     *
     * Ingredients that merely substitute for one
     * another do not belong in this alias table.
     */
    const substitutionAliases = {
        eggs: 'egg',

        flour: 'all-purpose flour',
        flours: 'all-purpose flour',
        'ap flour': 'all-purpose flour',
        apflour: 'all-purpose flour',
        'plain flour': 'all-purpose flour',

        breadcrumbs: 'bread crumbs',
        breadcrumb: 'bread crumbs',

        'brown sugars': 'brown sugar',

        'powdered sugars': 'powdered sugar',
        'confectioners sugar': 'powdered sugar',
        "confectioner's sugar": 'powdered sugar',
        'confectioner sugar': 'powdered sugar',
        'icing sugar': 'powdered sugar',

        butters: 'butter',
        milks: 'milk',

        'heavy whipping cream': 'heavy cream',
        'whipping cream': 'heavy cream',

        'corn starch': 'cornstarch',

        'cream of tartars': 'cream of tartar',

        'self raising flour': 'self-rising flour',
        'self-rising flours': 'self-rising flour',
        'self rising flour': 'self-rising flour',

        'bicarb soda': 'baking soda',
        bicarbonate: 'baking soda',
        'bicarbonate of soda': 'baking soda',

        'baking powders': 'baking powder',
        'baking sodas': 'baking soda',

        honeys: 'honey',
        'maple syrups': 'maple syrup',

        'white wines': 'white wine',
        'red wines': 'red wine',

        'rice wine vinegar': 'rice vinegar',
        'cider vinegar': 'apple cider vinegar',

        lemon: 'lemon juice',
        lemons: 'lemon juice',

        lime: 'lime juice',
        limes: 'lime juice',

        'soy sauces': 'soy sauce',

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


    function normalizeSearchText(value) {
        return String(value ?? '')
            .toLowerCase()
            .trim()
            .replace(/[_-]+/g, ' ')
            .replace(/[^\p{L}\p{N}\s]/gu, '')
            .replace(/\s+/g, ' ');
    }


    function resolveAlias(value) {
        const normalizedValue =
            normalizeSearchText(value);

        return (
            substitutionAliases[normalizedValue] ||
            normalizedValue
        );
    }


    function formatIngredientName(name) {
        return String(name)
            .split(' ')
            .map(word => {
                if (!word) {
                    return '';
                }

                return (
                    word.charAt(0).toUpperCase() +
                    word.slice(1)
                );
            })
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


    function getSearchInput() {
        return document.getElementById(
            'sub-search'
        );
    }


    function getResultsContainer() {
        return document.getElementById(
            'sub-results'
        );
    }


    function setSearchEnabled(enabled) {
        const searchInput =
            getSearchInput();

        if (!searchInput) {
            return;
        }

        searchInput.disabled =
            !enabled;

        searchInput.setAttribute(
            'aria-busy',
            enabled ? 'false' : 'true'
        );
    }


    function renderLoadingState() {
        const container =
            getResultsContainer();

        if (!container) {
            return;
        }

        container.innerHTML = `
            <div
                class="substitution-loading"
                role="status"
                aria-live="polite"
            >
                <p>
                    Loading substitution database...
                </p>
            </div>
        `;
    }


    function renderLoadError(error) {
        const container =
            getResultsContainer();

        if (!container) {
            return;
        }

        container.innerHTML = `
            <div
                class="substitution-error"
                role="alert"
            >
                <p>
                    The substitution database could
                    not be loaded.
                </p>

                <p class="substitution-help">
                    Refresh the page and try again.
                </p>
            </div>
        `;

        console.error(
            'Failed to load substitutions:',
            error
        );
    }


    async function loadSubstitutions() {
        if (
            substitutionsLoaded ||
            substitutionsLoading
        ) {
            return;
        }

        substitutionsLoading = true;

        /*
         * Save the current value before disabling
         * the search field. This protects text that
         * was restored by the browser or entered
         * immediately during page startup.
         */
        const searchInput =
            getSearchInput();

        const pendingSearch =
            searchInput
                ? searchInput.value
                : '';

        setSearchEnabled(false);
        renderLoadingState();

        try {
            const response =
                await fetch(
                    'js/substitutions.json',
                    {
                        cache: 'no-cache'
                    }
                );

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            const loadedData =
                await response.json();

            if (
                !loadedData ||
                typeof loadedData !== 'object' ||
                Array.isArray(loadedData)
            ) {
                throw new Error(
                    'Substitution data is not a valid object.'
                );
            }

            substitutionData =
                loadedData;

            substitutionsLoaded = true;
            substitutionsLoading = false;

            setSearchEnabled(true);

            /*
             * Restore any text captured before the
             * asynchronous load completed.
             */
            if (
                searchInput &&
                !searchInput.value &&
                pendingSearch
            ) {
                searchInput.value =
                    pendingSearch;
            }

            /*
             * Do not overwrite an active search
             * with the welcome screen.
             */
            if (
                searchInput &&
                searchInput.value.trim()
            ) {
                renderSubstitutions();
            } else {
                renderSubstitutionWelcome();
            }

        } catch (error) {
            substitutionsLoading = false;
            substitutionsLoaded = false;

            setSearchEnabled(true);
            renderLoadError(error);
        }
    }


    function calculateEditDistance(
        firstValue,
        secondValue
    ) {
        const first =
            normalizeSearchText(firstValue);

        const second =
            normalizeSearchText(secondValue);

        if (first === second) {
            return 0;
        }

        if (!first) {
            return second.length;
        }

        if (!second) {
            return first.length;
        }

        /*
         * Two-row Levenshtein implementation.
         * This uses less memory than allocating
         * the complete matrix.
         */
        let previousRow =
            Array.from(
                { length: second.length + 1 },
                (_, index) => index
            );

        let currentRow =
            new Array(
                second.length + 1
            );

        for (
            let firstIndex = 1;
            firstIndex <= first.length;
            firstIndex++
        ) {
            currentRow[0] =
                firstIndex;

            for (
                let secondIndex = 1;
                secondIndex <= second.length;
                secondIndex++
            ) {
                const cost =
                    first[firstIndex - 1] ===
                    second[secondIndex - 1]
                        ? 0
                        : 1;

                currentRow[secondIndex] =
                    Math.min(
                        previousRow[secondIndex] + 1,
                        currentRow[secondIndex - 1] + 1,
                        previousRow[secondIndex - 1] +
                            cost
                    );
            }

            const temporaryRow =
                previousRow;

            previousRow =
                currentRow;

            currentRow =
                temporaryRow;
        }

        return previousRow[
            second.length
        ];
    }


    function scoreIngredientMatch(
        ingredient,
        searchText
    ) {
        const normalizedIngredient =
            normalizeSearchText(ingredient);

        const normalizedSearch =
            normalizeSearchText(searchText);

        const resolvedSearch =
            resolveAlias(searchText);

        if (!normalizedSearch) {
            return 0;
        }

        /*
         * Exact ingredient name.
         */
        if (
            normalizedIngredient ===
            normalizedSearch
        ) {
            return 1000;
        }

        /*
         * Exact recognized alias.
         */
        if (
            normalizedIngredient ===
            resolvedSearch
        ) {
            return 950;
        }

        /*
         * Ingredient begins with the search.
         */
        if (
            normalizedIngredient.startsWith(
                normalizedSearch
            )
        ) {
            return (
                800 -
                normalizedIngredient.length
            );
        }

        /*
         * Search appears anywhere within the
         * ingredient name.
         */
        if (
            normalizedIngredient.includes(
                normalizedSearch
            )
        ) {
            return (
                700 -
                normalizedIngredient.indexOf(
                    normalizedSearch
                )
            );
        }

        /*
         * Resolved alias appears within a longer
         * ingredient name.
         */
        if (
            resolvedSearch !==
                normalizedSearch &&
            normalizedIngredient.includes(
                resolvedSearch
            )
        ) {
            return 650;
        }

        const searchWords =
            normalizedSearch
                .split(' ')
                .filter(Boolean);

        const ingredientWords =
            normalizedIngredient
                .split(' ')
                .filter(Boolean);

        const matchingWords =
            searchWords.filter(
                searchWord =>
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
            matchingWords ===
                searchWords.length
        ) {
            return (
                550 +
                matchingWords
            );
        }

        /*
         * Typo tolerance is disabled for one- and
         * two-character searches because those
         * queries produce too many false matches.
         */
        if (
            normalizedSearch.length < 3
        ) {
            return 0;
        }

        const maximumDistance =
            normalizedSearch.length <= 4
                ? 1
                : normalizedSearch.length <= 8
                    ? 2
                    : 3;

        /*
         * Compare against the entire ingredient.
         */
        const fullEditDistance =
            calculateEditDistance(
                normalizedIngredient,
                normalizedSearch
            );

        if (
            fullEditDistance <=
            maximumDistance
        ) {
            return (
                400 -
                fullEditDistance
            );
        }

        /*
         * Compare against the individual words in
         * multi-word ingredient names.
         */
        let bestWordDistance =
            Number.POSITIVE_INFINITY;

        ingredientWords.forEach(word => {
            const wordDistance =
                calculateEditDistance(
                    word,
                    normalizedSearch
                );

            bestWordDistance =
                Math.min(
                    bestWordDistance,
                    wordDistance
                );
        });

        if (
            bestWordDistance <=
            maximumDistance
        ) {
            return (
                300 -
                bestWordDistance
            );
        }

        return 0;
    }


    function findMatchingIngredients(
        searchText
    ) {
        if (!substitutionsLoaded) {
            return [];
        }

        const normalizedSearch =
            normalizeSearchText(searchText);

        if (!normalizedSearch) {
            return [];
        }

        return Object.keys(
            substitutionData
        )
            .map(ingredient => ({
                ingredient,
                score:
                    scoreIngredientMatch(
                        ingredient,
                        normalizedSearch
                    )
            }))
            .filter(match =>
                match.score > 0
            )
            .sort(
                (first, second) => {
                    if (
                        second.score !==
                        first.score
                    ) {
                        return (
                            second.score -
                            first.score
                        );
                    }

                    return first.ingredient
                        .localeCompare(
                            second.ingredient
                        );
                }
            );
    }


    function findSubstitutions(
        ingredient
    ) {
        if (!substitutionsLoaded) {
            return [];
        }

        const resolvedIngredient =
            resolveAlias(ingredient);

        return (
            substitutionData[
                resolvedIngredient
            ] || []
        );
    }


    function renderSubstitutionWelcome() {
        const container =
            getResultsContainer();

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

        const suggestionButtons =
            popularIngredients
                .filter(ingredient =>
                    substitutionData[
                        ingredient
                    ]
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
                    a common ingredient below.
                </p>

                <div class="substitution-suggestions">
                    ${suggestionButtons}
                </div>
            </div>
        `;
    }


    function renderSubstitutionCards(
        ingredient
    ) {
        const container =
            getResultsContainer();

        if (!container) {
            return;
        }

        const substitutions =
            substitutionData[
                ingredient
            ] || [];

        if (
            !Array.isArray(substitutions) ||
            substitutions.length === 0
        ) {
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
                .filter(substitution =>
                    substitution &&
                    typeof substitution ===
                        'object'
                )
                .map(
                    (
                        substitution,
                        index
                    ) => {
                        const substitute =
                            substitution
                                .substitute ||
                            'Unnamed substitute';

                        const ratio =
                            substitution.ratio ||
                            'Use as needed';

                        const notes =
                            substitution.notes ||
                            'No additional notes.';

                        return `
                            <article
                                class="substitution-card"
                            >
                                <div
                                    class="substitution-number"
                                    aria-hidden="true"
                                >
                                    ${index + 1}
                                </div>

                                <div
                                    class="substitution-card-content"
                                >
                                    <h3>
                                        ${escapeHtml(
                                            substitute
                                        )}
                                    </h3>

                                    <p
                                        class="substitution-ratio"
                                    >
                                        <strong>
                                            Use:
                                        </strong>

                                        ${escapeHtml(
                                            ratio
                                        )}
                                    </p>

                                    <p
                                        class="substitution-notes"
                                    >
                                        ${escapeHtml(
                                            notes
                                        )}
                                    </p>
                                </div>
                            </article>
                        `;
                    }
                )
                .join('');

        container.innerHTML = `
            <div class="substitution-heading">
                <span>
                    Substitutions for
                </span>

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


    function renderMatchingIngredients(
        matches
    ) {
        const container =
            getResultsContainer();

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


    function renderNoMatches(
        searchText
    ) {
        const container =
            getResultsContainer();

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
            getSearchInput();

        if (!searchInput) {
            return;
        }

        if (!substitutionsLoaded) {
            renderLoadingState();
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
         * Show an exact ingredient or recognized
         * alias immediately.
         */
        if (
            substitutionData[
                resolvedSearch
            ]
        ) {
            renderSubstitutionCards(
                resolvedSearch
            );

            return;
        }

        const matches =
            findMatchingIngredients(
                searchText
            );

        if (matches.length === 0) {
            renderNoMatches(
                searchText
            );

            return;
        }

        /*
         * Only auto-select an unambiguous exact or
         * alias-quality match. Ambiguous partial
         * searches continue showing choices.
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

        renderMatchingIngredients(
            matches
        );
    }


    function selectSubstitutionIngredient(
        ingredient
    ) {
        if (
            !substitutionsLoaded ||
            !substitutionData[
                ingredient
            ]
        ) {
            return;
        }

        const searchInput =
            getSearchInput();

        if (searchInput) {
            searchInput.value =
                formatIngredientName(
                    ingredient
                );
        }

        renderSubstitutionCards(
            ingredient
        );
    }


    function handleSearchKeydown(
        event
    ) {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();

        if (!substitutionsLoaded) {
            return;
        }

        const searchInput =
            getSearchInput();

        if (!searchInput) {
            return;
        }

        const resolvedSearch =
            resolveAlias(
                searchInput.value
            );

        /*
         * Enter opens exact/alias matches.
         */
        if (
            substitutionData[
                resolvedSearch
            ]
        ) {
            selectSubstitutionIngredient(
                resolvedSearch
            );

            return;
        }

        const matches =
            findMatchingIngredients(
                searchInput.value
            );

        /*
         * Enter only auto-selects a sole result.
         * Ambiguous searches retain the visible
         * suggestion list.
         */
        if (matches.length === 1) {
            selectSubstitutionIngredient(
                matches[0].ingredient
            );
        } else if (
            matches.length > 1
        ) {
            renderMatchingIngredients(
                matches
            );
        }
    }


    function handleResultsClick(
        event
    ) {
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
            substitutionData[
                ingredient
            ]
        ) {
            selectSubstitutionIngredient(
                ingredient
            );
        }
    }


    function initializeSubstitutionFinder() {
        const searchInput =
            getSearchInput();

        const resultsContainer =
            getResultsContainer();

        if (
            !searchInput ||
            !resultsContainer
        ) {
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
            handleSearchKeydown
        );

        /*
         * Event delegation supports suggestion
         * buttons created after each search.
         */
        resultsContainer.addEventListener(
            'click',
            handleResultsClick
        );

        setSearchEnabled(false);
        renderLoadingState();

        loadSubstitutions();
    }


    window.kitchenApp =
        window.kitchenApp || {};

    window.kitchenApp.substitutionFinder = {
        findSubstitutions,
        findMatchingIngredients,
        renderSubstitutions,
        selectSubstitutionIngredient,
        loadSubstitutions
    };

    /*
     * Preserve compatibility with the upstream
     * Kitchen Utility global name.
     */
    window.substitutionFinder = {
        findSubstitutions,
        renderSubstitutions
    };

    initializeSubstitutionFinder();
})();
