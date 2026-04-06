output "instance_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.repo_explainer.public_ip
}

output "frontend_url" {
  description = "URL to access the Next.js frontend"
  value       = "http://${aws_instance.repo_explainer.public_ip}:3000"
}

output "backend_url" {
  description = "URL to access the FastAPI backend"
  value       = "http://${aws_instance.repo_explainer.public_ip}:8000"
}

output "api_docs_url" {
  description = "FastAPI Swagger docs"
  value       = "http://${aws_instance.repo_explainer.public_ip}:8000/docs"
}

output "shopflow_url" {
  description = "URL to access the ShopFlow demo app"
  value       = "http://${aws_instance.repo_explainer.public_ip}:3002"
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i infra/aws/${var.project_name}.pem ubuntu@${aws_instance.repo_explainer.public_ip}"
}

output "private_key_path" {
  description = "Path to the auto-generated SSH private key"
  value       = "${path.module}/../${var.project_name}.pem"
}
