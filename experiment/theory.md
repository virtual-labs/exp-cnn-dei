### Theory

### I. Motivation for Convolutional Neural Networks

Fully connected networks aren’t ideal for images because flattening destroys spatial relationships between nearby pixels, and the dense connections create too many parameters, making them costly and prone to overfitting. CNNs solve this by using local connectivity and shared weights, which preserve spatial patterns and make learning more efficient and effective for visual data.

### II. Digital Images as Inputs to CNNs

A digital image can be represented as a 3D array with height, width, and channels. For color images, the three channels correspond to RGB intensity values. For example, CIFAR-10 images are 32 × 32 pixels with three channels, giving an input tensor of shape 32 × 32 × 3. CNNs take this multi-dimensional input directly, preserving spatial and channel-wise information during processing.

### III. Neurons in the Convolutional Layer

There are neurons in convolution layers. Each neuron is connected only to a local region (receptive field) of the input, computes a weighted sum + bias, applies an activation function, and contributes to one element in a feature map.

Y = f(&sum;<sub>i=1</sub><sup>m</sup> &sum;<sub>j=1</sub><sup>n</sup> w<sub>ij</sub> * x<sub>ij</sub> + b)

Where:
- x<sub>ij</sub> = input pixel in receptive field
- w<sub>ij</sub> = filter weight
- b = bias
- f(.) = activation function (ReLU , sigmoid ,etc.)

### IV. Convolution Operation

Convolution slides a small filter over the image and computes weighted sums to capture local features, such as edges and textures. Reusing the same filter across the image reduces parameters while keeping strong feature learning.

(I * K)(x, y) = &sum;<sub>i</sub> &sum;<sub>j</sub> I(x + i, y + j) K(i, j)

Mathematically, the convolution operation can be expressed as the above equation where I is the input image and K is the kernel.

Refer fig 1. To understand how convolution operation is actually performed by the kernel on an input image matrix and a feature map is calculated.

<img src="images/image18.png" width="520">

### V. Feature Maps and Hierarchical Feature Learning

After convolution, the output is a feature map. Each filter detects a specific feature, and combining multiple filters produces multiple feature maps. As layers go deeper, simple features (like edges) combine into complex ones (shapes and parts), letting CNNs learn useful patterns automatically without manual feature design.

### VI. Stride and Padding

Stride is how many pixels the filter shifts each step; a larger stride reduces the output size. Padding adds (usually zero) pixels around the input to control output dimensions and keep edge information. where N is the input size, F filter size, P padding, and S stride.

Output = (N - F + 2P) / S + 1

Refer  fig 2 to understand how stride operation is performed on input  matrix with a kernel size of 3*3 to get output as 2*2.

<img src="images/image13.png" width="320">

Output = (5 - 3 + 2*0) / 2 + 1 = 2

<img src="images/image11.png" width="350">

Refer to Fig 3 to visualise how our output feature map will look like if padding    is 1 so,

Output = (5 - 3 + 2*1) / 2 + 1 = 3

### VII. Activation Functions in CNNs

After convolution, an activation function adds non-linearity. The most common is ReLU (Rectified Linear Unit):

f(x) = max(0, x)

which helps reduce vanishing gradients and speeds up training.

Refer Figure 5 shown below to understand how the Relu function affects the filter output.

<img src="images/image10.png" width="350">

### VIII. Pooling Layers

Pooling downsamples feature maps to reduce computation and make features more robust to small shifts. Common types are max pooling, average pooling, and global average pooling, and they can also help reduce overfitting.

### i. Max Pooling

Max pooling is a pooling operation that selects the maximum element from the region of the feature map covered by the filter. Thus, the output after max-pooling layer would be a feature map containing the most prominent features of the previous feature map as shown in Fig 6.

<img src="images/image16.png" width="500">

### ii. Average Pooling

Average pooling computes the average of the elements present in the region of the feature   map covered by the filter.Thus, while max pooling gives the most prominent feature in a particular patch of the feature map, average pooling gives the average of features present in a patch as shown in Fig 7.

<img src="images/image17.png" width="500">

### IX. Flattening

Before entering the fully connected layer, the featuremaps from the previous convolutional and pooling layers are typically flattened into a one-dimensional vector as shown in Fig 8.This is done to convert the spatial information into a format suitable for fully connected layers.

<img src="images/image12.png" width="520">

### X. Overall CNN Architecture

A typical CNN stacks convolution, activation, and pooling layers to extract features, then uses fully connected layers or global pooling as a classifier as shown in Fig. 9. This pipeline enables strong image recognition performance with efficient use of parameters.

<img src="images/image14.png" width="680">

### Merits of Convolutional Neural Networks:

- Efficient parameter sharing (fewer weights than fully connected networks)
- Preserves spatial structure in images
- Automatically learns and extracts features
- Strong generalization on image data
- Scalable to large and complex visual tasks
- Backbone of modern computer vision systems

### Demerits of Convolutional Neural Networks:

- Require high computational resources (GPU/TPU)
- Need large labeled datasets for best performance
- Training deep CNNs can be time-consuming
- Features learned are hard to interpret (low explainability)
