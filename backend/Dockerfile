# Use official slim Python 3.12 image as base
FROM python:3.12-slim

# Prevent Python from writing .pyc bytecode files and enable unbuffered console logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Set the working directory inside the container
WORKDIR /app

# Install native system dependencies required by PostgreSQL client and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first to take advantage of Docker build cache
COPY requirements.txt .

# Install Python packages without caching to keep the image slim
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend source code into the container
COPY . .

# Expose port 8000 used by Django runserver
EXPOSE 8000

# Start Django development server listening on all network interfaces
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
