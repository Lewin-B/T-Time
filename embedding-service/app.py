"""
Embedding Service API
Provides text embedding generation using the intfloat/e5-base-v2 model.
This service replaces the Xenova/e5-base-v2 model that was running in Next.js serverless functions.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import logging
from typing import List
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="T-Time Embedding Service",
    description="Generates embeddings for customer sentiment analysis",
    version="1.0.0"
)

# Add CORS middleware (allow all origins since this is internal)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variable (singleton pattern)
embedding_model = None

# Model configuration
MODEL_NAME = "intfloat/e5-base-v2"
EMBEDDING_DIMENSION = 768


def get_embedding_model():
    """
    Get or initialize the embedding model (singleton pattern).
    The model stays loaded in memory for fast inference.
    """
    global embedding_model
    if embedding_model is None:
        logger.info(f"Loading embedding model: {MODEL_NAME}")
        start_time = time.time()
        embedding_model = SentenceTransformer(MODEL_NAME)
        load_time = time.time() - start_time
        logger.info(f"Model loaded successfully in {load_time:.2f} seconds")
    return embedding_model


# Pydantic models for request/response
class EmbedRequest(BaseModel):
    text: str

    class Config:
        json_schema_extra = {
            "example": {
                "text": "query: network coverage problems"
            }
        }


class EmbedResponse(BaseModel):
    embedding: List[float]
    dimension: int
    model: str

    class Config:
        json_schema_extra = {
            "example": {
                "embedding": [0.123, -0.456, 0.789],
                "dimension": 768,
                "model": "intfloat/e5-base-v2"
            }
        }


class HealthResponse(BaseModel):
    status: str
    model: str
    dimension: int


@app.get("/", response_model=dict)
async def root():
    """Root endpoint - returns API information"""
    return {
        "service": "T-Time Embedding Service",
        "version": "1.0.0",
        "endpoints": {
            "embed": "POST /embed - Generate embeddings",
            "health": "GET /health - Health check"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    Returns model information and status.
    """
    try:
        # Try to load the model to ensure it's working
        model = get_embedding_model()
        return HealthResponse(
            status="ok",
            model=MODEL_NAME,
            dimension=EMBEDDING_DIMENSION
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable")


@app.post("/embed", response_model=EmbedResponse)
async def generate_embedding(request: EmbedRequest):
    """
    Generate embedding for the provided text.

    The e5-base-v2 model produces 768-dimensional embeddings.
    Input text is automatically normalized and processed.

    Args:
        request: EmbedRequest containing the text to embed

    Returns:
        EmbedResponse with the embedding vector
    """
    try:
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        # Get the model
        model = get_embedding_model()

        # Generate embedding
        start_time = time.time()
        embedding = model.encode(
            request.text,
            normalize_embeddings=True,  # Same as Xenova version
            show_progress_bar=False
        )
        inference_time = time.time() - start_time

        # Convert to list of floats
        embedding_list = embedding.tolist()

        logger.info(
            f"Generated embedding for text (length: {len(request.text)}) "
            f"in {inference_time:.3f}s"
        )

        return EmbedResponse(
            embedding=embedding_list,
            dimension=len(embedding_list),
            model=MODEL_NAME
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating embedding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating embedding: {str(e)}")


# Startup event - preload model
@app.on_event("startup")
async def startup_event():
    """Preload the model on startup to avoid cold starts"""
    logger.info("Starting T-Time Embedding Service...")
    try:
        get_embedding_model()
        logger.info("Service ready to accept requests")
    except Exception as e:
        logger.error(f"Failed to load model on startup: {str(e)}")
        raise


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down T-Time Embedding Service...")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
