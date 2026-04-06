variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type. t2.micro is Free Tier eligible and works with Groq (no local LLM needed)"
  type        = string
  default     = "t2.micro"
}

variable "project_name" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "ai-devops-copilot"
}

variable "github_repo_url" {
  description = "HTTPS URL of your GitHub repo (e.g. https://github.com/youruser/ai-devops-systems-lab)"
  type        = string
}

variable "github_token" {
  description = "Optional GitHub personal access token for private repos or GitHub API calls"
  type        = string
  default     = ""
  sensitive   = true
}

variable "groq_api_key" {
  description = "Groq API key for LLM inference (free at console.groq.com)"
  type        = string
  sensitive   = true
}
