variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Used for naming all resources"
  type        = string
  default     = "mcp-demo"
}

variable "instance_type" {
  description = "EC2 instance type — t3.micro is free tier eligible, enough for k3s + 3 demo pods"
  type        = string
  default     = "t3.micro"
}

variable "public_key_path" {
  description = "Path to your SSH public key — e.g. ~/.ssh/id_rsa.pub"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}
