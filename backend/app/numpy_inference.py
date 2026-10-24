"""
Pure-NumPy inference engine for the ConvAutoencoder.
Implements Conv2d, ConvTranspose2d, ReLU, and Tanh using only numpy — 
no onnxruntime, torch, or scipy required. This keeps the Vercel serverless
function well under the 250MB limit.

Architecture (from ONNX graph):
  Encoder: Conv(1→16, 3x3, s2, p1) → ReLU → Conv(16→32, 3x3, s2, p1) → ReLU → Conv(32→8, 3x3, s2, p1) → ReLU
  Decoder: ConvT(8→32, 3x3, s2, p1, op1) → ReLU → ConvT(32→16, 3x3, s2, p1, op1) → ReLU → ConvT(16→1, 3x3, s2, p1, op1) → Tanh
"""

import os
import numpy as np
from typing import Optional


def _conv2d(x: np.ndarray, weight: np.ndarray, bias: np.ndarray,
            stride: int = 2, padding: int = 1) -> np.ndarray:
    """
    Conv2D forward pass.
    x: (N, C_in, H, W)
    weight: (C_out, C_in, kH, kW)
    bias: (C_out,)
    """
    N, C_in, H, W = x.shape
    C_out, _, kH, kW = weight.shape

    # Pad input
    if padding > 0:
        x = np.pad(x, ((0, 0), (0, 0), (padding, padding), (padding, padding)), mode='constant')

    H_out = (H + 2 * padding - kH) // stride + 1
    W_out = (W + 2 * padding - kW) // stride + 1

    out = np.zeros((N, C_out, H_out, W_out), dtype=np.float32)

    for n in range(N):
        for co in range(C_out):
            for i in range(H_out):
                for j in range(W_out):
                    h_start = i * stride
                    w_start = j * stride
                    patch = x[n, :, h_start:h_start + kH, w_start:w_start + kW]
                    out[n, co, i, j] = np.sum(patch * weight[co]) + bias[co]
    return out


def _conv2d_fast(x: np.ndarray, weight: np.ndarray, bias: np.ndarray,
                 stride: int = 2, padding: int = 1) -> np.ndarray:
    """
    Optimized Conv2D using im2col for vectorized computation.
    x: (N, C_in, H, W), weight: (C_out, C_in, kH, kW), bias: (C_out,)
    """
    N, C_in, H, W = x.shape
    C_out, _, kH, kW = weight.shape

    if padding > 0:
        x = np.pad(x, ((0, 0), (0, 0), (padding, padding), (padding, padding)), mode='constant')

    H_out = (H + 2 * padding - kH) // stride + 1
    W_out = (W + 2 * padding - kW) // stride + 1

    # im2col: extract all patches
    cols = np.zeros((N, C_in * kH * kW, H_out * W_out), dtype=np.float32)
    idx = 0
    for i in range(H_out):
        for j in range(W_out):
            h_s = i * stride
            w_s = j * stride
            patch = x[:, :, h_s:h_s + kH, w_s:w_s + kW]  # (N, C_in, kH, kW)
            cols[:, :, idx] = patch.reshape(N, -1)
            idx += 1

    # weight reshaped: (C_out, C_in*kH*kW)
    w_col = weight.reshape(C_out, -1)

    # Batch matmul: (C_out, C_in*kH*kW) @ (N, C_in*kH*kW, H_out*W_out)
    out = np.einsum('ck,nkp->ncp', w_col, cols) + bias.reshape(1, -1, 1)
    return out.reshape(N, C_out, H_out, W_out)


def _conv_transpose2d(x: np.ndarray, weight: np.ndarray, bias: np.ndarray,
                      stride: int = 2, padding: int = 1,
                      output_padding: int = 1) -> np.ndarray:
    """
    ConvTranspose2D forward pass (fractionally-strided convolution).
    x: (N, C_in, H, W)
    weight: (C_in, C_out, kH, kW)  — note: transposed weight layout
    bias: (C_out,)
    """
    N, C_in, H, W = x.shape
    _, C_out, kH, kW = weight.shape

    H_out = (H - 1) * stride - 2 * padding + kH + output_padding
    W_out = (W - 1) * stride - 2 * padding + kW + output_padding

    out = np.zeros((N, C_out, H_out, W_out), dtype=np.float32)

    for n in range(N):
        for ci in range(C_in):
            for i in range(H):
                for j in range(W):
                    h_start = i * stride
                    w_start = j * stride
                    val = x[n, ci, i, j]
                    for co in range(C_out):
                        for ki in range(kH):
                            for kj in range(kW):
                                oh = h_start + ki - padding
                                ow = w_start + kj - padding
                                if 0 <= oh < H_out and 0 <= ow < W_out:
                                    out[n, co, oh, ow] += val * weight[ci, co, ki, kj]

    # Add bias
    out += bias.reshape(1, -1, 1, 1)
    return out


