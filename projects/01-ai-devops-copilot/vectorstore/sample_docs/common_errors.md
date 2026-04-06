# Common DevOps Error Patterns — Causes and Fixes

## Database Connection Timeouts

**Symptoms:** Application logs show `connection timed out`, `too many connections`, or slow query warnings.

**Cause:** Connection pool exhaustion (e.g., `max_connections=100` in PostgreSQL hit), or network latency spikes between app and DB.

**Fix:**
1. Deploy PgBouncer in transaction mode between application and PostgreSQL
2. Reduce `pool_size` in each application instance
3. Add `statement_timeout` and `idle_in_transaction_session_timeout` in PostgreSQL config
4. Check for long-running queries: `SELECT pid, now() - query_start, query FROM pg_stat_activity WHERE state='active' ORDER BY 2 DESC;`

```ini
# pgbouncer.ini
[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
```

## Memory Leaks in Node.js Services

**Symptoms:** Steadily increasing memory usage over hours/days, eventual OOMKilled or process crash.

**Cause:** Event listener accumulation, unclosed database cursors, growing in-memory caches without TTL, circular references.

**Diagnosis:**
```bash
# Get heap snapshot
node --inspect app.js
# Then in Chrome DevTools: Memory > Take heap snapshot > Compare snapshots
```

**Fix:**
1. Use `WeakMap`/`WeakRef` for caches
2. Set TTL on all cache entries (use `lru-cache` library)
3. Always `removeEventListener` in cleanup functions
4. Use `--max-old-space-size` to limit heap and force GC pressure visibility

## Docker Networking Issues

**Symptoms:** Containers can't reach each other, DNS resolution fails inside containers.

**Cause:** Containers on different networks, missing network aliases, or conflicting subnet CIDRs.

**Fix:**
```bash
# Check which networks a container is attached to
docker inspect <container> | jq '.[].NetworkSettings.Networks'

# Ensure both containers are on the same network
docker network connect my-network container-a
docker network connect my-network container-b

# Test DNS resolution inside container
docker exec container-a nslookup container-b
```

In `docker-compose.yml`, ensure services share a network and reference each other by service name.

## SSL Certificate Expiry

**Symptoms:** `SSL_ERROR_RX_RECORD_TOO_LONG`, browser certificate warnings, `certificate has expired` in logs.

**Cause:** Certificate not renewed before expiry. Common with manually managed certs.

**Fix:**
```bash
# Check expiry date
echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -dates

# Renew with certbot
certbot renew --nginx --dry-run
certbot renew --nginx
```

Use `cert-manager` in Kubernetes for automatic renewal with Let's Encrypt.

## Nginx 502 Bad Gateway

**Symptoms:** Clients receive `502 Bad Gateway`. Nginx error log shows `connect() failed (111: Connection refused) while connecting to upstream`.

**Cause:** The upstream service (app server) is down, overloaded, or listening on wrong port.

**Diagnosis:**
```bash
tail -f /var/log/nginx/error.log
curl -v http://upstream-host:port/health
```

**Fix:**
1. Verify upstream service is running: `systemctl status app-service`
2. Check the `upstream` block in nginx.conf matches actual service address/port
3. Increase `proxy_read_timeout` if the app is slow: `proxy_read_timeout 120s;`
4. Check app logs for panics or startup failures

## Redis Connection Refused

**Symptoms:** Application throws `Error: connect ECONNREFUSED 127.0.0.1:6379` or `Connection refused`.

**Cause:** Redis process crashed, sentinel failover changed the primary, wrong host/port configured.

**Fix:**
```bash
# Check Redis status
redis-cli -h <host> -p <port> ping

# After sentinel failover, find new primary
redis-cli -h sentinel-host -p 26379 sentinel get-master-addr-by-name mymaster

# Update app config with new primary address
# Or use Redis Sentinel-aware client library (e.g., ioredis with sentinels array)
```

Always configure applications with Sentinel addresses rather than direct Redis addresses to handle failovers automatically.
