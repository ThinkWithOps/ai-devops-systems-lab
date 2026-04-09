variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name — used as prefix for all resources"
  type        = string
  default     = "rag-demo"
}

variable "ecr_image_uri" {
  description = "ECR image URI for the Lambda function (set after docker build + push)"
  type        = string
}
