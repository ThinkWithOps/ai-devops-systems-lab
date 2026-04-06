# Monitoring and Observability Guide

## Prometheus

### Key Concepts
- **Counter**: Only goes up (request count, error count)
- **Gauge**: Can go up or down (memory usage, queue depth)
- **Histogram**: Samples observations in buckets (request duration)
- **Summary**: Similar to histogram but calculates quantiles client-side

### Essential PromQL Queries
```promql
# Request rate (per second, 5-minute window)
rate(http_requests_total[5m])

# Error rate percentage
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100

# P99 latency from histogram
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage percentage
(container_memory_usage_bytes / container_spec_memory_limit_bytes) * 100

# CPU throttling
rate(container_cpu_throttled_seconds_total[5m])

# Kubernetes pod restarts in last hour
increase(kube_pod_container_status_restarts_total[1h]) > 0
```

### Alerting Rules
```yaml
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: SlowResponseTime
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency above 2 seconds"

      - alert: PodMemoryHigh
        expr: (container_memory_usage_bytes / container_spec_memory_limit_bytes) > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pod memory usage above 90%"
```

## Grafana

### Useful Dashboard Panels

**Request Rate + Error Rate (RED Method):**
```
# Rate
sum(rate(http_requests_total[5m])) by (service)

# Errors
sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)

# Duration (P99)
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))
```

**USE Method (for infrastructure):**
```
# Utilization (CPU)
100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Saturation (CPU throttling)
sum(rate(container_cpu_throttled_seconds_total[5m])) by (pod)

# Errors (disk)
rate(node_disk_io_time_seconds_total[5m])
```

## Log Aggregation

### Structured Logging Best Practices
```python
import structlog

logger = structlog.get_logger()

# Good - structured fields, searchable
logger.info("order_created",
    order_id=order.id,
    customer_id=customer.id,
    amount=order.total,
    duration_ms=elapsed)

# Bad - unstructured, hard to query
logger.info(f"Order {order.id} created for customer {customer.id}")
```

### Log Levels Guide
- **ERROR**: Something failed that requires immediate attention
- **WARNING**: Something unexpected happened but the system recovered
- **INFO**: Normal operational events (startup, request processed, order created)
- **DEBUG**: Detailed diagnostic information (only in development)

### Searching Logs Effectively
```bash
# CloudWatch Logs Insights
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100

# Loki (LogQL)
{app="myapp", env="production"} |= "ERROR" | json | line_format "{{.msg}}"

# ELK Stack (Kibana)
# Query: level:ERROR AND service:api-gateway AND @timestamp:[now-1h TO now]
```

## Distributed Tracing

### OpenTelemetry Setup
```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
exporter = OTLPSpanExporter(endpoint="http://jaeger:4317")
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("process_order") as span:
    span.set_attribute("order.id", order_id)
    span.set_attribute("order.amount", amount)
    result = process_order(order_id)
```

## SLIs, SLOs, and SLAs

### Defining Good SLOs
```yaml
# Example SLO definitions
slos:
  - name: API Availability
    sli: rate(http_requests_total{status!~"5.."}[30d]) / rate(http_requests_total[30d])
    target: 99.9%  # Allows ~43 minutes downtime/month

  - name: API Latency
    sli: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[30d]))
    target: < 500ms  # P99 under 500ms

  - name: Error Budget
    # If SLO is 99.9%, error budget is 0.1% = 43.8 min/month
    # If you burn >50% error budget in a week, page on-call
    burn_rate_alert: 14.4x  # Exhausts monthly budget in 1 hour
```

## On-Call Best Practices

### Incident Response Runbook Template
```
1. DETECT: Alert fires / user report received
2. TRIAGE: Assess severity (P1=all users affected, P2=partial, P3=degraded)
3. COMMUNICATE: Post in #incidents channel with initial assessment
4. INVESTIGATE:
   - Check metrics dashboard (Grafana)
   - Check error logs (CloudWatch/Loki)
   - Check recent deployments (git log / deployment history)
   - Check downstream dependencies
5. MITIGATE: Rollback / feature flag / scale up
6. RESOLVE: Confirm metrics return to normal
7. POSTMORTEM: Write RCA within 48 hours
```

### Key Metrics to Check During Incident
```bash
# Error rate spiked? Check which endpoint
rate(http_requests_total{status=~"5.."}[5m]) by (endpoint)

# Latency spiked? Check database queries
histogram_quantile(0.99, rate(db_query_duration_seconds_bucket[5m])) by (query_type)

# Traffic spike causing issues?
rate(http_requests_total[5m]) vs rate(http_requests_total[5m] offset 1h)

# Recent pod restarts?
increase(kube_pod_container_status_restarts_total[30m]) > 0
```
