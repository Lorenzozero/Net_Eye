FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for network scanning
RUN apt-get update && apt-get install -y \
    net-tools \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent code and config
COPY net_eye_agent.py .
COPY config.yaml .

# Set environment variable for config path
ENV NETEYE_CONFIG=/app/config.yaml

# Run agent
CMD ["python", "-u", "net_eye_agent.py"]
