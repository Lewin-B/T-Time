#!/bin/bash
# Run NeMo inference server for Nemotron-51B

python3 -c "
from nemo.deploy import DeployPyTriton

# Deploy Nemotron-51B with PyTriton backend
deploy = DeployPyTriton(
    model='nvidia/Llama-3.1-Nemotron-51B-Instruct',
    triton_model_name='nemotron-51b',
    port=8000
)

deploy.serve()
"
