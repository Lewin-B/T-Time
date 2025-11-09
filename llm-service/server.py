"""
Minimal Nemotron-51B server - ONE endpoint
"""
from fastapi import FastAPI
from pydantic import BaseModel
from nemo.deploy import NemoQuery

app = FastAPI()

# Initialize NemoQuery client
nq = NemoQuery(url="localhost:8000", model_name="nvidia/Llama-3.1-Nemotron-51B-Instruct")

class ChatRequest(BaseModel):
    prompt: str
    max_tokens: int = 200
    temperature: float = 0.1

@app.post("/v1/chat/completions")
async def chat(request: ChatRequest):
    output = nq.query_llm(
        prompts=[request.prompt],
        max_output_token=request.max_tokens,
        top_k=1,
        top_p=0.0,
        temperature=request.temperature
    )
    return {"response": output}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
