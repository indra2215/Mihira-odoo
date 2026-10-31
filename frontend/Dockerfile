# Use official lightweight Node.js 20 Alpine Linux image as the base
FROM node:20-alpine AS base

# Set the working directory inside the container
WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install npm dependencies (Next.js, React, Tailwind CSS)
RUN npm install

# Copy the rest of the frontend source code into the container
COPY . .

# Expose port 3000 used by the Next.js development server
EXPOSE 3000

# Start the Next.js development server on container startup
CMD ["npm", "run", "dev"]
