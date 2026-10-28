// js/app.js

const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tool-panel');

function switchTab(tabName) {
    tabs.forEach(tab => {
        const isActive = tab.dataset.tab === tabName;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive);
    });
    panels.forEach(panel => {
        const isActive = panel.id === tabName;
        panel.classList.toggle('active', isActive);
        panel.hidden = !isActive;
    });
    localStorage.setItem('activeTab', tabName);
}

tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// Restore last active tab
const savedTab = localStorage.getItem('activeTab');
if (savedTab && document.getElementById(savedTab)) {
    switchTab(savedTab);
}

// Expose for other modules
window.kitchenApp = window.kitchenApp || {};
window.kitchenApp.switchTab = switchTab;
