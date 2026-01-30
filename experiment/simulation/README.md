# CNN Educational Lab - Simulation Structure

This directory contains interactive educational materials for learning Convolutional Neural Networks (CNNs) using the CIFAR-10 dataset.

## Structure Overview

```
simulation/
├── index.html          # Main entry point - start here!
├── notebook/           # Notebook viewer with step-by-step tutorials
├── interactive/        # Interactive CNN simulations
├── source/            # Source files (Jupyter notebook & converter)
└── archive/           # Archived/deprecated content
```

## Getting Started

1. **Open the main entry point:**
   - Navigate to `index.html` in your web browser
   - You'll see two main options:

2. **Choose your learning path:**
   - **Notebook View**: Sequential tutorial with code and explanations
   - **Interactive Simulations**: Visual, hands-on CNN exploration

## Directory Details

### `notebook/`
Contains the interactive notebook viewer:
- `index.html` - Notebook interface
- `notebook.js` - Notebook functionality
- `notebook.css` - Notebook styling
- `notebook_data.json` - Converted notebook content
- `assets/` - Images and outputs from notebook

**Purpose:** Step-by-step learning with executable code cells, visualizations, and detailed explanations.

### `interactive/`
Contains three interactive CNN simulations:
- `index.html` - Main simulation interface
- `css/simulations.css` - Unified styling
- `js/`
  - `sim-data-preprocessing.js` - Data & preprocessing simulation
  - `sim-convolution.js` - Convolution & pooling simulation
  - `sim-classifier.js` - Dense layer & classifier simulation
  - `image-loader.js` - CIFAR-10 image utilities
  - `tabs.js` - Tab navigation controller
- `data/cifar10_samples/` - Sample CIFAR-10 images

**Purpose:** Visual, interactive exploration of CNN concepts with real-time manipulation.

### `source/`
Original development files:
- `base_notebook.ipynb` - Original Jupyter notebook
- `convert_notebook.py` - Script to convert .ipynb to JSON

**Purpose:** Source materials for regenerating notebook content.

### `archive/`
Deprecated and archived content:
- `old_simulations/` - Previous simulation versions
- `test_run/` - Testing artifacts

## Navigation Flow

```
index.html (Landing Page)
    ├─> notebook/index.html
    │       └─> Link to interactive/index.html
    │
    └─> interactive/index.html
            ├─> Tab 1: Data & Preprocessing
            ├─> Tab 2: Convolution & Pooling
            ├─> Tab 3: Dense & Classifier
            └─> Link back to notebook/index.html
```

## Development

### Regenerating Notebook Content
```bash
cd source/
python convert_notebook.py
# Output goes to notebook/notebook_data.json
```

### File Naming Conventions
- **Descriptive names**: Files clearly indicate their purpose
- **No ambiguity**: `sim-data-preprocessing.js` vs generic `script.js`
- **Consistent structure**: All related files grouped logically

## Notes

- All paths are relative to their respective directories
- CSS uses modern features (CSS Grid, Flexbox, CSS Variables)
- JavaScript is vanilla ES6+ (no external dependencies except Chart.js)
- Images are embedded as base64 in `image-loader.js` for portability

## Learning Objectives

**Notebook View:**
- Understand CNN architecture
- Learn data preprocessing techniques
- Explore training processes
- Analyze model performance

**Interactive Simulations:**
- Visualize data preprocessing effects
- See convolution operations in action
- Understand pooling mechanisms
- Explore classifier behavior

## Browser Compatibility

- Chrome/Edge: Fully supported
- Firefox: Fully supported
- Safari: Fully supported
- IE11: Not supported (use modern browser)

## License

Educational resource for Virtual Labs project.

---

**Quick Start:** Simply open `index.html` in your browser to begin learning!
