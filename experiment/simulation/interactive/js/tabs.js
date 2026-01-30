/**
 * Tab Navigation Controller
 * Handles switching between simulation tabs with lazy initialization
 */

(function () {
    // Track which simulations have been initialized
    const initialized = {
        sim1: false,
        sim2: false,
        sim3: false
    };

    // Tab switching logic
    document.addEventListener('DOMContentLoaded', () => {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        // Collapse bottom panels for sim2 and sim3 by default
        const sim2Panel = document.querySelector('#sim2 .bottom-panel-wrapper');
        const sim3Panel = document.querySelector('#sim3 .bottom-panel-wrapper');
        if (sim2Panel) sim2Panel.classList.add('collapsed');
        if (sim3Panel) sim3Panel.classList.add('collapsed');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;

                // Update button states
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update content visibility
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === tabId) {
                        content.classList.add('active');
                    }
                });

                // Trigger initialization for the new tab if needed
                initializeTab(tabId);

                // Trigger resize event for charts to redraw properly
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                }, 100);
            });
        });

        // Initialize the first tab
        initializeTab('sim1');
    });

    function initializeTab(tabId) {
        if (initialized[tabId]) return;

        // Mark as initialized
        initialized[tabId] = true;

        // Tab-specific initialization could go here if needed
        // The existing scripts already use DOMContentLoaded which fires once
        // So we rely on the content being ready

        console.log(`Tab ${tabId} activated`);
    }

    // Expose for debugging
    window.tabController = {
        initialized,
        switchTo: function (tabId) {
            const btn = document.querySelector(`[data-tab="${tabId}"]`);
            if (btn) btn.click();
        }
    };
})();
