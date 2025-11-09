FROM nvcr.io/nvidia/pytorch:24.01-py3

WORKDIR /app

# Install NeMo and dependencies
RUN pip install --upgrade pip && \
    pip install nemo_toolkit[all] fastapi uvicorn[standard] pydantic

# Copy server code
COPY server.py .

# Expose ports
EXPOSE 8000

# Set Hugging Face cache directory
ENV HF_HOME=/root/.cache/huggingface

# Run the server
CMD ["python3", "server.py"]
