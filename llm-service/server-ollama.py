"""
Minimal Nemotron-70B server using Ollama
ONE endpoint, no complexity
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

OLLAMA_URL = "http://localhost:11434/api/generate"

class ChatRequest(BaseModel):
    prompt: str
    max_tokens: int = 200
    temperature: float = 0.7

@app.post("/v1/chat/completions")
async def chat(request: ChatRequest):
    logger.info(f"Received request - prompt: {request.prompt[:50]}...")

    try:
        logger.info(f"Calling Ollama at {OLLAMA_URL}")

        response = requests.post(
            OLLAMA_URL,
            json={
                "model": "nemotron",
                "prompt": request.prompt,
                "stream": False,
                "options": {
                    "temperature": request.temperature,
                    "num_predict": request.max_tokens
                }
            },
            timeout=120
        )

        logger.info(f"Ollama response status: {response.status_code}")
        response.raise_for_status()

        result = response.json()
        logger.info(f"Generated response length: {len(result.get('response', ''))}")

        return {"response": result["response"]}

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy", "model": "nemotron-70b"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
