# Kubernetes Troubleshooting Guide

## Common Pod Failure States

### CrashLoopBackOff

A pod enters `CrashLoopBackOff` when it repeatedly crashes on startup.

**Diagnosis:**
```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> --previous -n <namespace>
kubectl events --for pod/<pod-name> -n <namespace>
```

**Common causes:**
1. Application startup error (missing env var, config file not found)
2. Missing dependency (can't connect to database on startup)
3. Incorrect entrypoint or command in Dockerfile
4. Permission denied on mounted volumes

**Fix:** Check `kubectl logs --previous` for the actual error before the crash. Fix the application or init container.

### OOMKilled (Out of Memory)

Container is killed by the kernel because it exceeded its memory limit.

**Diagnosis:**
```bash
kubectl describe pod <pod-name> | grep -A5 "Last State"
kubectl top pod <pod-name> --containers
```

Look for `Reason: OOMKilled` and `Exit Code: 137`.

**Solutions:**
1. Increase memory limit: `resources.limits.memory: 1Gi`
2. Add Horizontal Pod Autoscaler (HPA) to spread load
3. Profile the application for memory leaks (heap dumps, pprof)
4. Optimize application memory usage (connection pooling, caching)

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### ImagePullBackOff

Kubernetes cannot pull the container image.

**Diagnosis:**
```bash
kubectl describe pod <pod-name> | grep -A10 Events
```

**Common causes and fixes:**
- **Wrong image name/tag**: Verify with `docker pull <image>:<tag>` locally
- **Private registry**: Create and reference an `imagePullSecret`
- **Rate limiting** (Docker Hub): Use authenticated pulls or mirror the image to ECR/GCR
- **Network issue**: Check if the node can reach the registry (`curl -I https://registry-1.docker.io`)

```bash
kubectl create secret docker-registry regcred \
  --docker-server=<registry> \
  --docker-username=<user> \
  --docker-password=<token>
```

## Resource Quota Exceeded

When namespace resource quotas are exceeded, new pods won't be scheduled.

```bash
kubectl describe resourcequota -n <namespace>
kubectl get events -n <namespace> | grep FailedCreate
```

Request a quota increase or optimize existing workloads:
```bash
kubectl top pods -n <namespace> --sort-by=memory
```

## Service Mesh Issues (Istio/Linkerd)

Common symptoms: 503s, unexpected timeouts, mutual TLS failures.

**Diagnosis:**
```bash
istioctl analyze -n <namespace>
kubectl logs <pod> -c istio-proxy
istioctl proxy-config cluster <pod> | grep <service>
```

Check that `DestinationRule` and `VirtualService` configs are correct and that sidecars are injected.

## Essential kubectl Diagnostic Commands

```bash
# Check pod status across all namespaces
kubectl get pods -A --field-selector=status.phase!=Running

# Describe failing pod (events, conditions, resource usage)
kubectl describe pod <name> -n <ns>

# Stream logs with timestamps
kubectl logs -f <name> -n <ns> --timestamps=true

# Execute into a running pod
kubectl exec -it <name> -n <ns> -- /bin/sh

# Check node resource pressure
kubectl describe node <node> | grep -A10 Conditions

# Force delete stuck terminating pod
kubectl delete pod <name> -n <ns> --grace-period=0 --force

# Check HPA status
kubectl describe hpa -n <namespace>
```
