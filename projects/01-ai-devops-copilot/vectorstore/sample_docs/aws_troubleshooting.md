# AWS Troubleshooting Guide

## EC2 Issues

### Can't SSH Into Instance
```bash
# Check instance state
aws ec2 describe-instances --instance-ids i-xxxx --query 'Reservations[].Instances[].State'

# Check security group allows SSH (port 22) from your IP
aws ec2 describe-security-groups --group-ids sg-xxxx

# Check the correct key pair is being used
ssh -i ~/.ssh/key.pem -v ubuntu@<public-ip>

# If instance unreachable, check VPC route tables and internet gateway
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-xxxx"
```

### EC2 Instance High CPU/Memory
```bash
# Enable detailed monitoring
aws ec2 monitor-instances --instance-ids i-xxxx

# View CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-xxxx \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T01:00:00Z \
  --period 300 \
  --statistics Average

# SSH in and check processes
top -bn1 | head -20
ps aux --sort=-%mem | head -10
```

### Instance Won't Stop/Terminate
```bash
# Force stop
aws ec2 stop-instances --instance-ids i-xxxx --force

# Check for termination protection
aws ec2 describe-instance-attribute --instance-id i-xxxx --attribute disableApiTermination

# Disable termination protection
aws ec2 modify-instance-attribute --instance-id i-xxxx --no-disable-api-termination
```

## ECS (Elastic Container Service) Issues

### Task Fails to Start
```bash
# Check task definition
aws ecs describe-task-definition --task-definition myapp:5

# Check stopped tasks for failure reason
aws ecs list-tasks --cluster mycluster --desired-status STOPPED
aws ecs describe-tasks --cluster mycluster --tasks <task-arn>

# View CloudWatch logs
aws logs get-log-events \
  --log-group-name /ecs/myapp \
  --log-stream-name ecs/myapp/<task-id>
```

**Common ECS failure reasons:**
- `CannotPullContainerError` — ECR image not found or IAM role missing ECR permissions
- `OutOfMemory` — Increase task memory in task definition
- `DockerTimeoutError` — Container takes too long to start; increase `startTimeout`

### ECS Service Not Scaling
```bash
# Check service auto-scaling
aws application-autoscaling describe-scalable-targets \
  --service-namespace ecs

# Check CloudWatch alarms triggering scaling
aws cloudwatch describe-alarms --alarm-names myapp-cpu-alarm
```

## RDS Issues

### Connection Refused
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier mydb

# Verify security group allows inbound on port 5432/3306
aws ec2 describe-security-groups --group-ids sg-rds-xxxx

# Check parameter group for max_connections
aws rds describe-db-parameters --db-parameter-group-name my-pg-group \
  --query 'Parameters[?ParameterName==`max_connections`]'
```

### RDS High CPU / Slow Queries
```sql
-- Find slow queries (PostgreSQL)
SELECT pid, now() - query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle' AND query_start < now() - interval '5 minutes'
ORDER BY duration DESC;

-- Kill long-running query
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = <pid>;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats WHERE tablename = 'orders';
```

## S3 Issues

### Access Denied
```bash
# Check bucket policy
aws s3api get-bucket-policy --bucket mybucket

# Check IAM role/user permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789:role/myrole \
  --action-names s3:GetObject \
  --resource-arns arn:aws:s3:::mybucket/*

# Check S3 Block Public Access settings
aws s3api get-public-access-block --bucket mybucket
```

### S3 High Costs
```bash
# Analyze S3 storage classes
aws s3api list-objects-v2 --bucket mybucket \
  --query 'Contents[].{Key:Key,Size:Size,StorageClass:StorageClass}'

# Enable S3 Intelligent-Tiering for automatic cost optimization
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket mybucket \
  --id my-config \
  --intelligent-tiering-configuration '{"Id":"my-config","Status":"Enabled","Tierings":[{"Days":90,"AccessTier":"ARCHIVE_ACCESS"}]}'
```

## IAM Issues

### Access Denied Errors
```bash
# Check effective permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789:user/myuser \
  --action-names ec2:StartInstances \
  --resource-arns arn:aws:ec2:us-east-1:123456789:instance/i-xxxx

# Check CloudTrail for the exact denied action
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=RunInstances \
  --start-time 2024-01-01T00:00:00Z
```

## CloudWatch Logs

```bash
# Stream logs in real time
aws logs tail /aws/lambda/myfunction --follow

# Search logs with filter pattern
aws logs filter-log-events \
  --log-group-name /aws/ecs/myapp \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s000)

# Export logs to S3
aws logs create-export-task \
  --log-group-name /aws/ecs/myapp \
  --from $(date -d '24 hours ago' +%s000) \
  --to $(date +%s000) \
  --destination mybucket \
  --destination-prefix logs/
```

## Cost Optimization

```bash
# Find unused resources
# Unattached EBS volumes
aws ec2 describe-volumes --filters Name=status,Values=available

# Unassociated Elastic IPs (costing money)
aws ec2 describe-addresses --query 'Addresses[?AssociationId==null]'

# Old snapshots
aws ec2 describe-snapshots --owner-ids self \
  --query 'Snapshots[?StartTime<`2023-01-01`].[SnapshotId,StartTime,VolumeSize]'

# Stop non-production instances on schedule using EventBridge + Lambda
```
