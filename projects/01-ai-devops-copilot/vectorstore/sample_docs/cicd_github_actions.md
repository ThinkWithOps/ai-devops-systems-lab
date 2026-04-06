# CI/CD and GitHub Actions Guide

## GitHub Actions Fundamentals

### Basic Pipeline Structure
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      - run: pip install -r requirements.txt
      - run: pytest --cov=app tests/

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: myregistry/myapp:${{ github.sha }}
```

## Common GitHub Actions Failures

### Workflow Timed Out
```yaml
# Set timeout to prevent runaway jobs
jobs:
  deploy:
    timeout-minutes: 30
    steps:
      - name: Deploy
        timeout-minutes: 10
        run: ./deploy.sh
```

### Cache Not Working
```yaml
- name: Cache pip dependencies
  uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-
```

Cache key must change when dependencies change. Use `hashFiles` on your lockfile.

### Secrets Not Available in PR from Forks
Secrets are not available in workflows triggered by pull requests from forks (security restriction). Use environment protection rules:
```yaml
jobs:
  deploy:
    environment: production  # requires approval
    steps:
      - run: echo ${{ secrets.DEPLOY_KEY }}
```

### Docker Build Slow in CI
```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build with cache
  uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
    push: true
    tags: myapp:${{ github.sha }}
```

## Deployment Strategies

### Blue-Green Deployment
```bash
# Deploy new version (green) alongside old (blue)
kubectl set image deployment/myapp-green myapp=myapp:v2.0.0

# Wait for green to be ready
kubectl rollout status deployment/myapp-green

# Switch traffic by updating service selector
kubectl patch service myapp -p '{"spec":{"selector":{"version":"green"}}}'

# If issues arise, instantly rollback
kubectl patch service myapp -p '{"spec":{"selector":{"version":"blue"}}}'
```

### Canary Deployment
```yaml
# Send 10% traffic to canary
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
spec:
  http:
  - route:
    - destination:
        host: myapp
        subset: stable
      weight: 90
    - destination:
        host: myapp
        subset: canary
      weight: 10
```

### Rolling Update with Kubernetes
```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1    # Max pods unavailable during update
      maxSurge: 1          # Max extra pods during update
```

## Pipeline Best Practices

### Fail Fast
```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: ruff check .  # Fast linting first

  test:
    needs: lint  # Only run tests if lint passes
    strategy:
      matrix:
        python-version: ['3.10', '3.11', '3.12']
    steps:
      - run: pytest -x  # Stop on first failure
```

### Environment-Specific Deployments
```yaml
jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - run: ./deploy.sh staging

  deploy-production:
    if: github.ref == 'refs/heads/main'
    environment: production
    needs: deploy-staging
    steps:
      - run: ./deploy.sh production
```

### Rollback Strategy
```bash
# Kubernetes rollback
kubectl rollout undo deployment/myapp
kubectl rollout undo deployment/myapp --to-revision=3

# Check rollout history
kubectl rollout history deployment/myapp

# GitHub Actions: trigger rollback workflow
gh workflow run rollback.yml -f version=v1.2.3
```

## Security in CI/CD

```yaml
# Never print secrets
- run: echo "::add-mask::${{ secrets.API_KEY }}"

# Scan for secrets in code
- uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: main
    head: HEAD

# Container vulnerability scanning
- name: Run Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:${{ github.sha }}
    severity: CRITICAL,HIGH
    exit-code: 1  # Fail pipeline on critical vulnerabilities
```

## Monitoring Pipeline Health

```bash
# GitHub CLI — check recent workflow runs
gh run list --limit 10 --workflow=ci.yml

# Get details of a failed run
gh run view <run-id> --log-failed

# Re-run failed jobs only
gh run rerun <run-id> --failed-only

# Watch a run in real time
gh run watch <run-id>
```
