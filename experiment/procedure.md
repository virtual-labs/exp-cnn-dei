## Procedure

The objective of this experiment is to implement a Convolutional Neural Networks (CNN) for multi-class image classification and to analyze its performance on a real-world colour image dataset. This experiment focuses on understanding convolutional feature extraction, pooling operations, data augmentation, training dynamics, and evaluation strategies using the CIFAR-10 dataset.

### 1. Import Required Libraries

- **PyTorch** (torch, torch.nn, torch.optim): build the CNN, define loss, and train the model
- **Torchvision** (torchvision.datasets, torchvision.transforms): load CIFAR-10 and apply image preprocessing/augmentation
- **NumPy** (numpy): basic numerical utilities (optional; PyTorch often enough)
- **Matplotlib** (matplotlib.pyplot): visualize sample images and training/validation graphs

### 2. Dataset Loading and Description

- Load CIFAR-10 with `torchvision.datasets.CIFAR10`
- **Dataset info (important):**
  - Total: 60,000 RGB images, size 32×32
  - Split: 50,000 train + 10,000 test
  - Classes: 10 categories (e.g., airplane, automobile, bird, cat, etc.)

### 3. Exploratory Data Analysis (EDA)

- **Visualize:** 1 sample image per class (10 classes) in a labeled grid
- **Verify:** image size 32×32, RGB channels
- **Inspect:** class diversity, background variation, and ambiguity between similar classes

### 4. Data Preprocessing

#### a) Tensor conversion

Convert each image to a PyTorch tensor of shape (C, H, W) with values in [0, 1].

#### b) Normalization (CIFAR-10)

Normalize per channel to stabilize training:
  - Mean = (0.4914, 0.4822, 0.4465)
  - Std = (0.2470, 0.2435, 0.2616)

### 5. Data Loading and Augmentation

- **Perform Augmentation and preprocess (train only):** random horizontal flip, random crop with padding, (optional) AutoAugment which in tends increases diversity, reduces overfitting, improves generalization
- **Create DataLoaders (train & test):** load data in mini-batches for faster, GPU-friendly training and evaluation
- **Shuffling rule:** shuffle training loader (avoid order bias), no shuffle for test loader (consistent evaluation)

### 6. CNN Model Architecture Design

- Input (32×32×3)
- [Conv2d → BatchNorm2d → ReLU] × N (extract features)
- Dropout2d (0.05) - This helps in reducing overfitting
- MaxPool (periodically) - reduce H×W, keep important patterns
- Global Average Pooling - convert feature maps → single feature vector

### 7. Training Configuration

- **Loss:** CrossEntropyLoss (for 10-class classification)
- **Adam Optimizer with Regularization:** use SGD/Adam with weight decay (L2) and dropout of (0.05) to reduce overfitting
- **LR Scheduler:** adjust learning rate during training (e.g., StepLR / CosineAnnealing) for better convergence

### 8. Model Training

The model is trained for a fixed number of epochs, where in each epoch a forward pass is performed to generate predictions, the loss is computed, and backpropagation is applied followed by an optimizer step to update the model parameters. During this process, the training loss and accuracy are recorded at the end of every epoch to monitor learning progress.

### 9. Model Evaluation

Test the trained CNN on unseen data by computing test accuracy and error metrics (e.g., confusion matrix/class-wise accuracy) to identify where predictions fail.

### 10. Result Visualization

- Plot train vs test curves for loss and accuracy to check convergence/overfitting
- Show a few sample predictions with true label vs predicted label (optionally confidence) for qualitative evaluation

### 11. Performance Analysis

- **Per Class-accuracy:** identify best/worst performing classes
- **Confusion matrix:** highlight frequently confused class pairs and error patterns