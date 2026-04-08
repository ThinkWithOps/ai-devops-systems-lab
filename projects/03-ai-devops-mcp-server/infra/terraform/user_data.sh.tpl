#!/bin/bash
set -e

# ── Get public IP ─────────────────────────────────────────────────────────────
PUBLIC_IP=$(curl -sf http://169.254.169.254/latest/meta-data/public-ipv4)

# ── Install Docker ────────────────────────────────────────────────────────────
apt-get update -y
apt-get install -y docker.io
systemctl enable docker
systemctl start docker

# Allow ubuntu user to run docker without sudo
usermod -aG docker ubuntu

# Expose Docker daemon on TCP so MCP server can connect remotely
mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/override.conf << 'EOF'
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd -H fd:// -H tcp://0.0.0.0:2375
EOF
systemctl daemon-reload
systemctl restart docker

# ── Run demo Docker containers ────────────────────────────────────────────────
# Healthy web server
docker run -d --name web-server --restart unless-stopped -p 80:80 nginx:1.25

# Healthy cache service
docker run -d --name cache-service --restart unless-stopped redis:7-alpine

# API mock service
docker run -d --name api-service --restart unless-stopped -p 8080:80 nginx:1.25

# ── Install k3s with public IP in TLS cert ────────────────────────────────────
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--tls-san $PUBLIC_IP" sh -

# Wait for k3s to be ready
sleep 20

# Make kubeconfig readable so we can scp it
chmod 644 /etc/rancher/k3s/k3s.yaml

# ── Deploy Kubernetes demo apps ───────────────────────────────────────────────
mkdir -p /home/ubuntu/k8s
cat > /home/ubuntu/k8s/demo-apps.yaml << 'EOF'
# Healthy nginx pod
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
---
# Intentionally broken app — will CrashLoopBackOff
apiVersion: apps/v1
kind: Deployment
metadata:
  name: broken-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: broken-app
  template:
    metadata:
      labels:
        app: broken-app
    spec:
      containers:
      - name: broken-app
        image: busybox
        command: ["/bin/sh", "-c", "echo 'Starting...' && sleep 5 && exit 1"]
        resources:
          requests:
            memory: "32Mi"
            cpu: "10m"
---
# Redis — healthy background service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
EOF

kubectl apply -f /home/ubuntu/k8s/demo-apps.yaml --kubeconfig /etc/rancher/k3s/k3s.yaml

echo "Bootstrap complete — Docker containers and k3s running"
