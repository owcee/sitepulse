"""
Convert TFLite model to TensorFlow.js format
Run: python convert_tflite_to_tfjs.py
"""

import subprocess
import sys
import os

def install_tensorflowjs():
    """Install tensorflowjs if not already installed"""
    try:
        import tensorflowjs
        print("tensorflowjs already installed")
        # Force upgrade to latest version for NumPy compatibility
        print("Upgrading tensorflowjs to latest version...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", "tensorflowjs", "numpy<2.0"])
    except ImportError:
        print("Installing tensorflowjs...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "tensorflowjs", "numpy<2.0"])

def convert_model():
    """Convert TFLite model to TensorFlow.js format"""
    input_model = "assets/ml/model_optimized.tflite"
    output_dir = "assets/ml/tfjs_model"
    
    if not os.path.exists(input_model):
        print(f"Error: Model file not found at {input_model}")
        return False
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Converting {input_model} to TensorFlow.js format...")
    print(f"Output directory: {output_dir}")
    
    try:
        # Use tensorflowjs_converter
        cmd = [
            sys.executable, "-m", "tensorflowjs.converters.tflite",
            "--input_format=tflite",
            f"--output_format=tfjs_graph_model",
            f"--output_path={output_dir}",
            input_model
        ]
        
        subprocess.check_call(cmd)
        print(f"✅ Conversion successful! Model saved to {output_dir}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Conversion failed: {e}")
        print("\nNote: TFLite to TensorFlow.js conversion requires:")
        print("1. Python 3.7+")
        print("2. tensorflowjs package: pip install tensorflowjs")
        print("3. The TFLite model file")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("TFLite to TensorFlow.js Converter")
    print("=" * 60)
    
    install_tensorflowjs()
    convert_model()

