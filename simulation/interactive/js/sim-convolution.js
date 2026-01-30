document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const BLOCKS = [
        {
            id: 0,
            name: "Layer 0: Basic Features",
            inCh: 3, outCh: 64, k: 5, s: 1, p: 2,
            pool: 'none', act: 'relu',
            ops: ["Conv", "ReLU"],
            inDim: 32, outDim: 32,
            rf: 5, bias: 0.1
        },
        {
            id: 1,
            name: "Layer 1: Textures",
            inCh: 64, outCh: 119, k: 5, s: 1, p: 2,
            pool: 'avg', act: 'relu',
            ops: ["Conv", "ReLU", "Pool"],
            inDim: 32, outDim: 16,
            rf: 14, bias: -0.2
        },
        {
            id: 2,
            name: "Layer 2: Complex Patterns",
            inCh: 119, outCh: 221, k: 3, s: 1, p: 1,
            pool: 'none', act: 'relu',
            ops: ["Conv", "ReLU"],
            inDim: 16, outDim: 16,
            rf: 24, bias: 0.05
        },
        {
            id: 3,
            name: "Layer 3: Parts (Wheels)",
            inCh: 221, outCh: 256, k: 5, s: 1, p: 2,
            pool: 'avg', act: 'relu',
            ops: ["Conv", "ReLU", "Pool"],
            inDim: 16, outDim: 8,
            rf: 50, bias: 0.1
        },
        {
            id: 4,
            name: "Layer 4: Object Assembly",
            inCh: 256, outCh: 256, k: 3, s: 1, p: 1,
            pool: 'none', act: 'relu',
            ops: ["Conv", "ReLU"],
            inDim: 8, outDim: 8,
            rf: 80, bias: -0.1
        },
        {
            id: 5,
            name: "Layer 5: Semantic Objects",
            inCh: 256, outCh: 256, k: 5, s: 1, p: 2,
            pool: 'none', act: 'relu',
            ops: ["Conv", "ReLU"],
            inDim: 8, outDim: 8,
            rf: 120, bias: 0.2
        }
    ];

    // --- State ---
    const state = {
        currentBlock: 0,
        imageData: null,

        // Maps for *all* blocks. Key = blockId
        // inputMap: {}, outputMap: {}
        // We only really simulate the *Active* block fully for animation.
        // But for visual chain, others show static/placeholder output.
        // Simplified: Only active block is "Live". Others are static snapshots.

        inputMap: null,
        outputMap: null,

        isPlaying: false,
        cursorX: 0, cursorY: 0,
        stepDelay: 100,
        isDragging: false,
        params: { k: 5, s: 1, p: 2, ch: 64, pool: 'none', act: 'relu' }
    };

    // --- Elements ---
    const els = {
        visualChain: document.getElementById('visualChain'),
        layerTitle: document.getElementById('layerTitle'),
        theoryContent: document.getElementById('theoryContent'),
        ctrlBlockName: document.getElementById('ctrlBlockName'),

        // Dynamic Elements References (Active Block)
        activeInputCanvas: null,
        activeOutputCanvas: null,
        activeInputWrapper: null,
        activeReceptiveField: null,
        activeHighlighter: null,
        activeKernelGrid: null,

        // Math
        mathDetail: document.getElementById('mathDetail'),
        mathBiasVal: document.getElementById('mathBiasVal'),
        mathResVal: document.getElementById('mathResVal'),

        // Controls
        ctrlKernel: document.getElementById('ctrlKernel'),
        ctrlFilters: document.getElementById('ctrlFilters'),
        ctrlStride: document.getElementById('ctrlStride'),
        ctrlPad: document.getElementById('ctrlPad'),
        ctrlPool: document.getElementById('ctrlPool'),
        btnToggleAct: document.getElementById('btnToggleAct'),
        imageSelect: document.getElementById('imageSelect'),
        speedRange: document.getElementById('speedRange'),

        // Nav
        btnPlay: document.getElementById('btnPlay'),
        btnStep: document.getElementById('btnStep'),
        btnFinish: document.getElementById('btnFinish'),
        btnPrevBlock: document.getElementById('btnPrevBlock'),
        btnNextBlock: document.getElementById('btnNextBlock'),
        btnReset: document.getElementById('btnReset')
    };

    // --- Init ---
    init();

    function init() {
        initImageSelector();
        renderCompleteChainDOM(); // Generate all blocks
        setupEventListeners();
        focusBlock(0);
    }

    // --- DOM Generation ---
    function renderCompleteChainDOM() {
        els.visualChain.innerHTML = '';

        // 1. Global Input Source (The Image)
        // Added rf-global here
        const inputHTML = `
            <div class="tensor-view input-view static-input">
                <div class="tensor-label">Raw Input <span id="globalInDim">(32x32x3)</span></div>
                <div class="canvas-wrapper" id="wrapper-global">
                    <canvas id="globalInputCanvas" width="300" height="300"></canvas>
                    <div id="rf-global" class="highlight-box"></div>
                </div>
            </div>
            <div class="connector-arrow">➔</div>
        `;
        els.visualChain.insertAdjacentHTML('beforeend', inputHTML);

        // 2. Render each Block
        BLOCKS.forEach((block, idx) => {
            const blockHTML = `
                <div class="block-container" id="block-${idx}">
                    <!-- Kernel View -->
                    <div class="op-view">
                         <div class="kernel-display glass-panel">
                            <label>Layer ${idx} Filter</label>
                            <div class="kernel-preview" id="kernelGrid-${idx}"></div>
                        </div>
                        <div class="connector-arrow">➔</div>
                    </div>
                
                    <!-- Output/Next Input View -->
                    <div class="tensor-view output-view">
                        <div class="tensor-label">Map ${idx} <span id="outDim-${idx}">(${block.outDim}x${block.outDim})</span></div>
                        <div class="canvas-wrapper interactable stack-effect" id="wrapper-${idx}">
                            <canvas id="canvas-${idx}" width="300" height="300"></canvas>
                            <!-- This RF is for the NEXT block to use as input -->
                            <div id="rf-${idx}" class="highlight-box"></div>
                            <div id="hl-${idx}" class="highlight-pixel"></div>
                        </div>
                    </div>
                    
                    ${idx < BLOCKS.length - 1 ? '<div class="connector-arrow">➔</div>' : ''}
                </div>
            `;
            els.visualChain.insertAdjacentHTML('beforeend', blockHTML);
        });
    }

    function setupEventListeners() {
        els.btnPlay.addEventListener('click', togglePlay);
        els.btnStep.addEventListener('click', () => { if (!state.isPlaying) step(); });
        els.btnFinish.addEventListener('click', finishLayer);
        els.btnReset.addEventListener('click', () => {
            focusBlock(0);
        });

        els.btnPrevBlock.addEventListener('click', () => focusBlock(state.currentBlock - 1));
        els.btnNextBlock.addEventListener('click', () => focusBlock(state.currentBlock + 1));

        els.imageSelect.addEventListener('change', (e) => loadNewImage(e.target.value));

        els.speedRange.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            state.stepDelay = Math.max(0, 1000 - val);
        });

        // Params
        ['ctrlKernel', 'ctrlFilters', 'ctrlStride', 'ctrlPad'].forEach(id => {
            document.getElementById(id).addEventListener('change', updateParamsFromUI);
        });
        els.ctrlPool.addEventListener('change', updateParamsFromUI);
        els.btnToggleAct.addEventListener('click', toggleActivation);

        // Key Nav
        document.addEventListener('keydown', (e) => {
            if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault();
                moveCursorKey(e.key);
            }
        });

        window.addEventListener('mouseup', endDrag);
        window.addEventListener('mousemove', onDrag); // Fixed: Added Drag Listener
    }

    function initImageSelector() {
        els.imageSelect.innerHTML = '';
        Object.keys(IMAGES_DATA).forEach(key => {
            const opt = document.createElement('option');
            opt.value = key; opt.textContent = key;
            els.imageSelect.appendChild(opt);
        });
        if (Object.keys(IMAGES_DATA).length > 0) loadNewImage(Object.keys(IMAGES_DATA)[0]);
    }

    function loadNewImage(key) {
        const img = new Image();
        img.src = IMAGES_DATA[key];
        img.onload = () => {
            // Draw to Global Input
            const ctx = document.getElementById('globalInputCanvas').getContext('2d');
            const tmp = document.createElement('canvas'); tmp.width = 32; tmp.height = 32;
            const tctx = tmp.getContext('2d');
            tctx.drawImage(img, 0, 0, 32, 32);

            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, 300, 300);
            ctx.drawImage(tmp, 0, 0, 300, 300); // Upscale draw

            state.imageData = tctx.getImageData(0, 0, 32, 32).data;
            focusBlock(state.currentBlock, true);
        };
    }

    // --- Focus Logic ---
    function focusBlock(blockId, forceReload = false) {
        if (blockId < 0 || blockId >= BLOCKS.length) return;

        state.currentBlock = blockId;
        const config = BLOCKS[blockId];

        // Update References to Active DOM elements
        // Input Logic:
        // Layer 0 Input = Global Canvas. RF = rf-global.
        // Layer N Input = Layer N-1 Output Canvas. RF = rf-(N-1).

        let rfId;
        if (blockId === 0) {
            els.activeInputCanvas = document.getElementById('globalInputCanvas');
            rfId = 'rf-global';
        } else {
            els.activeInputCanvas = document.getElementById(`canvas-${blockId - 1}`);
            rfId = `rf-${blockId - 1}`;
        }

        els.activeOutputCanvas = document.getElementById(`canvas-${blockId}`);
        els.activeInputWrapper = els.activeInputCanvas.parentElement;

        els.activeHighlighter = document.getElementById(`hl-${blockId}`);
        els.activeKernelGrid = document.getElementById(`kernelGrid-${blockId}`);

        // Correct RF Selection
        document.querySelectorAll('.highlight-box').forEach(el => el.style.display = 'none'); // Hide all
        els.activeReceptiveField = document.getElementById(rfId);

        // Attach Interaction to the INPUT wrapper
        document.querySelectorAll('.canvas-wrapper').forEach(wrapper => {
            wrapper.onmousedown = null;
            wrapper.classList.remove('active-input');
        });
        els.activeInputWrapper.onmousedown = (e) => { state.isDragging = true; onDrag(e); };
        els.activeInputWrapper.classList.add('active-input');

        // Scroll Into View
        document.getElementById(`block-${blockId}`).scrollIntoView({ behavior: 'smooth', inline: 'center' });

        // Update UI Info
        els.layerTitle.textContent = config.name;
        els.ctrlBlockName.textContent = `Layer ${blockId}`;
        els.ctrlBlockName.className = `badge ${blockId % 2 === 0 ? 'badge-blue' : 'badge-purple'}`;

        // Params
        state.params = {
            k: config.k, s: config.s, p: config.p,
            ch: config.outCh, pool: config.pool, act: config.act
        };
        syncUIParams();
        renderTheory(config);
        renderKernelGridActive(config);

        // Nav Buttons
        els.btnPrevBlock.disabled = blockId === 0;
        els.btnNextBlock.disabled = blockId === BLOCKS.length - 1;

        // Prepare Data
        prepareInputMap(config);
        resetAnimation();
    }

    function prepareInputMap(config) {
        const size = config.inDim;

        if (config.id === 0) {
            state.inputMap = getGrayscaleData(state.imageData);
        } else {
            // Simulate Map
            const tempC = document.createElement('canvas');
            tempC.width = size; tempC.height = size;
            const ctx = tempC.getContext('2d');
            createPseudoFeatureMap(tempC, size, config.id);

            // Draw to Input Canvas (Prev Layer Output)
            const inCtx = els.activeInputCanvas.getContext('2d');
            inCtx.imageSmoothingEnabled = false;
            inCtx.clearRect(0, 0, 300, 300);
            inCtx.drawImage(tempC, 0, 0, 300, 300);

            const iData = ctx.getImageData(0, 0, size, size).data;
            state.inputMap = new Array(size).fill(0).map((_, y) =>
                new Array(size).fill(0).map((_, x) => iData[(y * size + x) * 4])
            );
        }
    }

    function createPseudoFeatureMap(canvas, size, depth) {
        const ctx = canvas.getContext('2d');
        const tmp = document.createElement('canvas'); tmp.width = 32; tmp.height = 32;
        const tCtx = tmp.getContext('2d');
        const d = tCtx.createImageData(32, 32);
        for (let i = 0; i < state.imageData.length; i++) d.data[i] = state.imageData[i];
        tCtx.putImageData(d, 0, 0);

        ctx.filter = `contrast(${100 + depth * 20}%) brightness(${100 + depth * 5}%) hue-rotate(${depth * 60}deg) grayscale(100%)`;
        if (depth > 1) ctx.filter += ` blur(${depth / 6}px)`;
        ctx.drawImage(tmp, 0, 0, size, size);
    }

    function getGrayscaleData(rgba) {
        const data = [];
        for (let y = 0; y < 32; y++) {
            const row = [];
            for (let x = 0; x < 32; x++) {
                const i = (y * 32 + x) * 4;
                row.push(0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]);
            }
            data.push(row);
        }
        return data;
    }

    // --- Core Logic ---
    function resetAnimation() {
        state.isPlaying = false;
        state.cursorX = 0;
        state.cursorY = 0;
        els.btnPlay.textContent = "▶ Play";

        const config = BLOCKS[state.currentBlock];
        // Calc Output Dim
        const I = config.inDim;
        const K = state.params.k;
        const P = state.params.p;
        const S = state.params.s;
        const outDim = Math.floor((I - K + 2 * P) / S + 1);
        state.curOutDim = outDim;

        // Clear Active Output Canvas
        const ctx = els.activeOutputCanvas.getContext('2d');
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 300, 300);

        state.outputMap = new Array(outDim).fill(0).map(() => new Array(outDim).fill(0));

        updateVisualsAtCursor();
    }

    function togglePlay() {
        state.isPlaying = !state.isPlaying;
        els.btnPlay.textContent = state.isPlaying ? "⏸ Pause" : "▶ Play";
        if (state.isPlaying) animate();
    }

    function animate() {
        if (!state.isPlaying) return;
        step();
        setTimeout(animate, state.stepDelay);
    }

    function step() {
        if (state.cursorY >= state.curOutDim) {
            state.isPlaying = false;
            els.btnPlay.textContent = "Finished";
            return;
        }
        performConvStep();
        state.cursorX++;
        if (state.cursorX >= state.curOutDim) {
            state.cursorX = 0; state.cursorY++;
        }
    }

    function performConvStep(isInteractive = false) {
        const val = calcConvValue(state.cursorX, state.cursorY);
        const ctx = els.activeOutputCanvas.getContext('2d');
        const scaleOut = 300 / state.curOutDim;
        const c = Math.floor(val);
        ctx.fillStyle = `rgb(${c},${c},${c})`;
        ctx.fillRect(state.cursorX * scaleOut, state.cursorY * scaleOut, scaleOut, scaleOut);

        updateVisualsAtCursor(val);
    }

    function calcConvValue(cx, cy) {
        const config = BLOCKS[state.currentBlock];
        const P = state.params.p;
        const S = state.params.s;
        const K = state.params.k;
        const startX = cx * S - P;
        const startY = cy * S - P;
        const inDim = config.inDim;

        let sum = 0;
        let details = [];

        for (let ky = 0; ky < K; ky++) {
            for (let kx = 0; kx < K; kx++) {
                const ix = startX + kx;
                const iy = startY + ky;
                let px = 0;
                if (ix >= 0 && ix < inDim && iy >= 0 && iy < inDim) {
                    px = state.inputMap[iy][ix];
                }
                const weight = (kx === Math.floor(K / 2) || ky === Math.floor(K / 2)) ? 1 : -0.1;
                sum += px * weight;

                // Collect ALL samples
                details.push(`(${Math.floor(px)}×${weight})`);
            }
        }
        const bias = config.bias * 255;
        sum += bias;
        if (state.params.act === 'relu') sum = Math.max(0, sum);

        state.currentMathDetails = details.join(' + '); // NO Truncation
        state.currentBias = bias.toFixed(1);

        return Math.max(0, Math.min(255, sum));
    }

    function updateVisualsAtCursor(val = 0) {
        const config = BLOCKS[state.currentBlock];
        const K = state.params.k;

        // Source Scaling (Input)
        const scaleIn = 300 / config.inDim;
        const startX = state.cursorX * state.params.s - state.params.p;
        const startY = state.cursorY * state.params.s - state.params.p;

        if (els.activeReceptiveField) {
            els.activeReceptiveField.style.display = 'block';
            els.activeReceptiveField.style.width = (K * scaleIn) + 'px';
            els.activeReceptiveField.style.height = (K * scaleIn) + 'px';
            els.activeReceptiveField.style.left = (startX * scaleIn) + 'px';
            els.activeReceptiveField.style.top = (startY * scaleIn) + 'px';
        }

        // Target Scaling (Output)
        const scaleOut = 300 / state.curOutDim;
        if (els.activeHighlighter) {
            els.activeHighlighter.style.display = 'block';
            els.activeHighlighter.style.width = scaleOut + 'px';
            els.activeHighlighter.style.height = scaleOut + 'px';
            els.activeHighlighter.style.left = (state.cursorX * scaleOut) + 'px';
            els.activeHighlighter.style.top = (state.cursorY * scaleOut) + 'px';
        }

        els.mathDetail.textContent = state.currentMathDetails || "Hover input to see full dot product...";
        els.mathBiasVal.textContent = state.currentBias || "0.0";
        els.mathResVal.textContent = val.toFixed(1);
    }

    // --- Interaction ---
    function endDrag() { state.isDragging = false; }

    function onDrag(e) {
        if (!state.isDragging) return;
        const rect = els.activeInputCanvas.getBoundingClientRect();
        const config = BLOCKS[state.currentBlock];
        const scale = 300 / config.inDim;

        let x = Math.floor((e.clientX - rect.left) / scale);
        let y = Math.floor((e.clientY - rect.top) / scale);

        const S = state.params.s;
        const outX = Math.floor(x / S);
        const outY = Math.floor(y / S);
        const max = state.curOutDim;

        if (outX >= 0 && outX < max && outY >= 0 && outY < max) {
            state.cursorX = outX; state.cursorY = outY;
            performConvStep(true);
        }
    }

    function moveCursorKey(key) {
        if (key === 'ArrowRight') state.cursorX++;
        if (key === 'ArrowLeft') state.cursorX--;
        if (key === 'ArrowDown') state.cursorY++;
        if (key === 'ArrowUp') state.cursorY--;
        const max = state.curOutDim;
        state.cursorX = Math.max(0, Math.min(max - 1, state.cursorX));
        state.cursorY = Math.max(0, Math.min(max - 1, state.cursorY));
        performConvStep(true);
    }

    function finishLayer() {
        state.isPlaying = false;
        els.btnPlay.textContent = "▶ Play";
        const max = state.curOutDim;
        const ctx = els.activeOutputCanvas.getContext('2d');
        const scale = 300 / max;
        for (let y = 0; y < max; y++) {
            for (let x = 0; x < max; x++) {
                const val = Math.floor(calcConvValue(x, y));
                ctx.fillStyle = `rgb(${val},${val},${val})`;
                ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
        state.cursorY = max;
    }

    // --- Helpers: Theory, Params ---
    function syncUIParams() {
        els.ctrlKernel.value = state.params.k;
        els.ctrlFilters.value = state.params.ch;
        els.ctrlStride.value = state.params.s;
        els.ctrlPad.value = state.params.p;
        els.ctrlPool.value = state.params.pool;
        els.btnToggleAct.textContent = state.params.act === 'relu' ? 'ReLU' : 'Linear';
        els.btnToggleAct.classList.toggle('active', state.params.act === 'relu');
    }
    function updateParamsFromUI() {
        state.params.k = parseInt(els.ctrlKernel.value);
        state.params.ch = parseInt(els.ctrlFilters.value);
        state.params.s = parseInt(els.ctrlStride.value);
        state.params.p = parseInt(els.ctrlPad.value);
        state.params.pool = els.ctrlPool.value;
        resetAnimation();
        // Update Grid
        const config = BLOCKS[state.currentBlock];
        // config.k is static, wait.
        // We are updating params which OVERRIDE config for this sim session? Yes.
        renderKernelGridActive({ ...config, k: state.params.k });
    }
    function toggleActivation() {
        state.params.act = state.params.act === 'relu' ? 'linear' : 'relu';
        syncUIParams(); resetAnimation();
    }

    function renderKernelGridActive(config) {
        if (!els.activeKernelGrid) return;
        const k = config.k;
        els.activeKernelGrid.style.gridTemplateColumns = `repeat(${k}, 1fr)`;
        els.activeKernelGrid.innerHTML = '';
        for (let i = 0; i < k * k; i++) {
            const cell = document.createElement('div');
            cell.className = 'k-cell';
            const w = (Math.random() * 2 - 1).toFixed(1);
            cell.textContent = w;
            els.activeKernelGrid.appendChild(cell);
        }
    }

    function renderTheory(config) {
        const rf = config.rf * 3;

        // Specific explanations for each layer role
        const explanations = [
            "This first layer detects **simple edges and colors**. It looks at raw pixels and finds boundaries, like the outline of the car body against the background.",
            "Now we combine edges to find **textures and curves**. This layer might respond to the metallic texture of the wheel or the curve of the windshield.",
            "Features become more complex. We start seeing **geometric patterns**—circles, corners, and stripes that form parts of the object.",
            "Here we identify specific **object parts**. This layer clearly distinguishes wheels, windows, and headlights from the rest of the image.",
            "We are assembling parts into **entire objects**. The network now understands 'Car' vs 'Not Car' by checking if wheels + windows + body are in the right place.",
            "The final semantic layer. It represents the **abstract concept** of the object, invariant to position or lighting. This output feeds into the final classifier."
        ];

        let html = `
            <h2>Intuitive Understanding</h2>
            <div class="theory-section intro">
                <p>A **convolutional layer** scans small windows over an input, asking: <em>“Does this local pattern look like what I care about?”</em></p>
                <div class="theory-specific-block" style="margin-top: 15px; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border-left: 3px solid #60a5fa;">
                    <h4 style="margin-top:0; color:#cbd5e1;">Layer Role: ${config.name.split(':')[1] || 'Feature Extraction'}</h4>
                    <p>${explanations[config.id] || "Extracting features..."}</p>
                </div>
                <br>
                <ul>
                    <li><strong>Filters:</strong> Reusable pattern detectors (edges, textures) applied everywhere.</li>
                    <li><strong>Response:</strong> Output strength shows how well the patch matches the filter.</li>
                    <li><strong>Pooling:</strong> Reduces detail (downsampling) to make features robust to small shifts.</li>
                </ul>
                <p class="highlight-text">In short: Convolution = Sliding shared detectors turning local patterns into features.</p>
            </div>
            
            <div class="theory-section specific">
                <h3>Current Block: ${config.name}</h3>
                <div class="diffusion-meter">
                     <label>Global Analysis (Receptive Field)</label>
                     <div class="meter-bar"><div class="fill" style="width: ${Math.min(100, rf)}%"></div></div>
                     <span>${config.rf}px Coverage</span>
                </div>
            </div>
        `;
        // Apply Bold Formatting
        els.theoryContent.innerHTML = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

});
