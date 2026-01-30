/**
 * Simulation 3: Dense & Classifier
 * Modified for unified page with unique element IDs
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- State & Config ---
    const STATE = {
        inputSize: 256, // Fixed by GAP
        outputSize: 10, // CIFAR-10
        hiddenLayers: [], // Array of integers e.g. [12, 12]
        dropoutRate: 0.38,
        mode: 'pretrained',
        activation: 'relu', // relu, sigmoid, tanh
        activations: {}, // Per-layer activation values
        currentInputType: 'car'
    };

    // Use unique IDs for sim3
    const ELS = {
        visual: document.getElementById('fcVisual'),
        paramBadge: document.getElementById('paramCountBadge'),
        btnPredict: document.getElementById('btnPredict'),
        classSelect: document.getElementById('classSelect3'),
        btnAddLayer: document.getElementById('btnAddLayer'),
        btnRemLayer: document.getElementById('btnRemLayer'),
        sliderNeurons: document.getElementById('sldNeurons'),
        labelNeurons: document.getElementById('valNeurons'),
        sliderDropout: document.getElementById('sldDropout'),
        labelDropout: document.getElementById('valDropout'),
        btnInitRandom: document.getElementById('btnInitRandom'),
        btnPreTrained: document.getElementById('btnPreTrained'),
    };

    // Check if elements exist (for unified page support)
    if (!ELS.visual || !ELS.btnPredict) {
        console.log('Sim3: Elements not found, skipping initialization');
        return;
    }

    let chartInstance = null;
    const CLASSES = ["Plane", "Car", "Bird", "Cat", "Deer", "Dog", "Frog", "Horse", "Ship", "Truck"];

    // --- Init ---
    init();

    function init() {
        setupEvents();
        createSoftmaxChart();
        updateArchitecture(); // Render initial state

        // Auto-redraw connections when tab becomes visible or container resizes
        const observer = new ResizeObserver(() => {
            setTimeout(drawLines, 100);
        });
        observer.observe(ELS.visual);

        // Also redraw when sim3 tab is clicked
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.tab === 'sim3') {
                    setTimeout(drawLines, 200);
                }
            });
        });

        // Initial draw with delay for DOM to settle
        setTimeout(drawLines, 500);
    }

    function setupEvents() {
        // Architecture
        ELS.btnAddLayer.addEventListener('click', () => {
            if (STATE.hiddenLayers.length < 3) {
                STATE.hiddenLayers.push(parseInt(ELS.sliderNeurons.value));
                updateArchitecture();
            }
        });

        ELS.btnRemLayer.addEventListener('click', () => {
            if (STATE.hiddenLayers.length > 0) {
                STATE.hiddenLayers.pop();
                updateArchitecture();
            }
        });

        // Sliders
        ELS.sliderNeurons.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            ELS.labelNeurons.textContent = val;
            if (STATE.hiddenLayers.length > 0) {
                for (let i = 0; i < STATE.hiddenLayers.length; i++) STATE.hiddenLayers[i] = val;
                updateArchitecture();
            }
        });

        ELS.sliderDropout.addEventListener('input', (e) => {
            STATE.dropoutRate = parseFloat(e.target.value);
            ELS.labelDropout.textContent = STATE.dropoutRate;
        });

        // Prediction
        ELS.btnPredict.addEventListener('click', runForwardPack);
        ELS.classSelect.addEventListener('change', (e) => STATE.currentInputType = e.target.value);
    }

    // --- Core Architecture Rendering ---
    function updateArchitecture() {
        // 1. Calculate Params
        updateParamCount();

        // 2. Generate DOM Columns
        ELS.visual.innerHTML = '';
        const svgs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgs.setAttribute('class', 'connections-svg');
        svgs.setAttribute('id', 'connSvg3');
        ELS.visual.appendChild(svgs);

        // Input Column (GAP)
        createColumn('GAP (256)', 256, 'input3');

        // Hidden Layers
        STATE.hiddenLayers.forEach((size, idx) => {
            createColumn(`Hidden ${idx + 1}`, size, `hidden3-${idx}`);
        });

        // Output Column
        createColumn('Logits (10)', STATE.outputSize, 'output3');

        // Chart Container
        const chartDiv = document.createElement('div');
        chartDiv.className = 'chart-container';
        chartDiv.style.cssText = 'width: 300px; height: 350px; flex-shrink: 0;';
        chartDiv.innerHTML = '<canvas id="softmaxChart3"></canvas>';
        ELS.visual.appendChild(chartDiv);

        // Re-init chart canvas since we destroyed it
        createSoftmaxChart();

        // 3. Draw Lines (Static initially)
        setTimeout(drawLines, 50);
    }

    function createColumn(label, count, id) {
        const col = document.createElement('div');
        col.className = 'layer-column';
        col.id = `col-${id}`;

        const lbl = document.createElement('div');
        lbl.className = 'layer-label';
        lbl.textContent = label;
        col.appendChild(lbl);

        // Optimization: For Input (256), use a specific container ID for CSS Grid
        if (id === 'input3') {
            const grid = document.createElement('div');
            grid.id = 'col-input';
            for (let i = 0; i < count; i++) {
                const n = document.createElement('div');
                n.className = 'node';
                n.id = `node-${id}-${i}`;
                grid.appendChild(n);
            }
            col.appendChild(grid);
        } else {
            // Standard Flex Column
            for (let i = 0; i < count; i++) {
                const n = document.createElement('div');
                n.className = 'node';
                n.id = `node-${id}-${i}`;
                col.appendChild(n);
            }
        }
        ELS.visual.appendChild(col);
    }

    function updateParamCount() {
        let total = 0;
        let prevSize = STATE.inputSize;

        // Input -> H1 -> H2 ... -> Output
        [...STATE.hiddenLayers, STATE.outputSize].forEach(size => {
            // Weights + Biases
            total += (prevSize * size) + size;
            prevSize = size;
        });

        ELS.paramBadge.textContent = `Params: ${total.toLocaleString()}`;
    }

    // --- Visualization: Lines ---
    function drawLines() {
        const svg = document.getElementById('connSvg3');
        if (!svg) return;

        // Check if container is visible (has dimensions)
        const visualRect = ELS.visual.getBoundingClientRect();
        if (visualRect.width === 0 || visualRect.height === 0) {
            // Container not visible yet, retry later
            setTimeout(drawLines, 200);
            return;
        }

        svg.innerHTML = '';

        // Store layer IDs in order
        const layers = ['input3'];
        STATE.hiddenLayers.forEach((_, i) => layers.push(`hidden3-${i}`));
        layers.push('output3');

        // Connect adjacent layers
        for (let i = 0; i < layers.length - 1; i++) {
            const src = layers[i];
            const dst = layers[i + 1];

            // Limit visualizations for massive layers (Input -> Hidden)
            const srcCount = src === 'input3' ? 256 : (src === 'output3' ? 10 : STATE.hiddenLayers[parseInt(src.split('-')[1])]);
            const dstCount = dst === 'output3' ? 10 : STATE.hiddenLayers[parseInt(dst.split('-')[1])];

            connectLayers(src, dst, srcCount, dstCount, svg, visualRect);
        }
    }

    function connectLayers(srcId, dstId, srcCount, dstCount, svg, visualRect) {
        // Sampling for Input layer - reduced from 10 to 4 for more visible connections
        const step = srcId === 'input3' ? 4 : 1;

        for (let i = 0; i < srcCount; i += step) {
            const n1 = document.getElementById(`node-${srcId}-${i}`);
            if (!n1) continue;
            const r1 = n1.getBoundingClientRect();

            // Skip if node has no dimensions (hidden)
            if (r1.width === 0) continue;

            const x1 = r1.left + r1.width / 2 - visualRect.left + ELS.visual.scrollLeft;
            const y1 = r1.top + r1.height / 2 - visualRect.top;

            for (let j = 0; j < dstCount; j++) {
                const n2 = document.getElementById(`node-${dstId}-${j}`);
                if (!n2) continue;
                const r2 = n2.getBoundingClientRect();

                // Skip if node has no dimensions (hidden)
                if (r2.width === 0) continue;

                const x2 = r2.left + r2.width / 2 - visualRect.left + ELS.visual.scrollLeft;
                const y2 = r2.top + r2.height / 2 - visualRect.top;

                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute('x1', x1);
                line.setAttribute('y1', y1);
                line.setAttribute('x2', x2);
                line.setAttribute('y2', y2);
                line.setAttribute('class', 'connection');
                // Store indices for activation logic
                line.id = `line3-${srcId}-${i}-${dstId}-${j}`;
                svg.appendChild(line);
            }
        }
    }

    // --- Runtime Logic ---
    function runForwardPack() {
        resetVisuals();

        // 1. Input Generation
        const inputs = generateInput(STATE.currentInputType);
        animateLayer('input3', inputs);

        let currentActivations = inputs;
        let prevId = 'input3';

        // 2. Hidden Layers
        STATE.hiddenLayers.forEach((size, idx) => {
            const nextId = `hidden3-${idx}`;
            const mask = createDropoutMask(size, STATE.dropoutRate);

            // Just noise processing
            const nextActs = fakeLinearLayer(currentActivations, size).map((v, i) => Math.max(0, v) * mask[i]);

            animateLines(prevId, nextId, currentActivations, nextActs);
            animateLayer(nextId, nextActs, mask);

            currentActivations = nextActs;
            prevId = nextId;
        });

        // 3. Output - CHEAT for Visual Clarity if Pretrained
        let logits = fakeLinearLayer(currentActivations, 10);

        if (STATE.mode === 'pretrained') {
            // Boost the target class significantly
            const targetIdx = getTargetIndex(STATE.currentInputType);
            if (targetIdx !== -1) {
                logits[targetIdx] += 10.0; // Huge boost
                // Dampen others
                logits = logits.map((v, i) => i === targetIdx ? v : v - 2.0);
            }
        }

        animateLines(prevId, 'output3', currentActivations, logits);
        animateLayer('output3', logits);

        // 4. Softmax
        const probs = softmax(logits);
        updateChart(probs, getTargetIndex(STATE.currentInputType));
    }

    function getTargetIndex(type) {
        // "Plane", "Car", "Bird", "Cat", "Deer", "Dog", "Frog", "Horse", "Ship", "Truck"
        if (type === 'car') return 1;
        if (type === 'dog') return 5;
        if (type === 'plane') return 0;
        return -1; // Noise
    }

    function createDropoutMask(size, rate) {
        return new Array(size).fill(0).map(() => Math.random() > rate ? 1 : 0);
    }

    function animateLayer(id, values, mask = null) {
        // Light up nodes
        const max = Math.max(...values, 0.1);
        values.forEach((v, i) => {
            const el = document.getElementById(`node-${id}-${i}`);
            if (!el) return;

            // Dropout visual
            if (mask && mask[i] === 0) {
                el.classList.add('dropout');
                return;
            } else {
                el.classList.remove('dropout');
            }

            if (v > max * 0.2) {
                el.classList.add('active');
                el.style.backgroundColor = `rgba(59, 130, 246, ${v / max})`; // Blue for white theme
            } else {
                el.classList.remove('active');
                el.style.backgroundColor = '';
            }
        });
    }

    function animateLines(srcId, dstId, srcVals, dstVals) {
        // Highlight logic path
        const srcCount = srcVals.length;
        const dstCount = dstVals.length;

        // Thresholds
        const srcMax = Math.max(...srcVals, 0.1);
        const dstMax = Math.max(...dstVals, 0.1);

        for (let i = 0; i < srcCount; i += (srcId === 'input3' ? 4 : 1)) {
            if (srcVals[i] < srcMax * 0.3) continue; // Prune weak inputs

            for (let j = 0; j < dstCount; j++) {
                if (dstVals[j] < dstMax * 0.3) continue; // Prune weak outputs

                // If both ends active, light up connection
                const line = document.getElementById(`line3-${srcId}-${i}-${dstId}-${j}`);
                if (line) {
                    // Random polarity for visual effect (Pink/Cyan)
                    const isPos = (i + j) % 2 === 0;
                    line.classList.add(isPos ? 'active-pos' : 'active-neg');
                    line.style.opacity = (srcVals[i] / srcMax) * (dstVals[j] / dstMax);
                }
            }
        }
    }

    function resetVisuals() {
        document.querySelectorAll('#sim3 .active').forEach(e => e.classList.remove('active'));
        document.querySelectorAll('#sim3 .active-pos').forEach(e => e.classList.remove('active-pos'));
        document.querySelectorAll('#sim3 .active-neg').forEach(e => e.classList.remove('active-neg'));
        document.querySelectorAll('#sim3 .dropout').forEach(e => e.classList.remove('dropout'));
    }

    // --- Math Helpers ---
    function generateInput(type) {
        // 256 fake features
        let arr = new Array(256).fill(0).map(() => Math.random() * 0.1);

        // Inject patterns
        if (type === 'car') {
            for (let i = 0; i < 50; i++) arr[i] += Math.random();
        } else if (type === 'frog') {
            for (let i = 100; i < 150; i++) arr[i] += Math.random();
        }
        return arr;
    }

    function fakeLinearLayer(input, outSize) {
        // Fake matrix mul: Just produce consistent noise that changes based on input
        let out = [];
        for (let j = 0; j < outSize; j++) {
            // Simple hash of input
            let sum = input.reduce((a, b, idx) => a + (idx % 3 === 0 ? b : -b * 0.5), 0);
            // Add bias
            sum += (j * 0.1);
            out.push(sum);
        }
        return out;
    }

    function softmax(arr) {
        const exps = arr.map(x => Math.exp(x));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(x => x / sum);
    }

    function createSoftmaxChart() {
        const ctx = document.getElementById('softmaxChart3');
        if (!ctx) return;

        // Destroy existing chart if any
        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: CLASSES,
                datasets: [{
                    label: 'Probability',
                    data: new Array(10).fill(0),
                    backgroundColor: (ctx) => {
                        const val = ctx.raw;
                        return val > 0.5 ? '#10b981' : '#3b82f6'; // Green for high, Blue for low
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1.0,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { color: '#64748b' }
                    },
                    x: {
                        ticks: { color: '#64748b', font: { size: 8 } },
                        grid: { display: false }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function updateChart(probs, targetIdx) {
        if (!chartInstance) return;
        chartInstance.data.datasets[0].data = probs;
        // Force color update
        chartInstance.update();
    }
});
