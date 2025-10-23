FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json .

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /data && chmod 755 /data

# Expose port (adjust if your API uses a different port)
EXPOSE 3000

# Run the API service
CMD ["bun", "run", "start"]