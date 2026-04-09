# Kubernetes Operations Runbook

## Pod States and Troubleshooting

### CrashLoopBackOff

**What it means:**
A pod is repeatedly starting, crashing, and being restarted by Kubernetes. After each crash, Kubernetes waits progressively longer before restarting (exponential backoff). The pod never reaches a healthy Running state.

**Common causes:**
1. Application exits immediately on startup due to a missing configuration or environment variable
2. The container command or entrypoint is wrong or not a long-running process
3. The application crashes due to an unhandled exception at startup
4. Missing or misconfigured secrets/ConfigMaps that the app depends on
5. OOMKilled on startup (container immediately exceeds memory limit)

**Step-by-step resolution:**

Step 1 — Check pod status and restart count:
```bash
kubectl get pods -n <namespace>
kubectl describe pod <pod-name> -n <namespace>
```
Look at the Events section at the bottom of describe output. The exit code matters:
- Exit code 0: container ran successfully but exited — missing long-running command
- Exit code 1: application error — check logs
- Exit code 137: OOMKilled — increase memory limit
- Exit code 139: segfault — application bug

Step 2 — Check recent logs (even if pod is crashing):
```bash
kubectl logs <pod-name> -n <namespace> --previous
```
The `--previous` flag gets logs from the last crashed instance.

Step 3 — Check environment variables and secrets:
```bash
kubectl describe pod <pod-name> | grep -A 20 "Environment:"
kubectl get secret <secret-name> -n <namespace> -o yaml
```

Step 4 — If the container has no long-running process, fix the deployment:
```yaml
# Wrong — busybox with no command exits immediately
containers:
  - name: app
    image: busybox

# Correct — add a long-running command
containers:
  - name: app
    image: busybox
    command: ["sleep", "infinity"]
```

Step 5 — Apply the fix and verify:
```bash
kubectl apply -f deployment.yaml
kubectl rollout status deployment/<name> -n <namespace>
kubectl get pods -n <namespace> -w
```

---

### OOMKilled (Out of Memory Killed)

**What it means:**
The container exceeded its memory limit. The Linux kernel killed the process. Exit code is 137.

**Step-by-step resolution:**

Step 1 — Identify memory usage:
```bash
kubectl top pod <pod-name> -n <namespace>
kubectl describe pod <pod-name> | grep -A 5 "Limits:"
```

Step 2 — Increase the memory limit in your deployment:
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

Step 3 — Apply and monitor:
```bash
kubectl apply -f deployment.yaml
kubectl top pod -n <namespace> -w
```

Step 4 — If memory keeps growing, the application has a memory leak. Profile the application.

---

### ImagePullBackOff / ErrImagePull

**What it means:**
Kubernetes cannot pull the container image from the registry.

**Common causes:**
1. Image name or tag is wrong (typo)
2. Image does not exist in the registry
3. Private registry requires credentials (imagePullSecrets not configured)
4. Network issue reaching the registry

**Step-by-step resolution:**

Step 1 — Check the exact error:
```bash
kubectl describe pod <pod-name> | grep -A 10 "Events:"
```

Step 2 — Verify the image exists:
```bash
docker pull <image-name>:<tag>
```

Step 3 — If private registry, create a pull secret:
```bash
kubectl create secret docker-registry regcred \
  --docker-server=<registry> \
  --docker-username=<username> \
  --docker-password=<password> \
  -n <namespace>
```

Step 4 — Add imagePullSecrets to the deployment:
```yaml
spec:
  imagePullSecrets:
    - name: regcred
  containers:
    - name: app
      image: private-registry/myapp:latest
```

---

### Pod Stuck in Pending

**What it means:**
The pod has been accepted by Kubernetes but cannot be scheduled onto a node.

**Common causes:**
1. Insufficient CPU or memory on all nodes
2. Node selector or affinity rules don't match any node
3. PersistentVolumeClaim not bound

**Step-by-step resolution:**

Step 1 — Check why it's pending:
```bash
kubectl describe pod <pod-name> | grep -A 20 "Events:"
```
Look for "Insufficient cpu", "Insufficient memory", or "didn't match node selector"

Step 2 — Check node capacity:
```bash
kubectl describe nodes | grep -A 5 "Allocated resources:"
```

Step 3 — If resource constraints, reduce requests or add a node.

Step 4 — If node selector issue, check node labels:
```bash
kubectl get nodes --show-labels
```

---

## Deployment Operations

### Rolling Restart (zero downtime)
```bash
kubectl rollout restart deployment/<name> -n <namespace>
kubectl rollout status deployment/<name> -n <namespace>
```

### Rollback a Deployment
```bash
# Check rollout history
kubectl rollout history deployment/<name> -n <namespace>

# Rollback to previous version
kubectl rollout undo deployment/<name> -n <namespace>

# Rollback to specific revision
kubectl rollout undo deployment/<name> --to-revision=2 -n <namespace>
```

### Scale a Deployment
```bash
kubectl scale deployment/<name> --replicas=3 -n <namespace>
```

### Check Resource Usage Across All Pods
```bash
kubectl top pods -n <namespace> --sort-by=memory
kubectl top nodes
```

---

## Resource Limits Best Practices

Always set both requests and limits. Without limits, a single pod can consume all node resources.

```yaml
resources:
  requests:
    memory: "128Mi"    # Guaranteed allocation
    cpu: "100m"        # 0.1 CPU core
  limits:
    memory: "256Mi"    # Hard cap — exceed this = OOMKilled
    cpu: "500m"        # Soft cap — CPU throttled, not killed
```

Rule of thumb:
- Set memory limit to 2x the memory request
- Set CPU limit to 5x the CPU request
- Monitor with `kubectl top` and adjust based on real usage
