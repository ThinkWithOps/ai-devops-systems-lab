# Security for DevOps Engineers

## Secrets Management

### Never Do This
```bash
# NEVER store secrets in code, env files committed to git, or logs
export API_KEY=sk-abc123  # Visible in process list
docker run -e API_KEY=sk-abc123 myapp  # Visible in docker inspect
echo "API_KEY=sk-abc123" >> .env && git add .env  # Committed to git
```

### Use AWS Secrets Manager
```python
import boto3
import json

def get_secret(secret_name: str) -> dict:
    client = boto3.client('secretsmanager', region_name='us-east-1')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

# Usage
db_config = get_secret('prod/database/credentials')
db_url = f"postgresql://{db_config['username']}:{db_config['password']}@{db_config['host']}/mydb"
```

### Kubernetes Secrets
```bash
# Create secret
kubectl create secret generic db-creds \
  --from-literal=username=admin \
  --from-literal=password=mysecretpassword

# Reference in pod
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-creds
        key: password

# Encrypt secrets at rest (kubeadm)
# /etc/kubernetes/encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources: [secrets]
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-key>
```

### Detect Leaked Secrets
```bash
# Scan git history for secrets
git-secrets --scan-history
trufflehog git file://. --since-commit HEAD~10 --only-verified

# Pre-commit hook to prevent committing secrets
pip install detect-secrets
detect-secrets scan > .secrets.baseline
# Add to .pre-commit-config.yaml
```

## Container Security

### Docker Security Best Practices
```dockerfile
# Run as non-root user
FROM python:3.11-slim
RUN useradd -m -u 1001 appuser
WORKDIR /app
COPY --chown=appuser:appuser . .
USER appuser

# Read-only filesystem where possible
docker run --read-only -v /tmp:/tmp myapp

# Drop all capabilities, add only what's needed
docker run --cap-drop ALL --cap-add NET_BIND_SERVICE myapp

# No new privileges
docker run --security-opt no-new-privileges myapp

# Scan for vulnerabilities
trivy image myapp:latest
docker scout cves myapp:latest
```

### Kubernetes Security

```yaml
# Pod Security Context
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault

  containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: ["ALL"]
```

```yaml
# Network Policy - default deny all
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
---
# Allow specific traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-db
spec:
  podSelector:
    matchLabels:
      app: database
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api
    ports:
    - port: 5432
```

## OWASP Top 10 in APIs

### SQL Injection Prevention
```python
# VULNERABLE
query = f"SELECT * FROM users WHERE id = {user_id}"  # Never do this

# SAFE - parameterized queries
result = await db.execute(
    select(User).where(User.id == user_id)  # SQLAlchemy ORM
)

# SAFE - explicit parameters
result = await db.execute(
    text("SELECT * FROM users WHERE id = :user_id"),
    {"user_id": user_id}
)
```

### Authentication and Authorization
```python
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def get_current_user(token: str = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return await get_user(user_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# Rate limiting
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@app.post("/login")
@limiter.limit("5/minute")  # Prevent brute force
async def login(request: Request, credentials: LoginRequest):
    ...
```

### Input Validation
```python
from pydantic import BaseModel, validator
import re

class UserInput(BaseModel):
    username: str
    email: str
    comment: str

    @validator('username')
    def username_alphanumeric(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Username must be alphanumeric')
        if len(v) > 50:
            raise ValueError('Username too long')
        return v

    @validator('comment')
    def sanitize_comment(cls, v):
        # Remove HTML tags to prevent XSS
        import bleach
        return bleach.clean(v, strip=True)
```

## SSL/TLS

```bash
# Check certificate expiry
echo | openssl s_client -connect api.example.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Check certificate chain
openssl s_client -connect api.example.com:443 -showcerts

# Test TLS configuration
nmap --script ssl-enum-ciphers -p 443 api.example.com
testssl.sh api.example.com  # Comprehensive TLS test

# Auto-renew with certbot
certbot renew --quiet --post-hook "systemctl reload nginx"

# Kubernetes with cert-manager
apiVersion: cert-manager.io/v1
kind: Certificate
spec:
  secretName: api-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - api.example.com
```

## Audit and Compliance

```bash
# Check for SUID binaries (privilege escalation risk)
find / -perm -4000 -type f 2>/dev/null

# Check open ports
ss -tuln
nmap -sV localhost

# Check running services
systemctl list-units --type=service --state=running

# Audit log access
auditctl -w /etc/passwd -p wa -k identity
ausearch -k identity

# Check for world-writable files
find / -perm -o+w -not -path /proc/* 2>/dev/null
```
