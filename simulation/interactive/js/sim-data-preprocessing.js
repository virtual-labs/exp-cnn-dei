document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration & State ---
    const IMAGES = Object.keys(IMAGES_DATA).sort();

    let state = {
        selectedImage: null,
        normalize: false,
        // CIFAR-10 stats as requested
        mean: [0.491 * 255, 0.482 * 255, 0.447 * 255],
        std: [0.202 * 255, 0.199 * 255, 0.201 * 255],
        // Active Augmentations (Set for simple toggles, or Objects for params)
        // For this demo, we'll implement them as toggleable flags for simplicity 
        // or randomized parameters when clicked.
        augmentations: {
            flipH: false,
            flipV: false,
            crop: false, // Random crop padding 4px then crop back to 32
            shearX: 0, // degrees
            shearY: 0,
            rotate: 0, // degrees
            translate: { x: 0, y: 0 },
            contrast: 1.0,
            brightness: 0.0,
            autoContrast: false,
            invert: false,
            equalize: false,
            solarize: false, // threshold 128
            posterize: false // bits 4
        },
        locked: false,
        lockedCoords: { x: 0, y: 0 }
    };

    // --- DOM Elements ---
    const elements = {
        imageGrid: document.getElementById('imageGrid'),
        classSelect: document.getElementById('classSelect'),
        originalCanvas: document.getElementById('originalCanvas'),
        processedCanvas: document.getElementById('processedCanvas'),
        statsTableBody: document.querySelector('#statsTable tbody'),
        normalizeCheck: document.getElementById('normalizeCheck'),
        normInputs: document.getElementById('normInputs'),
        meanInput: document.getElementById('meanInput'),
        stdInput: document.getElementById('stdInput'),
        augButtons: document.querySelectorAll('.aug-btn'),
        btnReset: document.getElementById('btnResetAug'),
        inputGuide: document.getElementById('inputGuide'),
        outputGuide: document.getElementById('outputGuide'),
        inputPixelInfo: document.getElementById('inputPixelInfo'),
        outputPixelInfo: document.getElementById('outputPixelInfo'),
        canvasStage: document.querySelector('.canvas-stage')
    };

    let histogramChart = null;

    // --- Initialization ---
    initializeGrid();
    initChart();

    // Default load
    setTimeout(() => {
        const firstImg = elements.imageGrid.querySelector('img');
        if (firstImg) selectImage(firstImg);
    }, 100);

    // --- Event Listeners ---
    elements.classSelect.addEventListener('change', (e) => filterGrid(e.target.value));

    elements.normalizeCheck.addEventListener('change', (e) => {
        state.normalize = e.target.checked;
        elements.normInputs.classList.toggle('active', state.normalize);
        processAndRender();
    });

    // Inputs for Mean/Std
    if (elements.meanInput) elements.meanInput.addEventListener('change', parseMathInputs);
    if (elements.stdInput) elements.stdInput.addEventListener('change', parseMathInputs);

    elements.augButtons.forEach(btn => {
        btn.addEventListener('click', () => toggleAugmentation(btn));
    });

    elements.btnReset.addEventListener('click', resetAugmentations);

    // Synced Hover & Lock
    setupInteractions(elements.originalCanvas);
    setupInteractions(elements.processedCanvas);

    // --- Logic ---
    function parseMathInputs() {
        try {
            state.mean = elements.meanInput.value.split(',').map(n => parseFloat(n));
            state.std = elements.stdInput.value.split(',').map(n => parseFloat(n));
            processAndRender();
        } catch (e) { console.error("Invalid Math Input"); }
    }

    function initializeGrid() {
        elements.imageGrid.innerHTML = '';
        IMAGES.forEach(filename => {
            const img = document.createElement('img');
            img.src = IMAGES_DATA[filename];
            img.dataset.class = filename.split('_')[0];
            img.addEventListener('click', () => {
                state.locked = false; // Unlock on new image
                updateLockVisuals();
                selectImage(img);
            });
            elements.imageGrid.appendChild(img);
        });
    }

    function filterGrid(className) {
        const imgs = elements.imageGrid.querySelectorAll('img');
        imgs.forEach(img => {
            img.style.display = (className === 'all' || img.dataset.class === className) ? 'block' : 'none';
        });
    }

    function selectImage(imgElement) {
        document.querySelectorAll('.image-grid img').forEach(img => img.classList.remove('active'));
        imgElement.classList.add('active');
        state.selectedImage = imgElement;

        const draw = () => {
            const ctx = elements.originalCanvas.getContext('2d');
            ctx.clearRect(0, 0, 32, 32);
            ctx.drawImage(imgElement, 0, 0, 32, 32);
            processAndRender();
        };

        if (imgElement.complete && imgElement.naturalHeight !== 0) draw();
        else imgElement.onload = draw;
    }

    function toggleAugmentation(btn) {
        const type = btn.dataset.aug;
        btn.classList.toggle('active');
        const isActive = btn.classList.contains('active');

        // Logic for "Random" params when activated
        switch (type) {
            case 'flipH': state.augmentations.flipH = isActive; break;
            case 'flipV': state.augmentations.flipV = isActive; break;
            case 'crop': state.augmentations.crop = isActive; break;
            case 'shearX': state.augmentations.shearX = isActive ? (Math.random() * 30 - 15) : 0; break;
            case 'shearY': state.augmentations.shearY = isActive ? (Math.random() * 30 - 15) : 0; break;
            case 'rotate': state.augmentations.rotate = isActive ? (Math.random() * 60 - 30) : 0; break;
            case 'translate': state.augmentations.translate = isActive ? { x: Math.random() * 10 - 5, y: Math.random() * 10 - 5 } : { x: 0, y: 0 }; break;
            case 'contrast': state.augmentations.contrast = isActive ? (0.5 + Math.random()) : 1.0; break;
            case 'brightness': state.augmentations.brightness = isActive ? (Math.random() * 0.4 - 0.2) : 0.0; break;
            case 'autoContrast': state.augmentations.autoContrast = isActive; break;
            case 'invert': state.augmentations.invert = isActive; break;
            case 'equalize': state.augmentations.equalize = isActive; break;
            case 'solarize': state.augmentations.solarize = isActive; break;
            case 'posterize': state.augmentations.posterize = isActive; break;
        }
        processAndRender();
    }

    function resetAugmentations() {
        elements.augButtons.forEach(btn => btn.classList.remove('active'));
        state.augmentations = {
            flipH: false, flipV: false, crop: false, shearX: 0, shearY: 0,
            rotate: 0, translate: { x: 0, y: 0 }, contrast: 1.0, brightness: 0.0,
            autoContrast: false, invert: false, equalize: false, solarize: false, posterize: false
        };
        processAndRender();
    }

    function processAndRender() {
        if (!state.selectedImage) return;

        try {
            // Source Data
            const ctxOrig = elements.originalCanvas.getContext('2d');
            const srcData = ctxOrig.getImageData(0, 0, 32, 32);

            // Helper to get pixel from source (Nearest Neighbor for simple geometric transforms)
            const getPixel = (x, y, d = srcData.data) => {
                if (x < 0 || x >= 32 || y < 0 || y >= 32) return [0, 0, 0, 0]; // Zero padding
                const i = (Math.floor(y) * 32 + Math.floor(x)) * 4;
                return [d[i], d[i + 1], d[i + 2], d[i + 3]];
            };

            // Destination Buffer
            const destData = new Uint8ClampedArray(32 * 32 * 4);

            // 1. Geometric Transforms Loop
            // To support Shear/Rotate correctly, we map Destination(x,y) -> Source(x',y') (Inverse Mapping)

            const cx = 16, cy = 16; // Center
            const rad = state.augmentations.rotate * Math.PI / 180;
            const shX = state.augmentations.shearX * Math.PI / 180;
            const shY = state.augmentations.shearY * Math.PI / 180;
            const tx = state.augmentations.translate.x;
            const ty = state.augmentations.translate.y;

            for (let y = 0; y < 32; y++) {
                for (let x = 0; x < 32; x++) {
                    let dx = x - cx; // Dest coords relative to center
                    let dy = y - cy;

                    // Inverse Transformations (applied in reverse order of operation)
                    // 1. Un-Translate
                    dx -= tx; dy -= ty;

                    // 2. Un-Rotate
                    let rx = dx * Math.cos(-rad) - dy * Math.sin(-rad);
                    let ry = dx * Math.sin(-rad) + dy * Math.cos(-rad);

                    // 3. Un-Shear
                    // x' = x - y*tan(shX)
                    // y' = y - x*tan(shY)
                    // Simplified: just apply linearly
                    let sx = rx - ry * Math.tan(shX);
                    let sy = ry - rx * Math.tan(shY);

                    // 4. Map back to Source Index
                    let srcX = sx + cx;
                    let srcY = sy + cy;

                    // 5. Flip/Crop (Geometric)
                    if (state.augmentations.flipH) srcX = 32 - srcX - 1;
                    if (state.augmentations.flipV) srcY = 32 - srcY - 1;
                    if (state.augmentations.crop) {
                        // Simulating random crop: zoom in slightly (scale) + random shift
                        // We'll just zoom 1.2x for "crop" effect here
                        srcX = (srcX - 16) / 1.2 + 16;
                        srcY = (srcY - 16) / 1.2 + 16;
                    }

                    // Sample
                    const p = getPixel(srcX, srcY);

                    const dstIdx = (y * 32 + x) * 4;
                    destData[dstIdx] = p[0];
                    destData[dstIdx + 1] = p[1];
                    destData[dstIdx + 2] = p[2];
                    destData[dstIdx + 3] = 255; // Force Alpha
                }
            }

            // 2. Pixel Transormations (In-place)
            // Color Ops
            for (let i = 0; i < destData.length; i += 4) {
                let r = destData[i], g = destData[i + 1], b = destData[i + 2];

                // Brightness
                if (state.augmentations.brightness !== 0) {
                    const f = 1 + state.augmentations.brightness;
                    r *= f; g *= f; b *= f;
                }

                // Contrast
                if (state.augmentations.contrast !== 1.0) {
                    r = (r - 128) * state.augmentations.contrast + 128;
                    g = (g - 128) * state.augmentations.contrast + 128;
                    b = (b - 128) * state.augmentations.contrast + 128;
                }

                // Invert
                if (state.augmentations.invert) { r = 255 - r; g = 255 - g; b = 255 - b; }

                // Solarize
                if (state.augmentations.solarize) {
                    r = r > 128 ? 255 - r : r; g = g > 128 ? 255 - g : g; b = b > 128 ? 255 - b : b;
                }

                // Posterize
                if (state.augmentations.posterize) { r = r & 0xF0; g = g & 0xF0; b = b & 0xF0; }

                destData[i] = clamp(r); destData[i + 1] = clamp(g); destData[i + 2] = clamp(b);
            }

            // AutoContrast / Equalize (Global Ops)
            if (state.augmentations.autoContrast) applyAutoContrast(destData);
            if (state.augmentations.equalize) applyEqualize(destData);

            // 3. Render
            const ctxProc = elements.processedCanvas.getContext('2d');
            const finalImage = new ImageData(destData, 32, 32);
            ctxProc.putImageData(finalImage, 0, 0);

            // 4. Stats & Histogram (Logic includes Norm if enabled)
            calculateStatsAndHist(destData);

            // If locked, update pixel info for the locked coordinates
            if (state.locked) {
                highlightPixel(state.lockedCoords.x, state.lockedCoords.y);
            }

        } catch (e) { console.error(e); }
    }

    function clamp(v) { return Math.max(0, Math.min(255, v)); }

    function applyAutoContrast(data) {
        let min = 255, max = 0;
        for (let i = 0; i < data.length; i += 4) { const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; if (l < min) min = l; if (l > max) max = l; }
        if (max === min) return;
        for (let i = 0; i < data.length; i += 4) { for (let j = 0; j < 3; j++) data[i + j] = (data[i + j] - min) * (255 / (max - min)); }
    }

    function applyEqualize(data) {
        // Simple Histogram Equalization on Luminance
        // 1. Hist
        const hist = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            const l = Math.floor(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            hist[l]++;
        }
        // 2. CDF
        const cdf = new Array(256).fill(0); let sum = 0;
        for (let i = 0; i < 256; i++) { sum += hist[i]; cdf[i] = sum; }
        // 3. Map
        const total = 32 * 32;
        for (let i = 0; i < data.length; i += 4) {
            for (let j = 0; j < 3; j++) { // Apply eq to all channels independently or lum?
                // Usually applied to V in HSV. Here we'll just eq each channel for dramatic effect.
                // Or use the lum map for all. Let's use lum map for color preservation.
                const val = data[i + j];
                data[i + j] = Math.floor((cdf[Math.floor(val)] / total) * 255);
            }
        }
    }

    function calculateStatsAndHist(visualData) {
        // Use floats for verification if Norm is ON
        let stats = {
            r: { min: 999, max: -999, sum: 0 },
            g: { min: 999, max: -999, sum: 0 },
            b: { min: 999, max: -999, sum: 0 }
        };

        let displayData = { r: [], g: [], b: [] }; // For hist

        for (let i = 0; i < visualData.length; i += 4) {
            let r = visualData[i], g = visualData[i + 1], b = visualData[i + 2];

            if (state.normalize) {
                r = (r - state.mean[0]) / state.std[0];
                g = (g - state.mean[1]) / state.std[1];
                b = (b - state.mean[2]) / state.std[2];
            }

            updateStat(stats.r, r);
            updateStat(stats.g, g);
            updateStat(stats.b, b);

            // For Hist: bucketize. If Norm, range -3 to 3. If not, 0-255.
            displayData.r.push(r);
            displayData.g.push(g);
            displayData.b.push(b);
        }

        updateStatsTable(stats);
        updateChart(displayData);
    }

    function updateStat(obj, v) {
        if (v < obj.min) obj.min = v;
        if (v > obj.max) obj.max = v;
        obj.sum += v;
    }

    function updateStatsTable(stats) {
        const fmt = n => n.toFixed(2);
        const count = 32 * 32;
        const html = `
            <tr><td style="color:#ef4444">R</td><td>${fmt(stats.r.min)}</td><td>${fmt(stats.r.max)}</td><td>${fmt(stats.r.sum / count)}</td></tr>
            <tr><td style="color:#22c55e">G</td><td>${fmt(stats.g.min)}</td><td>${fmt(stats.g.max)}</td><td>${fmt(stats.g.sum / count)}</td></tr>
            <tr><td style="color:#3b82f6">B</td><td>${fmt(stats.b.min)}</td><td>${fmt(stats.b.max)}</td><td>${fmt(stats.b.sum / count)}</td></tr>
        `;
        elements.statsTableBody.innerHTML = html;
    }

    // --- Interaction Logic (Hover & Lock) ---
    function setupInteractions(canvas) {
        canvas.addEventListener('mousemove', (e) => handleMove(e, canvas));
        canvas.addEventListener('mouseleave', handleLeave);
        canvas.addEventListener('click', (e) => handleClick(e, canvas));
    }

    function handleMove(e, canvas) {
        if (state.locked) return; // Don't update if locked

        const coords = getCoords(e, canvas);
        if (coords) highlightPixel(coords.x, coords.y);
    }

    function handleClick(e, canvas) {
        const coords = getCoords(e, canvas);
        if (!coords) return;

        state.locked = !state.locked;
        if (state.locked) {
            state.lockedCoords = coords;
            highlightPixel(coords.x, coords.y); // Ensure updated
        }
        updateLockVisuals();
    }

    function handleLeave() {
        if (state.locked) return;
        elements.inputGuide.style.display = 'none';
        elements.outputGuide.style.display = 'none';
        elements.inputPixelInfo.innerText = 'Hover input...';
        elements.outputPixelInfo.innerText = 'Hover output...';
    }

    function getCoords(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scale = 360 / 32; // Updated scale for 360px
        const x = Math.floor((e.clientX - rect.left) / scale);
        const y = Math.floor((e.clientY - rect.top) / scale);
        if (x >= 0 && x < 32 && y >= 0 && y < 32) return { x, y };
        return null;
    }

    function updateLockVisuals() {
        const containers = document.querySelectorAll('.canvas-container');
        containers.forEach(c => c.classList.toggle('locked', state.locked));
    }

    function highlightPixel(x, y) {
        // Position Guides
        const scale = 360 / 32;
        const top = y * scale;
        const left = x * scale;

        elements.inputGuide.style.display = 'block';
        elements.inputGuide.style.top = top + 'px';
        elements.inputGuide.style.left = left + 'px';

        elements.outputGuide.style.display = 'block';
        elements.outputGuide.style.top = top + 'px';
        elements.outputGuide.style.left = left + 'px';

        // Get Values
        const ctxIn = elements.originalCanvas.getContext('2d');
        const dIn = ctxIn.getImageData(x, y, 1, 1).data;
        const ctxOut = elements.processedCanvas.getContext('2d');
        const dOut = ctxOut.getImageData(x, y, 1, 1).data;

        // Display Fixed Formatting
        // Helper: 3 chars, space padded. Using &nbsp; might be needed if HTML, but textContent handles spaces if font is mono.
        // Actually, for HTML display, multiple spaces collapse. Pre-wrap or &nbsp; required.
        // We set 'white-space: pre;' in CSS so spaces are preserved.
        const fmtI = (v) => v.toString().padStart(3, ' ');
        const fmtF = (v) => v.toFixed(2).padStart(5, ' ');

        elements.inputPixelInfo.textContent = `In [${x.toString().padStart(2, ' ')},${y.toString().padStart(2, ' ')}]: R:${fmtI(dIn[0])} G:${fmtI(dIn[1])} B:${fmtI(dIn[2])}`;

        if (state.normalize) {
            const r = ((dOut[0] - state.mean[0]) / state.std[0]);
            const g = ((dOut[1] - state.mean[1]) / state.std[1]);
            const b = ((dOut[2] - state.mean[2]) / state.std[2]);
            elements.outputPixelInfo.textContent = `Out[${x.toString().padStart(2, ' ')},${y.toString().padStart(2, ' ')}]: ${fmtF(r)} ${fmtF(g)} ${fmtF(b)}`;
        } else {
            elements.outputPixelInfo.textContent = `Out[${x.toString().padStart(2, ' ')},${y.toString().padStart(2, ' ')}]: R:${fmtI(dOut[0])} G:${fmtI(dOut[1])} B:${fmtI(dOut[2])}`;
        }
    }

    // --- Chart ---
    function initChart() {
        const ctx = document.getElementById('histogramCanvas').getContext('2d');
        histogramChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'R', borderColor: '#ef4444', borderWidth: 1, pointRadius: 0, data: [] },
                    { label: 'G', borderColor: '#22c55e', borderWidth: 1, pointRadius: 0, data: [] },
                    { label: 'B', borderColor: '#3b82f6', borderWidth: 1, pointRadius: 0, data: [] }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 10 } } },
                    title: { display: true, text: 'Pixel Intensity Distribution', font: { size: 12, weight: '600' }, color: '#1e293b' }
                },
                scales: {
                    x: {
                        display: true,
                        ticks: { color: '#64748b', font: { size: 10 } },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' }
                    },
                    y: {
                        display: true,
                        ticks: { color: '#64748b', font: { size: 10 } },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' }
                    }
                }
            }
        });
    }

    function updateChart(data) {
        if (!histogramChart) return;
        const bins = 20;
        const rHist = new Array(bins).fill(0);
        const gHist = new Array(bins).fill(0);
        const bHist = new Array(bins).fill(0);

        let min = 0, max = 255;
        if (state.normalize) { min = -3; max = 3; }

        const step = (max - min) / bins;

        // Fix: Use data arrays properly
        for (let i = 0; i < data.r.length; i++) {
            const bucket = Math.min(bins - 1, Math.max(0, Math.floor((data.r[i] - min) / step)));
            rHist[bucket]++;
        }
        for (let i = 0; i < data.g.length; i++) {
            const bucket = Math.min(bins - 1, Math.max(0, Math.floor((data.g[i] - min) / step)));
            gHist[bucket]++;
        }
        for (let i = 0; i < data.b.length; i++) {
            const bucket = Math.min(bins - 1, Math.max(0, Math.floor((data.b[i] - min) / step)));
            bHist[bucket]++;
        }

        histogramChart.data.datasets[0].data = rHist;
        histogramChart.data.datasets[1].data = gHist;
        histogramChart.data.datasets[2].data = bHist;
        // Generate correct labels (e.g. 0, 12, 25... or -3.0, -2.7...)
        const labels = new Array(bins).fill(0).map((_, i) => (min + i * step).toFixed(1));
        histogramChart.data.labels = labels;
        histogramChart.update();
    }
});
