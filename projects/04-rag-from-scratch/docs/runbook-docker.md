# Docker Operations Runbook

## Container Troubleshooting

### Container Keeps Exiting (Exit Code 0 or 1)

**What it means:**
The container starts and immediately stops. Exit code 0 means the process completed successfully but there was nothing to keep it running. Exit code 1 means the application crashed.

**Step-by-step resolution:**

Step 1 — Check what happened:
```bash
docker ps -a
docker logs <container-name>
docker inspect <container-name> | grep -A 5 '"State"'
```

Step 2 — If exit code 0 (process ran to completion):
The container has no long-running foreground process. Fix the CMD or ENTRYPOINT:
```dockerfile
# Wrong — runs a script that exits
CMD ["./setup.sh"]

# Correct — runs a server that stays alive
CMD ["nginx", "-g", "daemon off;"]
```

Step 3 — If exit code 1 (application error):
```bash
docker logs <container-name> --tail 50
docker run -it <image-name> /bin/bash    # Debug interactively
```

Step 4 — Check environment variables:
```bash
docker inspect <container-name> | grep -A 20 '"Env"'
```

Step 5 — Restart with correct configuration:
```bash
docker stop <container-name>
docker rm <container-name>
docker run -d --name <container-name> --env-file .env <image-name>
```

---

### Image Vulnerability Scanning

**Why it matters:**
Base images accumulate CVEs over time. Running outdated images is a security risk in production.

**Scanning with Trivy (recommended):**

Step 1 — Install Trivy:
```bash
# Linux
apt-get install trivy

# Mac
brew install trivy
```

Step 2 — Scan an image:
```bash
trivy image nginx:latest
trivy image --severity HIGH,CRITICAL nginx:latest
```

Step 3 — Scan before pushing to registry (add to CI/CD):
```bash
trivy image --exit-code 1 --severity CRITICAL myapp:latest
```
`--exit-code 1` causes the pipeline to fail on CRITICAL vulnerabilities.

Step 4 — Fix vulnerabilities:
- Update the base image: `FROM ubuntu:22.04` instead of `FROM ubuntu:18.04`
- Rebuild: `docker build --no-cache -t myapp:latest .`
- Re-scan to verify

**Vulnerability severity levels:**
- CRITICAL: Patch immediately, do not deploy
- HIGH: Patch within 7 days
- MEDIUM: Patch within 30 days
- LOW: Track and patch in next release

---

### Volume Mount Issues

**Common problem: Container can't read/write mounted files**

Step 1 — Inspect current mounts:
```bash
docker inspect <container-name> | grep -A 20 '"Mounts"'
```

Step 2 — Check permissions on the host directory:
```bash
ls -la /path/to/host/dir
```

Step 3 — Fix permission mismatch (container user vs host):
```bash
# Check what user the container runs as
docker run --rm <image-name> id

# Fix host directory permissions
sudo chown -R 1000:1000 /path/to/host/dir
chmod 755 /path/to/host/dir
```

Step 4 — Mount with explicit user mapping in docker-compose:
```yaml
services:
  app:
    image: myapp
    volumes:
      - ./data:/app/data
    user: "1000:1000"
```

Step 5 — For read-only mounts (security best practice):
```yaml
volumes:
  - ./config:/app/config:ro
```

---

### Container Networking Issues

**Container can't reach another container or the internet**

Step 1 — Inspect network:
```bash
docker network ls
docker network inspect bridge
docker inspect <container-name> | grep -A 10 '"Networks"'
```

Step 2 — Test connectivity from inside the container:
```bash
docker exec -it <container-name> /bin/sh
ping google.com
curl http://other-container-name:8080
```

Step 3 — If containers can't reach each other:
Make sure both containers are on the same network:
```bash
docker network create mynetwork
docker run -d --network mynetwork --name app1 myapp1
docker run -d --network mynetwork --name app2 myapp2
```

In docker-compose, containers in the same `services` block automatically share a network:
```yaml
services:
  web:
    image: nginx
  api:
    image: myapi
    # web can reach api at http://api:8080
```

Step 4 — Check port bindings:
```bash
docker port <container-name>
# or
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Step 5 — If port already in use:
```bash
# Find what's using the port
sudo lsof -i :8080
sudo netstat -tulpn | grep 8080

# Kill the process or change the container's host port
docker run -p 8081:8080 myapp    # Map container 8080 to host 8081
```

---

## Docker Build Best Practices

### Reduce Image Size

```dockerfile
# Use minimal base images
FROM python:3.11-slim    # Not python:3.11 (which is 1GB+)

# Multi-stage build — build in one stage, run in another
FROM python:3.11-slim AS builder
COPY requirements.txt .
RUN pip install --user -r requirements.txt

FROM python:3.11-slim
COPY --from=builder /root/.local /root/.local
COPY . .
CMD ["python", "app.py"]
```

### Layer Caching — Speed Up Builds

```dockerfile
# Wrong order — requirements install on every code change
COPY . .
RUN pip install -r requirements.txt

# Correct order — requirements cached unless requirements.txt changes
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
```

### Never Store Secrets in Images

```dockerfile
# NEVER do this
ENV AWS_SECRET_KEY=abc123

# Correct — pass at runtime
docker run -e AWS_SECRET_KEY=$AWS_SECRET_KEY myapp
# or use Docker secrets / AWS Secrets Manager
```

---

## Docker Compose Operations

### Start / Stop / Rebuild
```bash
docker-compose up -d              # Start in background
docker-compose down               # Stop and remove containers
docker-compose down -v            # Also remove volumes
docker-compose up -d --build      # Rebuild images before starting
docker-compose logs -f <service>  # Follow logs for a service
docker-compose ps                 # Check status of all services
```

### Force Recreate a Single Service
```bash
docker-compose up -d --force-recreate --no-deps <service-name>
```

### Remove Everything (clean slate)
```bash
docker-compose down -v --rmi all
docker system prune -af
```
