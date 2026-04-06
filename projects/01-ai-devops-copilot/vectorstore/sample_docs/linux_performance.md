# Linux Performance and System Troubleshooting

## CPU Troubleshooting

```bash
# Top processes by CPU
top -bn1 | head -20
htop  # interactive, better UI

# Find what's consuming CPU
ps aux --sort=-%cpu | head -10

# CPU usage per core
mpstat -P ALL 1 5

# Load average (1, 5, 15 min)
uptime
# Rule of thumb: load avg / num CPUs > 1 = saturated

# Check for CPU throttling (cloud instances)
cat /sys/fs/cgroup/cpu/cpu.stat | grep throttled

# Profile a process
perf top -p <pid>
strace -c -p <pid>  # System call summary
```

## Memory Troubleshooting

```bash
# Memory overview
free -h
cat /proc/meminfo

# What's using memory
ps aux --sort=-%mem | head -10
smem -tk  # Better memory breakdown per process

# Check for memory leaks (growing processes)
watch -n5 'ps aux --sort=-%mem | head -10'

# Check OOM killer logs
dmesg | grep -i "killed process"
journalctl -k | grep -i oom

# Clear page cache (temporary fix, not production)
echo 3 > /proc/sys/vm/drop_caches

# Check swap usage
swapon --show
cat /proc/swaps
vmstat 1 10  # Watch swap activity
```

## Disk Troubleshooting

```bash
# Disk usage overview
df -h
df -i  # Check inodes (can run out before disk space)

# Find large files
du -sh /* 2>/dev/null | sort -rh | head -20
find / -size +1G -not -path /proc/* 2>/dev/null

# Find large directories
du -h --max-depth=2 /var | sort -rh | head -20

# Disk I/O performance
iostat -xz 1 5
iotop  # Which processes are doing I/O

# Check disk health
smartctl -a /dev/sda

# Check for full disk causing issues
df -h | grep -E "9[0-9]%|100%"
```

## Network Troubleshooting

```bash
# Check connectivity
ping -c 4 google.com
traceroute google.com
mtr google.com  # Combines ping + traceroute

# DNS resolution
nslookup api.example.com
dig api.example.com +short
dig @8.8.8.8 api.example.com  # Use specific DNS server

# Port connectivity
nc -zv api.example.com 443
telnet api.example.com 443
curl -v https://api.example.com/health

# Active connections
ss -tuln  # Listening ports
ss -tnp   # TCP connections with process info
netstat -tulnp  # Older alternative

# Network interface stats
ip -s link
ifstat 1 10

# Capture traffic
tcpdump -i eth0 -n port 8080
tcpdump -i any -n host 10.0.1.5 -w /tmp/capture.pcap
```

## Process Management

```bash
# Find a process
pgrep -la python
ps aux | grep uvicorn

# Check process resource usage
cat /proc/<pid>/status
cat /proc/<pid>/limits
lsof -p <pid>  # Open files and connections

# Send signals
kill -15 <pid>   # Graceful shutdown (SIGTERM)
kill -9 <pid>    # Force kill (SIGKILL) - last resort
killall uvicorn  # Kill all processes with this name

# Systemd service management
systemctl status myapp
systemctl restart myapp
journalctl -u myapp -f  # Follow service logs
journalctl -u myapp --since "1 hour ago"

# Check ulimits (open file descriptors etc)
ulimit -a
cat /proc/<pid>/limits
```

## Log Analysis

```bash
# Real-time log following
tail -f /var/log/app.log
journalctl -f

# Search logs
grep -r "ERROR" /var/log/
grep -E "ERROR|WARN" /var/log/app.log | tail -100
zgrep "ERROR" /var/log/app.log.gz  # Search compressed logs

# Count errors by type
grep "ERROR" app.log | awk '{print $NF}' | sort | uniq -c | sort -rn

# Log rotation
logrotate -f /etc/logrotate.d/myapp
ls -lh /var/log/app.log*
```

## System Performance Baseline

```bash
# Quick system health check script
echo "=== CPU ==="
uptime && mpstat 1 1

echo "=== Memory ==="
free -h

echo "=== Disk ==="
df -h && iostat -x 1 1

echo "=== Network ==="
ss -s && ip -s link show eth0

echo "=== Top Processes ==="
ps aux --sort=-%cpu | head -6

echo "=== Recent OOM Events ==="
dmesg | grep -i "oom\|killed" | tail -5

echo "=== Failed Services ==="
systemctl --failed
```

## File Descriptor Limits (Common Cause of Production Issues)

```bash
# Check current limits
cat /proc/sys/fs/file-max  # System-wide max
ulimit -n  # Current session limit

# Fix for high-traffic applications
# /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536

# Apply without reboot
sysctl -w fs.file-max=100000
echo "fs.file-max = 100000" >> /etc/sysctl.conf
sysctl -p
```
