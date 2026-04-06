variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type. t3.small recommended — 2GB RAM, enough for sentence-transformers"
  type        = string
  default     = "t3.small"
}

variable "project_name" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "ai-github-repo-explainer"
}

variable "github_repo_url" {
  description = "HTTPS URL of your GitHub repo (e.g. https://github.com/youruser/ai-devops-systems-lab)"
  type        = string
}

variable "github_token" {
  description = "GitHub personal access token — required for 5000 req/hr limit (vs 60 unauthenticated)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "groq_api_key" {
  description = "Groq API key for LLM inference (free at console.groq.com)"
  type        = string
  sensitive   = true
}
