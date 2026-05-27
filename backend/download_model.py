import os
from pathlib import Path
from huggingface_hub import hf_hub_download
from transformers import AutoTokenizer

BASE_DIR = Path(__file__).resolve().parent
MODEL_CACHE_DIR = BASE_DIR / ".model_cache"

def pre_download():
    print(f"Pre-downloading ONNX model and tokenizer to {MODEL_CACHE_DIR} during build...")
    # Ensure cache directory exists
    MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    
    # Download model.onnx
    model_path = hf_hub_download(
        repo_id="optimum/all-MiniLM-L6-v2",
        filename="model.onnx",
        cache_dir=str(MODEL_CACHE_DIR)
    )
    print(f"Model downloaded to: {model_path}")
    
    # Download tokenizer files
    tokenizer = AutoTokenizer.from_pretrained(
        "optimum/all-MiniLM-L6-v2",
        cache_dir=str(MODEL_CACHE_DIR)
    )
    print("Tokenizer downloaded successfully.")
    print("Pre-download complete!")

if __name__ == "__main__":
    pre_download()
