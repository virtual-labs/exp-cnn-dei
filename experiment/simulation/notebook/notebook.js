document.addEventListener('DOMContentLoaded', () => {
    const notebookContainer = document.getElementById('notebook-container');
    const tocList = document.getElementById('toc-list');
    const runAllBtn = document.getElementById('run-all-btn');
    const resetBtn = document.getElementById('reset-btn');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    let cellData = [];
    let executedCellIds = new Set(); // Track executed cells
    let isRunningAll = false;
    let tocItemsMap = new Map(); // Map Header Cell ID -> TOC Step Element
    let cellIdToHeaderMap = new Map(); // Map Code Cell ID -> Header Cell ID
    let codeCellIndexCounter = 1;

    // Load Data
    fetch('notebook_data.json')
        .then(response => response.json())
        .then(data => {
            cellData = data;
            renderNotebook();
            updateCellLocks(); // Initial lock state
        })
        .catch(err => {
            console.error('Error loading notebook data:', err);
            notebookContainer.innerHTML = '<p class="error">Failed to load notebook data.</p>';
        });

    function renderNotebook() {
        notebookContainer.innerHTML = '';
        tocList.innerHTML = '';
        let currentHeaderId = null;
        let stepCounter = 1;

        cellData.forEach(cell => {
            // --- 1. Create Cell Element ---
            const cellEl = document.createElement('div');
            // Use 'notebook-cell' to match RNN styling
            cellEl.className = `notebook-cell cell ${cell.cell_type}`;
            cellEl.id = `cell-${cell.id}`;

            // --- 2. Render Content ---
            let contentHtml = '';
            let headerLevel = null;
            let headerText = null;

            if (cell.cell_type === 'markdown') {
                contentHtml = marked.parse(cell.source);

                // Extract Header for Sidebar navigation
                const headerMatch = cell.source.match(/(?:^|[\r\n])\s*(#{1,3})\s+(.*)/);
                if (headerMatch) {
                    headerLevel = headerMatch[1].length;
                    headerText = headerMatch[2].trim();
                    headerText = headerText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_~`]/g, '');
                    currentHeaderId = cell.id;
                }
            } else {
                // Code Cell
                const highlighted = hljs.highlight(cell.source, { language: 'python' }).value;
                // Determine label if we have a header context
                const stepLabel = headerText ? `Step ${stepCounter}: ${headerText}` : `Step ${stepCounter}: Code Execution`;

                contentHtml = `
                    <div class="cell-header">
                        <span class="cell-label">${stepLabel}</span>
                        <button class="run-btn" id="btn-${cell.id}" onclick="runCell(${cell.id})">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                            Run
                        </button>
                    </div>
                    <div class="cell-code">
                        <pre><code class="language-python">${highlighted}</code></pre>
                    </div>
                    <div class="cell-output hidden" id="output-${cell.id}">
                        <div class="output-label">Output:</div>
                         <!-- Content injected here -->
                    </div>
                `;
            }

            if (cell.cell_type === 'markdown') {
                cellEl.innerHTML = contentHtml;
            } else {
                // For code cells, contentHtml is the innerHTML
                cellEl.innerHTML = contentHtml;
            }
            notebookContainer.appendChild(cellEl);

            if (cell.cell_type === 'code') {
                if (currentHeaderId !== null) {
                    cellIdToHeaderMap.set(cell.id, currentHeaderId);
                }
            }

            // --- 3. Build TOC (Steps) ---
            if (headerText) {
                const stepItem = document.createElement('div');
                stepItem.className = 'step-item';
                stepItem.setAttribute('data-step', stepCounter);

                stepItem.onclick = () => {
                    const yOffset = -20;
                    const y = cellEl.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                    // Optional: mark active?
                };

                // Step Indicator
                const indicator = document.createElement('div');
                indicator.className = 'step-indicator';
                const stepNum = document.createElement('span');
                stepNum.className = 'step-number';
                stepNum.textContent = stepCounter;
                indicator.appendChild(stepNum);

                // Step Content
                const content = document.createElement('div');
                content.className = 'step-content';
                const title = document.createElement('span');
                title.className = 'step-title';
                title.textContent = headerText;
                content.appendChild(title);

                stepItem.appendChild(indicator);
                stepItem.appendChild(content);
                tocList.appendChild(stepItem);

                // Map this Step item to the markdown cell ID
                tocItemsMap.set(cell.id, stepItem);
                stepCounter++;
            }
        });

        // MathJax - Defensive rendering with timeout
        typesetMath();
    }

    // Helper function to safely typeset math
    function typesetMath() {
        const attemptTypeset = () => {
            try {
                if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
                    window.MathJax.typesetPromise()
                        .catch(err => console.warn('MathJax typesetting error:', err));
                    return true;
                }
            } catch (err) {
                console.warn('MathJax not ready:', err);
            }
            return false;
        };

        // Try immediately
        if (!attemptTypeset()) {
            // If failed, retry after a short delay (MathJax might still be loading)
            setTimeout(() => {
                if (!attemptTypeset()) {
                    console.log('MathJax not available, math rendering skipped');
                }
            }, 1000);
        }
    }

    // --- LOCKING LOGIC ---
    function updateCellLocks() {
        const codeCells = cellData.filter(c => c.cell_type === 'code');
        let locked = false;

        codeCells.forEach((cell, index) => {
            const btn = document.getElementById(`btn-${cell.id}`);
            if (!btn) return;

            if (locked) {
                btn.disabled = true;
                btn.title = "Run previous cells first";
            } else {
                btn.disabled = false;
                btn.title = "Run Cell";
            }

            // If this cell hasn't been executed, lock all subsequent ones
            if (!executedCellIds.has(cell.id)) {
                locked = true;
            }
        });

        updateTOCStatus();
    }

    function updateTOCStatus() {
        let currentHeaderId = null;
        let sectionCodePixels = [];

        // Helper to check and update section
        const checkSection = (headerId, codeIds) => {
            if (!headerId || !tocItemsMap.has(headerId)) return;

            const stepItem = tocItemsMap.get(headerId);
            stepItem.classList.remove('running', 'completed');

            if (codeIds.length > 0) {
                const allDone = codeIds.every(id => executedCellIds.has(id));
                const anyRunning = codeIds.some(id => {
                    const el = document.getElementById(`cell-${id}`);
                    return el && el.classList.contains('running');
                });

                if (anyRunning) {
                    stepItem.classList.add('running');
                } else if (allDone) {
                    stepItem.classList.add('completed');
                }
            } else {
                // Header with no code? Mark complete immediately for flow
                stepItem.classList.add('completed');
            }
        };

        for (let i = 0; i < cellData.length; i++) {
            const cell = cellData[i];

            if (cell.cell_type === 'markdown' && tocItemsMap.has(cell.id)) {
                // Check previous section
                if (currentHeaderId !== null) {
                    checkSection(currentHeaderId, sectionCodePixels);
                }

                currentHeaderId = cell.id;
                sectionCodePixels = []; // Reset for new section
            } else if (cell.cell_type === 'code') {
                sectionCodePixels.push(cell.id);
            }
        }
        // Check last section
        if (currentHeaderId !== null) {
            checkSection(currentHeaderId, sectionCodePixels);
        }
    }

    window.runCell = async function (cellId) {
        if (isRunningAll) return;

        // Force sequential check
        const codeCells = cellData.filter(c => c.cell_type === 'code');
        const cellIndex = codeCells.findIndex(c => c.id === cellId);
        if (cellIndex > 0) {
            const prevId = codeCells[cellIndex - 1].id;
            if (!executedCellIds.has(prevId)) {
                alert("Please run cells in order!");
                return;
            }
        }

        await executeCell(cellId);
        updateCellLocks();
    };

    async function executeCell(cellId) {
        const cell = cellData.find(c => c.id === cellId);
        if (!cell || cell.cell_type !== 'code') return;

        const cellEl = document.getElementById(`cell-${cellId}`);
        const outputEl = document.getElementById(`output-${cellId}`);
        const btnEl = document.getElementById(`btn-${cellId}`);

        // TOC Running State
        const headerId = cellIdToHeaderMap.get(cellId);
        if (headerId && tocItemsMap.has(headerId)) {
            tocItemsMap.get(headerId).classList.add('running');
        }

        // State: Running
        cellEl.classList.add('running');

        if (btnEl) {
            btnEl.innerHTML = `
                <svg class="loading-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="border: none; margin: 0; animation: spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path> 
                </svg>
                Running
            `;
            btnEl.classList.add('running');
            btnEl.disabled = true;
        }

        // Simulate Delay
        // User request: stop 2 seconds per code when run all cells automatically
        let delay;
        if (isRunningAll) {
            delay = 2000;
        } else {
            delay = Math.floor(Math.random() * 700) + 800;
        }
        await new Promise(r => setTimeout(r, delay));

        // Render Outputs
        outputEl.innerHTML = '';
        if (cell.outputs && cell.outputs.length > 0) {
            cell.outputs.forEach(output => {
                if (output.output_type === 'stream') {
                    const pre = document.createElement('div');
                    pre.className = 'output-text';
                    pre.textContent = output.text;
                    outputEl.appendChild(pre);
                } else if (output.data) {
                    if (output.data['image/png']) {
                        const div = document.createElement('div');
                        div.className = 'output-image';
                        const img = document.createElement('img');
                        img.src = `data:image/png;base64,${output.data['image/png']}`;
                        div.appendChild(img);
                        outputEl.appendChild(div);
                    } else if (output.data['text/plain']) {
                        const pre = document.createElement('div');
                        pre.className = 'output-text';
                        pre.textContent = output.data['text/plain'];
                        outputEl.appendChild(pre);
                    }
                }
            });
            outputEl.classList.add('visible');
            outputEl.classList.remove('hidden');
        } else {
            outputEl.classList.add('hidden'); // Ensure hidden if no output
        }

        // State: Done
        cellEl.classList.remove('running');
        cellEl.classList.add('executed');

        if (btnEl) {
            btnEl.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                Run
            `;
            btnEl.classList.remove('running');
            btnEl.disabled = false;
        }

        executedCellIds.add(cellId);
    }

    runAllBtn.addEventListener('click', async () => {
        if (isRunningAll) return;
        isRunningAll = true;

        // Remove status bar references or use them if they exist in HTML
        // For now, assuming standard flow
        runAllBtn.disabled = true;
        resetBtn.disabled = true;
        runAllBtn.textContent = 'Running...';

        const codeCells = cellData.filter(c => c.cell_type === 'code');
        const total = codeCells.length;

        for (let i = 0; i < total; i++) {
            const cell = codeCells[i];
            const el = document.getElementById(`cell-${cell.id}`);
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });

            if (progressText) progressText.textContent = `Running ${i + 1}/${total}`;
            if (progressBar) progressBar.style.width = `${((i) / total) * 100}%`;

            // Wait 2 seconds per code (execution time controlled in executeCell, or forced buffer here)
            // But user said "stop 2 seconds per code", which implies the running state lasts 2s.
            // We will modify executeCell to handle the running duration.
            await executeCell(cell.id);

            // Wait 3 seconds at output
            await new Promise(r => setTimeout(r, 3000));

            updateCellLocks();

            if (progressBar) progressBar.style.width = `${((i + 1) / total) * 100}%`;
        }

        isRunningAll = false;
        runAllBtn.disabled = false;
        resetBtn.disabled = false;
        runAllBtn.textContent = 'Run All Cells';
        if (progressText) progressText.textContent = 'Completed';
    });

    resetBtn.addEventListener('click', () => {
        // Clear outputs
        document.querySelectorAll('.cell-output').forEach(el => {
            el.innerHTML = '';
            el.classList.add('hidden');
            el.classList.remove('visible');
        });

        // Reset buttons
        document.querySelectorAll('.run-btn').forEach(btn => {
            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                </svg>
                Run
            `;
            btn.classList.remove('running');
            btn.disabled = false;
        });

        executedCellIds.clear();

        // Reset classes
        document.querySelectorAll('.notebook-cell').forEach(el => {
            el.classList.remove('executed');
            el.classList.remove('running');
        });

        // Reset Step markers
        document.querySelectorAll('.step-item').forEach(el => {
            el.classList.remove('completed');
            el.classList.remove('running');
        });

        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = 'Ready';

        updateCellLocks();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});
