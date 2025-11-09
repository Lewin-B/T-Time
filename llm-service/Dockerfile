FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

# Install Python 3.11
RUN apt-get update && apt-get install -y python3.11 python3-pip curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY server.py .

EXPOSE 8001

CMD ["python3", "server.py"]
