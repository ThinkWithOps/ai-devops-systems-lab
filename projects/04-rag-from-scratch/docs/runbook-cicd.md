# CI/CD Pipeline Runbook

## Pipeline Failure Troubleshooting

### Failed Deployment — General Approach

When a deployment pipeline fails, follow this sequence before taking any action:

Step 1 — Read the full error, not just the last line:
Most pipelines surface a summary at the end. The actual root cause is usually in the middle of the logs. Search for "ERROR", "FAILED", "Exception", or the first non-zero exit code.

Step 2 — Check if this is a flaky failure or a real one:
```bash
# Re-run the failed job once
# If it passes, it was infrastructure flakiness — not a code issue
# If it fails again at the same step, it is a real problem
```

Step 3 — Reproduce locally before fixing:
```bash
# Run the exact same command the pipeline ran
docker build -t myapp:test .
docker run myapp:test pytest tests/
```

Step 4 — Fix in a branch, not directly in main.

---

### Build Step Failures

**Dependency install fails:**

Symptoms:
- `pip install` fails with connection timeout
- `npm install` fails with checksum mismatch
- Package version not found

Resolution:

Step 1 — Check if it's a network issue (retry once):
If it passes on retry, add retry logic to the pipeline step.

Step 2 — If a package version was yanked or deleted:
```bash
# Pin to the last known working version
pip install requests==2.31.0    # Not requests>=2.31.0
```

Step 3 — Use a dependency cache in your pipeline:
```yaml
# GitHub Actions example
- uses: actions/cache@v3
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}
```

**Docker build fails:**

Step 1 — Check which layer failed:
Each `RUN` command is a layer. The layer number in the error tells you exactly which command failed.

Step 2 — Build with no cache to eliminate stale layers:
```bash
docker build --no-cache -t myapp:test .
```

Step 3 — Test the failing RUN command in an interactive container:
```bash
docker run -it <base-image> /bin/bash
# Then run the failing command manually
```

---

### Test Failures in CI

**Tests pass locally but fail in CI:**

Step 1 — Check environment differences:
- Environment variables present locally but missing in CI
- Different Python/Node version in CI vs local
- Tests depend on a running service (database, Redis) not available in CI

Step 2 — Add the missing environment variable to CI secrets:
```yaml
# GitHub Actions
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  AWS_DEFAULT_REGION: us-east-1
```

Step 3 — For services, use CI service containers:
```yaml
# GitHub Actions
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_PASSWORD: testpass
    ports:
      - 5432:5432
```

Step 4 — If tests are flaky (randomly pass/fail):
- Add retries to flaky tests
- Fix the underlying race condition or timing issue
- Do not simply re-run the pipeline — flaky tests will bite you in production

---

### Rollback Procedures

**When to rollback:**
- Error rate increases more than 5% after deployment
- P99 latency doubles after deployment
- Critical functionality broken (payment, auth, core feature)

**Kubernetes rollback:**

Step 1 — Verify the rollback target:
```bash
kubectl rollout history deployment/<name> -n production
```

Step 2 — Rollback to the previous version:
```bash
kubectl rollout undo deployment/<name> -n production
kubectl rollout status deployment/<name> -n production
```

Step 3 — Verify rollback succeeded:
```bash
kubectl get pods -n production
kubectl describe deployment/<name> -n production | grep Image:
```

Step 4 — Check error rates returned to baseline after rollback.

Step 5 — Create an incident ticket documenting what failed and why.

**Docker Compose rollback:**

```bash
# Tag your images with git SHA for easy rollback
docker tag myapp:latest myapp:$(git rev-parse --short HEAD)

# Rollback: change the image tag in docker-compose.yml to previous SHA
# Then:
docker-compose up -d --force-recreate
```

**Database migration rollback:**
NEVER auto-rollback database migrations. Rollback migrations manually and carefully:
```bash
# Django example
python manage.py migrate myapp 0023    # Roll back to migration 0023

# Alembic example
alembic downgrade -1    # Roll back one migration
```

Always take a database backup before any migration:
```bash
pg_dump -h localhost -U postgres mydb > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

### Secrets Management in CI/CD

**Never store secrets in:**
- Source code or configuration files committed to git
- Docker images (use `docker history` to verify — secrets in ENV are visible)
- Pipeline logs (mask all secrets)
- README or documentation files

**Correct approach — GitHub Actions:**
```yaml
# Store in GitHub Settings → Secrets → Actions
- name: Deploy
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  run: |
    aws s3 sync ./dist s3://my-bucket
```

**Correct approach — environment-specific secrets:**
```yaml
# Use environments with protection rules
environment: production
env:
  DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
```

**Rotate secrets after any exposure:**
1. Immediately revoke the exposed credential
2. Generate a new credential
3. Update all pipelines and services using it
4. Audit logs for any unauthorized use during the exposure window

---

### Pipeline Performance — Making Builds Faster

**Identify the bottleneck first:**
```bash
# Look at job timing in your CI dashboard
# The slowest step is your target
```

**Common optimizations:**

1. Cache dependencies:
```yaml
- uses: actions/cache@v3
  with:
    path: |
      ~/.cache/pip
      node_modules
    key: ${{ runner.os }}-deps-${{ hashFiles('requirements.txt', 'package-lock.json') }}
```

2. Run tests in parallel:
```yaml
strategy:
  matrix:
    python-version: ["3.10", "3.11"]
    test-suite: ["unit", "integration", "e2e"]
```

3. Only run expensive tests on main branch:
```yaml
- name: Run integration tests
  if: github.ref == 'refs/heads/main'
  run: pytest tests/integration/
```

4. Use smaller Docker base images:
- `python:3.11-slim` instead of `python:3.11` (saves ~800MB, ~2 min pull time)

5. Build Docker images only when Dockerfile or dependencies change:
```yaml
- name: Build image
  if: hashFiles('Dockerfile', 'requirements.txt') != hashFiles('Dockerfile', 'requirements.txt')
```

---

## Deployment Strategies

### Blue-Green Deployment
Run two identical environments. Switch traffic from blue (current) to green (new) atomically. Instant rollback by switching traffic back.

```bash
# With Kubernetes: update the service selector
kubectl patch service myapp -p '{"spec":{"selector":{"version":"green"}}}'

# Rollback
kubectl patch service myapp -p '{"spec":{"selector":{"version":"blue"}}}'
```

### Canary Deployment
Route a small percentage of traffic to the new version. Monitor error rates. Gradually increase percentage.

```bash
# With Kubernetes: run both deployments, adjust replica counts
# 10% canary: 1 new pod, 9 old pods
kubectl scale deployment myapp-canary --replicas=1
kubectl scale deployment myapp-stable --replicas=9
```

### Feature Flags
Deploy code but control activation with flags. Allows deployment to be decoupled from release.
Use for: gradual rollout, A/B testing, instant kill switch if new feature causes issues.
