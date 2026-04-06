variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type. t3.micro is free tier eligible."
  type        = string
  default     = "t3.micro"
}

variable "project_name" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "ai-infra-diagram"
}

variable "github_repo_url" {
  description = "HTTPS URL of your GitHub repo (e.g. https://github.com/youruser/ai-devops-systems-lab)"
  type        = string
}

variable "github_token" {
  description = "GitHub personal access token for private repo clone (leave blank for public)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "s3_bucket_name" {
  description = "S3 bucket name for diagram PNG storage (must be globally unique)"
  type        = string
  default     = "ai-infra-diagram-generator"
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name for diagram history"
  type        = string
  default     = "infra-diagram-history"
}
