FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# Install Python 3.11
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-dev \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.11 as default
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

WORKDIR /app

# Upgrade pip first
RUN python3 -m pip install --upgrade pip

# Copy requirements and install dependencies
COPY requirements.txt .
RUN python3 -m pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY server.py .

# Expose port
EXPOSE 8000

# Set Hugging Face cache directory
ENV HF_HOME=/root/.cache/huggingface

# Run the server
CMD ["python3", "server.py"]
