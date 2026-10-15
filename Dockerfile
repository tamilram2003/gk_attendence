# Use official Node.js runtime as the base image
FROM node:20-bookworm-slim

# Install Python3, LibreOffice (for DOCX-to-PDF conversion), and fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    libreoffice \
    libreoffice-writer \
    fonts-liberation \
    fonts-dejavu \
    fonts-freefont-ttf \
    fontconfig \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Copy and install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

COPY backend/ ./backend/

# Set working directory to backend
WORKDIR /app/backend

# Render / Railway assign the PORT variable dynamically
ENV PORT=5000
EXPOSE 5000

# Start unified server
CMD ["node", "server.js"]
