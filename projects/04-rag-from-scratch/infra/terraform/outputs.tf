output "s3_bucket_name" {
  description = "S3 bucket name — set as CHROMA_S3_BUCKET in your .env"
  value       = aws_s3_bucket.rag.bucket
}

output "ecr_repository_url" {
  description = "ECR repository URL — use this to push your Docker image"
  value       = aws_ecr_repository.rag_lambda.repository_url
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.ingest.function_name
}

output "upload_doc_command" {
  description = "Command to upload a doc and trigger ingestion"
  value       = "aws s3 cp docs/runbook-kubernetes.md s3://${aws_s3_bucket.rag.bucket}/docs/runbook-kubernetes.md"
}
