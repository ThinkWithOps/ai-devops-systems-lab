# Docker Troubleshooting Guide

## Container Won't Start

**Symptoms:** `docker run` exits immediately, `docker ps` shows no running containers.

**Diagnosis:**
```bash
docker logs <container-id>
docker inspect <container-id> | jq '.[].State'
docker events --since 10m
```

**Common causes:**
1. Entrypoint script not executable: `chmod +x entrypoint.sh`
2. Wrong architecture image (ARM vs AMD64): `docker pull --platform linux/amd64 <image>`
3. Missing environment variable causing app crash on startup
4. Port already in use: `lsof -i :<port>` then kill the process

## Docker Build Failures

### Layer Cache Issues
```bash
# Force rebuild without cache
docker build --no-cache -t myapp .

# Check which layer is failing
docker build --progress=plain -t myapp . 2>&1 | tee build.log
```

### Multi-stage Build Problems
```dockerfile
# Always specify platform for reproducible builds
FROM --platform=linux/amd64 node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM --platform=linux/amd64 node:20-alpine AS runtime
COPY --from=builder /app/node_modules ./node_modules
COPY . .
CMD ["node", "server.js"]
```

## Docker Compose Issues

### Services Can't Reach Each Other
```bash
# Check all containers are on the same network
docker network ls
docker network inspect <network-name>

# Test DNS resolution between containers
docker exec container-a ping container-b
docker exec container-a nslookup container-b
```

Services on the same `docker-compose.yml` can reach each other by service name. Services in different compose files need a shared external network:
```bash
docker network create shared-network
```

### Health Check Failures
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s  # Give app time to boot before checking
```

### Volume Permission Issues
```bash
# Fix permissions for mounted volumes
docker exec -it <container> chown -R appuser:appuser /app/data

# Or in Dockerfile
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
```

## Container Resource Issues

### Out of Memory
```bash
# Check memory usage
docker stats --no-stream

# Set memory limits
docker run -m 512m --memory-swap 512m myapp

# In docker-compose.yml
deploy:
  resources:
    limits:
      memory: 512M
    reservations:
      memory: 256M
```

### High CPU Usage
```bash
# Identify CPU-heavy containers
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Limit CPU
docker run --cpus="1.5" myapp
```

## Disk Space Issues

```bash
# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a --volumes

# Remove dangling images
docker image prune

# Remove stopped containers
docker container prune
```

## Networking Deep Dive

```bash
# List all Docker networks
docker network ls

# Inspect network and see connected containers
docker network inspect bridge

# Connect a running container to a network
docker network connect my-network container-name

# Check iptables rules Docker created
sudo iptables -L DOCKER -n

# Debug with a network utility container
docker run --rm --network container:<target> nicolaka/netshoot
```

## Registry and Image Issues

```bash
# Login to private registry
docker login registry.example.com

# Tag and push image
docker tag myapp:latest registry.example.com/myapp:v1.2.3
docker push registry.example.com/myapp:v1.2.3

# Pull with specific digest for reproducibility
docker pull myapp@sha256:abc123...

# Scan image for vulnerabilities
docker scout cves myapp:latest
# Or: trivy image myapp:latest
```
