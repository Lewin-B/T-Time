"""
Minimal Nemotron-51B server - ONE endpoint
Uses transformers pipeline (NVIDIA's recommended approach)
"""
from fastapi import FastAPI
from pydantic import BaseModel
import torch
import transformers

app = FastAPI()

# Global pipeline
pipeline = None

@app.on_event("startup")
async def load_model():
    global pipeline

    print("Loading Nemotron-51B...")

    model_id = "nvidia/Llama-3.1-Nemotron-51B-Instruct"

    tokenizer = transformers.AutoTokenizer.from_pretrained(model_id)
    tokenizer.pad_token_id = tokenizer.eos_token_id

    pipeline = transformers.pipeline(
        "text-generation",
        model=model_id,
        tokenizer=tokenizer,
        trust_remote_code=True,
        model_kwargs={
            "torch_dtype": torch.bfloat16,
            "device_map": "auto"
        }
    )

    print("Model loaded!")

class ChatRequest(BaseModel):
    prompt: str
    max_tokens: int = 200
    temperature: float = 0.7

@app.post("/v1/chat/completions")
async def chat(request: ChatRequest):
    messages = [{"role": "user", "content": request.prompt}]

    outputs = pipeline(
        messages,
        max_new_tokens=request.max_tokens,
        temperature=request.temperature,
        do_sample=True
    )

    response = outputs[0]["generated_text"][-1]["content"]

    return {"response": response}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
