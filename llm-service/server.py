"""
Simple Nemotron-51B server using NeMo
OpenAI-compatible API
"""

import time
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import uvicorn

# Import NeMo
try:
    from nemo.collections.nlp.models.language_modeling.megatron_gpt_model import MegatronGPTModel
    from nemo.collections.nlp.modules.common.transformer.text_generation import LengthParam, SamplingParam
except ImportError:
    print("ERROR: NeMo not installed properly")
    raise

# Global model
model = None

# Request/Response models
class Message(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[Message]
    temperature: float = 0.7
    max_tokens: int = 2048
    top_p: float = 0.9

class ChatCompletionChoice(BaseModel):
    index: int
    message: Message
    finish_reason: str

class Usage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[ChatCompletionChoice]
    usage: Usage

app = FastAPI(title="Nemotron-51B API")

@app.on_event("startup")
async def load_model():
    global model
    print("Loading Nemotron-51B with NeMo...")

    # Load from HuggingFace
    model = MegatronGPTModel.from_pretrained("nvidia/Llama-3.1-Nemotron-51B-Instruct")
    model.eval()

    print("Model loaded successfully!")

@app.get("/health")
async def health():
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {"status": "healthy"}

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest) -> ChatCompletionResponse:
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Build prompt
    prompt = "\n".join([f"{msg.role}: {msg.content}" for msg in request.messages])
    prompt += "\nassistant:"

    # Generate
    length_params = LengthParam(max_length=request.max_tokens)
    sampling_params = SamplingParam(
        temperature=request.temperature,
        top_p=request.top_p
    )

    output = model.generate([prompt], length_params=length_params, sampling_params=sampling_params)
    response_text = output[0]

    return ChatCompletionResponse(
        id=f"chatcmpl-{int(time.time())}",
        created=int(time.time()),
        model=request.model,
        choices=[
            ChatCompletionChoice(
                index=0,
                message=Message(role="assistant", content=response_text),
                finish_reason="stop"
            )
        ],
        usage=Usage(
            prompt_tokens=len(prompt.split()),
            completion_tokens=len(response_text.split()),
            total_tokens=len(prompt.split()) + len(response_text.split())
        )
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