def _conv_transpose2d_fast(x: np.ndarray, weight: np.ndarray, bias: np.ndarray,
                           stride: int = 2, padding: int = 1,
                           output_padding: int = 1) -> np.ndarray:
    """
    Optimized ConvTranspose2D — interleaves zeros then applies standard conv.
    x: (N, C_in, H, W), weight: (C_in, C_out, kH, kW), bias: (C_out,)
    """
    N, C_in, H, W = x.shape
    _, C_out, kH, kW = weight.shape

    # Step 1: Insert zeros between elements (fractional stride)
    H_up = (H - 1) * stride + 1 + output_padding
    W_up = (W - 1) * stride + 1 + output_padding
    x_up = np.zeros((N, C_in, H_up, W_up), dtype=np.float32)
    x_up[:, :, ::stride, ::stride] = x

    # Step 2: Flip the kernel (correlation → convolution)
    # weight shape: (C_in, C_out, kH, kW), flip spatial dims
    w_flipped = weight[:, :, ::-1, ::-1]  # (C_in, C_out, kH, kW)

    # Step 3: Pad the upsampled input
    # For transposed conv: effective padding = kH - 1 - padding
    eff_pad = kH - 1 - padding
    if eff_pad > 0:
        x_up = np.pad(x_up, ((0, 0), (0, 0), (eff_pad, eff_pad), (eff_pad, eff_pad)), mode='constant')

    H_out = x_up.shape[2] - kH + 1
    W_out = x_up.shape[3] - kW + 1

    # im2col on upsampled input
    cols = np.zeros((N, C_in * kH * kW, H_out * W_out), dtype=np.float32)
    idx = 0
    for i in range(H_out):
        for j in range(W_out):
            patch = x_up[:, :, i:i + kH, j:j + kW]
            cols[:, :, idx] = patch.reshape(N, -1)
            idx += 1

    # Reshape flipped weight: need (C_out, C_in * kH * kW)
    # w_flipped is (C_in, C_out, kH, kW) → transpose to (C_out, C_in, kH, kW) then reshape
    w_col = w_flipped.transpose(1, 0, 2, 3).reshape(C_out, -1)

    out = np.einsum('ck,nkp->ncp', w_col, cols) + bias.reshape(1, -1, 1)
    return out.reshape(N, C_out, H_out, W_out)


class NumpyAutoencoder:
    """
    Pure-numpy ConvAutoencoder that loads weights from a .npz file.
    Zero external dependencies beyond numpy.
    """

    def __init__(self, weights_path: str):
        self.weights = dict(np.load(weights_path))
        # Use fast (im2col) implementations
        self._conv = _conv2d_fast
        self._conv_t = _conv_transpose2d_fast
        print(f"✅ Loaded pure-numpy autoencoder weights from {weights_path}")

    def forward(self, x: np.ndarray) -> np.ndarray:
        """
        Forward pass: x shape (1, 1, 64, 64) → (1, 1, 64, 64)
        """
        w = self.weights

        # Encoder
        h = self._conv(x, w['encoder.0.weight'], w['encoder.0.bias'], stride=2, padding=1)
        h = np.maximum(h, 0)  # ReLU

        h = self._conv(h, w['encoder.3.weight'], w['encoder.3.bias'], stride=2, padding=1)
        h = np.maximum(h, 0)  # ReLU

        h = self._conv(h, w['encoder.6.weight'], w['encoder.6.bias'], stride=2, padding=1)
        h = np.maximum(h, 0)  # ReLU

        # Decoder
        h = self._conv_t(h, w['decoder.0.weight'], w['decoder.0.bias'], stride=2, padding=1, output_padding=1)
        h = np.maximum(h, 0)  # ReLU

        h = self._conv_t(h, w['decoder.3.weight'], w['decoder.3.bias'], stride=2, padding=1, output_padding=1)
        h = np.maximum(h, 0)  # ReLU

        h = self._conv_t(h, w['decoder.6.weight'], w['decoder.6.bias'], stride=2, padding=1, output_padding=1)
        h = np.tanh(h)  # Tanh

        return h


def load_numpy_autoencoder() -> Optional[NumpyAutoencoder]:
    """Try to locate and load the .npz weights file."""
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    candidates = [
        os.path.join(backend_dir, "models", "autoencoder_weights.npz"),
        "backend/models/autoencoder_weights.npz",
        "models/autoencoder_weights.npz",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return NumpyAutoencoder(p)
            except Exception as e:
                print(f"[Warning] Failed loading numpy autoencoder from {p}: {e}")
    return None
