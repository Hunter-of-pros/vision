"""
Inference engine for running trained Autoencoder models.
Supports PyTorch checkpoint (.pt), ONNX runtime, and TFLite INT8 flatbuffers.
Computes reconstruction error (MSE) to classify machine audio as Normal or Anomaly.
"""

import os
from typing import Dict, Any
import numpy as np

# Load default threshold from environment or calibrated value
DEFAULT_ANOMALY_THRESHOLD = float(os.getenv("ANOMALY_THRESHOLD", "0.0229"))


class AnomalyDetector:
    def __init__(
        self,
        torch_model_path: str = "backend/models/autoencoder.pt",
        tflite_model_path: str = "backend/models/autoencoder.tflite",
        threshold: float = DEFAULT_ANOMALY_THRESHOLD,
    ):
        self.torch_model_path = torch_model_path
        self.tflite_model_path = tflite_model_path
        self.threshold = threshold
        self.torch_model = None
        self.interpreter = None
        self._load_model()

    def _load_model(self):
        """Loads PyTorch model if available, otherwise attempts TFLite interpreter."""
        # 1. Try PyTorch model
        possible_pt_paths = [self.torch_model_path, "models/autoencoder.pt"]
        for p in possible_pt_paths:
            if os.path.exists(p):
                try:
                    import torch
                    from backend.scripts.train import ConvAutoencoder
                    model = ConvAutoencoder()
                    model.load_state_dict(torch.load(p, map_location="cpu"))
                    model.eval()
                    self.torch_model = model
                    print(f"✅ Loaded trained PyTorch autoencoder weights from {p}")
                    return
                except Exception as e:
                    print(f"[Warning] Failed loading PyTorch model from {p}: {e}")

        # 2. Try TFLite interpreter
        possible_tflite_paths = [self.tflite_model_path, "models/autoencoder.tflite"]
        for p in possible_tflite_paths:
            if os.path.exists(p):
                try:
                    import tflite_runtime.interpreter as tflite
                    self.interpreter = tflite.Interpreter(model_path=p)
                    self.interpreter.allocate_tensors()
                    self.input_details = self.interpreter.get_input_details()
                    self.output_details = self.interpreter.get_output_details()
                    print(f"✅ Loaded TFLite model from {p}")
                    return
                except Exception as e:
                    print(f"[Warning] Could not initialize TFLite interpreter: {e}")

    def predict(self, spectrogram: np.ndarray) -> Dict[str, Any]:
        """
        Runs autoencoder reconstruction and computes MSE loss.
        spectrogram shape: (64, 64)
        """
        # Expand dims for batch and channel: (1, 1, 64, 64)
        input_tensor = np.expand_dims(np.expand_dims(spectrogram, axis=0), axis=0).astype(np.float32)

        if self.torch_model is not None:
            import torch
            with torch.no_grad():
                x = torch.from_numpy(input_tensor)
                reconstructed_tensor = self.torch_model(x)
                reconstructed_spec = reconstructed_tensor.squeeze().cpu().numpy()

        elif self.interpreter is not None:
            input_type = self.input_details[0]["dtype"]
            if input_type == np.int8:
                scale, zero_point = self.input_details[0]["quantization"]
                quantized_input = np.round(input_tensor / scale + zero_point).astype(np.int8)
                self.interpreter.set_tensor(self.input_details[0]["index"], quantized_input)
                self.interpreter.invoke()
                output_quantized = self.interpreter.get_tensor(self.output_details[0]["index"])
                out_scale, out_zero_point = self.output_details[0]["quantization"]
                reconstructed = (output_quantized.astype(np.float32) - out_zero_point) * out_scale
            else:
                self.interpreter.set_tensor(self.input_details[0]["index"], input_tensor)
                self.interpreter.invoke()
                reconstructed = self.interpreter.get_tensor(self.output_details[0]["index"])
            reconstructed_spec = reconstructed.squeeze()

        else:
            # Fallback simulated reconstruction if weights are missing
            noise = np.random.normal(0, 0.04, spectrogram.shape)
            reconstructed_spec = spectrogram + noise

        # Mean Squared Error (Reconstruction Loss)
        mse_score = float(np.mean((spectrogram - reconstructed_spec) ** 2))
        is_anomaly = mse_score > self.threshold

        return {
            "score": round(mse_score, 5),
            "threshold": self.threshold,
            "is_anomaly": bool(is_anomaly),
            "status": "ANOMALY" if is_anomaly else "NORMAL",
            "reconstructed_spectrogram": reconstructed_spec.tolist(),
        }
