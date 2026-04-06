# CI/CD Pipeline Best Practices and Troubleshooting Guide

## Overview

This guide covers CI/CD pipeline best practices for GitHub Actions, common failure patterns, and debugging strategies for delivery pipeline issues.

## GitHub Actions Common Failures

### Checkout Errors

The `actions/checkout` step fails most commonly due to:

1. **Missing permissions**: The `GITHUB_TOKEN` lacks `contents: read` permission. Fix by adding `permissions: contents: read` to the workflow.
2. **Submodule issues**: Submodules aren't fetched by default. Use `with: submodules: recursive`.
3. **LFS files missing**: Add `lfs: true` to the checkout action config.

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
    submodules: recursive
    lfs: true
```

### Permission Issues

Common permission errors in workflows:

- **403 on package registry push**: Add `packages: write` to job permissions.
- **Unable to push Docker image**: Set `DOCKER_USERNAME` and `DOCKER_PASSWORD` as repository secrets.
- **kubectl unauthorized**: Ensure the service account has correct RBAC roles in the target cluster.

### Artifact Size Limits

GitHub Actions enforces a **500MB per artifact** and **2GB total per workflow run** limit. To resolve:

1. Compress artifacts: `tar -czf report.tar.gz ./test-reports/`
2. Use `.artifactignore` to exclude large files
3. Consider uploading to S3 for very large artifacts
4. Delete old artifacts programmatically using the GitHub API

## Debugging Failing Workflows

### Step 1: Inspect the logs

```bash
# Using GitHub CLI
gh run view <run-id> --log-failed
gh run download <run-id>
```

### Step 2: Enable debug logging

Set repository secrets:
- `ACTIONS_RUNNER_DEBUG=true`
- `ACTIONS_STEP_DEBUG=true`

### Step 3: Re-run with SSH access

Use `tmate` or `mxschmitt/action-tmate` action to get interactive SSH access to the runner for debugging.

## Deployment Strategies

### Blue-Green Deployment

Maintain two identical production environments. Route traffic to blue, deploy to green, then switch the load balancer.

```bash
kubectl patch service api-gateway -p '{"spec":{"selector":{"version":"green"}}}'
```

**Rollback**: Switch the load balancer back to blue instantly.

### Canary Deployment

Gradually shift traffic to the new version:

```yaml
# Argo Rollouts canary example
spec:
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: {duration: 5m}
      - setWeight: 50
      - pause: {duration: 10m}
```

Monitor error rate and latency at each step before promoting.

## Common Workflow Optimization Tips

1. **Cache dependencies**: Use `actions/cache` with a hash of your lockfile as the cache key
2. **Parallelize jobs**: Split unit and integration tests into parallel jobs
3. **Conditional steps**: Use `if: github.ref == 'refs/heads/main'` to skip deploy steps on PRs
4. **Reusable workflows**: Extract common patterns into `.github/workflows/reusable-*.yml`
5. **Dependabot**: Enable to keep Actions and dependencies up to date automatically
