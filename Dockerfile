FROM python:3.11-slim

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose Alternate Clouds port
EXPOSE 8000
ENV PORT=8000
ENV HOST=0.0.0.0

# Start LawFlow server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
