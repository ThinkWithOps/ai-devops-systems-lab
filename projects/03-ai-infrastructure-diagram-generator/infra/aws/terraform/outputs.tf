output "instance_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.infra_diagram.public_ip
}

output "frontend_url" {
  description = "URL to access the Next.js frontend"
  value       = "http://${aws_instance.infra_diagram.public_ip}:3000"
}

output "backend_url" {
  description = "URL to access the FastAPI backend"
  value       = "http://${aws_instance.infra_diagram.public_ip}:8000"
}

output "api_docs_url" {
  description = "FastAPI Swagger docs"
  value       = "http://${aws_instance.infra_diagram.public_ip}:8000/docs"
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i infra/aws/${var.project_name}.pem ubuntu@${aws_instance.infra_diagram.public_ip}"
}

output "private_key_path" {
  description = "Path to the auto-generated SSH private key"
  value       = "${path.module}/../${var.project_name}.pem"
}

output "s3_bucket_name" {
  description = "S3 bucket for diagram storage"
  value       = aws_s3_bucket.diagrams.bucket
}

output "dynamodb_table_name" {
  description = "DynamoDB table for diagram history"
  value       = aws_dynamodb_table.history.name
}
