from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModel
import torch
import torch.nn.functional as F
from torch import Tensor
import os
import logging

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables to cache the model and tokenizer
tokenizer = None
model = None

def average_pool(last_hidden_states: Tensor, attention_mask: Tensor) -> Tensor:
    """Average pool the hidden states using attention mask."""
    last_hidden = last_hidden_states.masked_fill(~attention_mask[..., None].bool(), 0.0)
    return last_hidden.sum(dim=1) / attention_mask.sum(dim=1)[..., None]

def get_embedding_model():
    """Initialize and cache the embedding model and tokenizer."""
    global tokenizer, model
    if tokenizer is None or model is None:
        try:
            logger.info("Loading embedding model: intfloat/e5-base-v2")
            tokenizer = AutoTokenizer.from_pretrained('intfloat/e5-base-v2')
            model = AutoModel.from_pretrained('intfloat/e5-base-v2')
            model.eval()  # Set to evaluation mode
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to initialize embedding model: {e}")
            raise
    return tokenizer, model

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy"}), 200

@app.route("/embed", methods=["POST"])
def generate_embedding():
    """
    Generate embedding for the given text.
    
    Request body:
    {
        "text": "query: your text here"
    }
    
    Returns:
    {
        "embedding": [0.123, 0.456, ...]
    }
    """
    try:
        data = request.get_json()
        
        if not data or "text" not in data:
            return jsonify({"error": "Missing 'text' field in request body"}), 400
        
        text = data["text"]
        if not isinstance(text, str) or not text.strip():
            return jsonify({"error": "Text must be a non-empty string"}), 400
        
        print(f"Generating embedding for text: {text[:50]}...")
        
        # Get the tokenizer and model
        tokenizer_instance, model_instance = get_embedding_model()
        
        # Ensure text has proper prefix (query: or passage:)
        # If it doesn't start with either, assume it's a query
        if not text.startswith("query: ") and not text.startswith("passage: "):
            text = f"query: {text}"
        
        # Tokenize the input text
        batch_dict = tokenizer_instance(
            [text],
            max_length=512,
            padding=True,
            truncation=True,
            return_tensors='pt'
        )
        
        # Generate embeddings
        with torch.no_grad():
            outputs = model_instance(**batch_dict)
            embeddings = average_pool(
                outputs.last_hidden_state,
                batch_dict['attention_mask']
            )
            # Normalize embeddings
            embeddings = F.normalize(embeddings, p=2, dim=1)
        
        # Convert to list of floats
        embedding = embeddings[0].tolist()
        
        print(f"Generated embedding of length: {len(embedding)}")
        
        return jsonify({
            "embedding": embedding
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating embedding: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({
            "error": f"Failed to generate embedding: {str(e)}"
        }), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

