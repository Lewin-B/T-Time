"""
FastAPI server for Nemotron-51B with OpenAI-compatible API
Simpler alternative to vLLM - uses transformers directly
"""

import os
import time
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# Global model and tokenizer
model = None
tokenizer = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup, cleanup on shutdown"""
    global model, tokenizer

    print("Loading Nemotron-51B model...")
    model_name = "nvidia/Llama-3.1-Nemotron-51B-Instruct"

    # Load tokenizer
    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(
        model_name,
        trust_remote_code=True,
        use_fast=True
    )

    # Load model with BF16 precision
    print("Loading model (this will take 2-3 minutes)...")
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.bfloat16,
        device_map="auto",  # Automatically distribute across GPUs
        trust_remote_code=True,
        low_cpu_mem_usage=True
    )

    model.eval()  # Set to evaluation mode
    print(f"Model loaded successfully on device: {model.device}")
    print(f"Model memory footprint: {model.get_memory_footprint() / 1e9:.2f} GB")

    yield

    # Cleanup
    print("Shutting down...")
    del model
    del tokenizer
    torch.cuda.empty_cache()

app = FastAPI(
    title="Nemotron-51B API",
    description="OpenAI-compatible API for NVIDIA Nemotron-51B",
    version="1.0.0",
    lifespan=lifespan
)

# OpenAI-compatible request/response models
class Message(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[Message]
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=2048, ge=1, le=8192)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    stream: bool = False

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

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {"status": "healthy", "model": "nvidia/Llama-3.1-Nemotron-51B-Instruct"}

@app.get("/v1/models")
async def list_models():
    """List available models (OpenAI-compatible)"""
    return {
        "object": "list",
        "data": [
            {
                "id": "nvidia/Llama-3.1-Nemotron-51B-Instruct",
                "object": "model",
                "created": int(time.time()),
                "owned_by": "nvidia"
            }
        ]
    }

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest) -> ChatCompletionResponse:
    """OpenAI-compatible chat completions endpoint"""

    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    if request.stream:
        raise HTTPException(status_code=400, detail="Streaming not yet supported")

    try:
        # Format messages using chat template
        prompt = tokenizer.apply_chat_template(
            [{"role": msg.role, "content": msg.content} for msg in request.messages],
            tokenize=False,
            add_generation_prompt=True
        )

        # Tokenize input
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        prompt_tokens = inputs.input_ids.shape[1]

        # Generate response
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=request.max_tokens,
                temperature=request.temperature,
                top_p=request.top_p,
                do_sample=request.temperature > 0,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id
            )

        # Decode response (only the generated part)
        generated_ids = outputs[0][prompt_tokens:]
        response_text = tokenizer.decode(generated_ids, skip_special_tokens=True)
        completion_tokens = len(generated_ids)

        # Build OpenAI-compatible response
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
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=prompt_tokens + completion_tokens
            )
        )

    except Exception as e:
        print(f"Error during generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
