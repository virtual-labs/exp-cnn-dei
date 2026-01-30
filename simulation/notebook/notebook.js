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
    let tocItemsMap = new Map(); // Map Header Cell ID -> TOC Status Element
    let cellIdToHeaderMap = new Map(); // Map Code Cell ID -> Header Cell ID

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

        cellData.forEach(cell => {
            // --- 1. Create Cell Element ---
            const cellEl = document.createElement('div');
            cellEl.className = `cell ${cell.cell_type}`;
            cellEl.id = `cell-${cell.id}`;

            // Exec Count (Code Only)
            if (cell.cell_type === 'code') {
                const execCount = document.createElement('div');
                execCount.className = 'exec-count';
                execCount.id = `exec-count-${cell.id}`;
                execCount.textContent = '[ ]';
                cellEl.appendChild(execCount);

                // Map code cell to current header
                if (currentHeaderId !== null) {
                    cellIdToHeaderMap.set(cell.id, currentHeaderId);
                }
            }

            // --- 2. Render Content ---
            let contentHtml = '';
            let headerLevel = null;
            let headerText = null;

            if (cell.cell_type === 'markdown') {
                contentHtml = marked.parse(cell.source);

                // Extract Header for TOC - Robust Multiline Search
                // Matches 1-3 hashes at start of string or after newline
                const headerMatch = cell.source.match(/(?:^|[\r\n])\s*(#{1,3})\s+(.*)/);
                if (headerMatch) {
                    headerLevel = headerMatch[1].length; // 1, 2, or 3
                    headerText = headerMatch[2].trim();
                    // Clean Text (remove links, bold, etc)
                    headerText = headerText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_~`]/g, '');
                    currentHeaderId = cell.id; // Update current section
                }
            } else {
                // Code Cell - Dark Theme
                const highlighted = hljs.highlight(cell.source, { language: 'python' }).value;
                contentHtml = `
                    <div class="input-area">
                        <pre><code class="language-python">${highlighted}</code></pre>
                        <button class="run-cell-btn" id="btn-${cell.id}" onclick="runCell(${cell.id})" title="Run Cell">
                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                    </div>
                    <div class="output-area" id="output-${cell.id}"></div>
                `;
            }

            if (cell.cell_type === 'markdown') {
                cellEl.innerHTML = contentHtml;
            } else {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = contentHtml;
                while (wrapper.firstChild) {
                    cellEl.appendChild(wrapper.firstChild);
                }
            }
            notebookContainer.appendChild(cellEl);

            // --- 3. Build TOC ---
            if (headerText) {
                const tocItem = document.createElement('div');
                tocItem.className = `toc-item h${headerLevel}`;
                tocItem.onclick = () => {
                    const yOffset = -20;
                    const y = cellEl.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                };

                // Status Bubble
                const status = document.createElement('div');
                status.className = 'toc-status';
                status.id = `toc-status-${cell.id}`;

                const label = document.createElement('span');
                label.textContent = headerText;

                tocItem.appendChild(status);
                tocItem.appendChild(label);
                tocList.appendChild(tocItem);

                // Map this TOC item to the markdown cell ID
                tocItemsMap.set(cell.id, status);
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

            const marker = tocItemsMap.get(headerId);
            marker.className = 'toc-status'; // Reset

            if (codeIds.length > 0) {
                const allDone = codeIds.every(id => executedCellIds.has(id));
                const anyRunning = codeIds.some(id => {
                    const el = document.getElementById(`cell-${id}`);
                    return el && el.classList.contains('running');
                });

                if (anyRunning) {
                    marker.classList.add('running');
                } else if (allDone) {
                    marker.classList.add('completed');
                }
            } else {
                // Header with no code? Mark complete immediately for flow? 
                // Let's just mark it done.
                marker.classList.add('completed');
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
        const execCountEl = document.getElementById(`exec-count-${cellId}`);

        // TOC Running State
        const headerId = cellIdToHeaderMap.get(cellId);
        if (headerId && tocItemsMap.has(headerId)) {
            tocItemsMap.get(headerId).classList.add('running');
        }

        // State: Running
        cellEl.classList.add('running');
        execCountEl.textContent = '[*]';

        // Simulate Delay
        const delay = Math.floor(Math.random() * 700) + 800;
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
        }

        // State: Done
        cellEl.classList.remove('running');
        cellEl.classList.add('executed');

        // Update Exec Count
        const codeIdx = cellData.filter(c => c.cell_type === 'code').findIndex(c => c.id === cellId);
        execCountEl.textContent = `[${codeIdx + 1}]`;

        executedCellIds.add(cellId);

        // Note: updateCellLocks will handle clearing 'running' status on TOC 
        // and setting 'completed' if section is done.
    }

    runAllBtn.addEventListener('click', async () => {
        if (isRunningAll) return;
        isRunningAll = true;

        runAllBtn.disabled = true;
        resetBtn.disabled = true;
        runAllBtn.textContent = 'Running...';

        const codeCells = cellData.filter(c => c.cell_type === 'code');
        const total = codeCells.length;

        for (let i = 0; i < total; i++) {
            const cell = codeCells[i];
            const el = document.getElementById(`cell-${cell.id}`);
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });

            progressText.textContent = `Running ${i + 1}/${total}`;
            progressBar.style.width = `${((i) / total) * 100}%`;

            await executeCell(cell.id);
            updateCellLocks();

            progressBar.style.width = `${((i + 1) / total) * 100}%`;
        }

        isRunningAll = false;
        runAllBtn.disabled = false;
        resetBtn.disabled = false;
        runAllBtn.textContent = 'Run All Cells';
        progressText.textContent = 'Completed';
    });

    resetBtn.addEventListener('click', () => {
        // Clear outputs
        document.querySelectorAll('.output-area').forEach(el => {
            el.innerHTML = '';
            el.classList.remove('visible');
        });

        // Reset counts and set
        document.querySelectorAll('.exec-count').forEach(el => el.textContent = '[ ]');
        executedCellIds.clear();

        // Reset classes
        document.querySelectorAll('.cell').forEach(el => {
            el.classList.remove('executed');
            el.classList.remove('running');
        });

        // Reset TOC markers
        document.querySelectorAll('.toc-status').forEach(el => {
            el.classList.remove('completed');
            el.classList.remove('running');
        });

        // Reset progress
        progressBar.style.width = '0%';
        progressText.textContent = 'Ready';

        // Reset locks
        updateCellLocks();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});
