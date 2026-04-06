# Terraform and Infrastructure as Code Guide

## Terraform Fundamentals

### State Management
```bash
# Always use remote state for teams
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock"  # Prevents concurrent applies
    encrypt        = true
  }
}
```

### Common Commands
```bash
terraform init          # Initialize, download providers
terraform plan          # Preview changes (always run before apply)
terraform apply         # Apply changes
terraform destroy       # Destroy all resources (DANGEROUS)
terraform state list    # List all resources in state
terraform state show    # Show details of a resource
terraform import        # Import existing resource into state
terraform taint         # Mark resource for recreation
terraform refresh       # Sync state with real infrastructure
```

## Common Terraform Issues

### State Lock Issues
```bash
# If apply fails and state is locked
terraform force-unlock <lock-id>

# View lock info
aws dynamodb get-item \
  --table-name terraform-state-lock \
  --key '{"LockID": {"S": "my-bucket/terraform.tfstate"}}'
```

### Resource Already Exists
```bash
# Import existing resource into state instead of recreating
terraform import aws_security_group.main sg-0abc123def

# Or use data sources to reference existing resources
data "aws_security_group" "existing" {
  filter {
    name   = "tag:Name"
    values = ["my-existing-sg"]
  }
}
```

### Avoiding Resource Replacement

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"

  lifecycle {
    # Prevent replacement when AMI updates
    ignore_changes = [ami, user_data]

    # Prevent accidental destruction
    prevent_destroy = true

    # Create new resource before destroying old (zero-downtime)
    create_before_destroy = true
  }
}
```

### Sensitive Data in State
```hcl
# Mark outputs as sensitive to hide from logs
output "db_password" {
  value     = aws_db_instance.main.password
  sensitive = true
}

# Use AWS Secrets Manager instead of storing secrets in variables
data "aws_secretsmanager_secret_version" "db" {
  secret_id = "prod/db/password"
}
```

## Terraform Best Practices

### Module Structure
```
infrastructure/
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── ec2/
│   └── rds/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   └── terraform.tfvars
│   └── prod/
│       ├── main.tf
│       └── terraform.tfvars
└── versions.tf
```

### Variable Validation
```hcl
variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "instance_type" {
  type    = string
  default = "t3.micro"

  validation {
    condition     = can(regex("^t[23]\\.", var.instance_type))
    error_message = "Only t2/t3 instance types allowed for cost control."
  }
}
```

### Workspaces for Multi-Environment
```bash
# Create workspaces per environment
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# Use workspace in config
resource "aws_instance" "app" {
  instance_type = terraform.workspace == "prod" ? "t3.large" : "t3.micro"
  tags = {
    Environment = terraform.workspace
  }
}
```

## Terragrunt (DRY Terraform)

```hcl
# terragrunt.hcl — define once, use everywhere
remote_state {
  backend = "s3"
  config = {
    bucket = "terraform-state-${get_aws_account_id()}"
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = "us-east-1"
  }
}

# environments/prod/vpc/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/vpc"
}

inputs = {
  cidr_block = "10.0.0.0/16"
  environment = "prod"
}
```

## Debugging Terraform

```bash
# Enable debug logging
TF_LOG=DEBUG terraform apply 2>&1 | tee terraform-debug.log

# Log only to file
TF_LOG=DEBUG TF_LOG_PATH=./terraform.log terraform plan

# Check provider version constraints
terraform providers

# Validate configuration syntax
terraform validate

# Format code
terraform fmt -recursive
```

## Terraform Security Scanning

```bash
# tfsec — static analysis
tfsec .

# checkov — comprehensive IaC scanning
checkov -d . --framework terraform

# Sentinel policies (Terraform Cloud/Enterprise)
# Enforce that all S3 buckets must have encryption enabled
```
