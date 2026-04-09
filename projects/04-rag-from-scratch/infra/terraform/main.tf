terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

data "aws_caller_identity" "current" {}

locals {
  account_id   = data.aws_caller_identity.current.account_id
  bucket_name  = "${var.project_name}-${local.account_id}"
}

# ── S3 Bucket ──────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "rag" {
  bucket        = local.bucket_name
  force_destroy = true

  tags = {
    Project = var.project_name
  }
}

resource "aws_s3_bucket_versioning" "rag" {
  bucket = aws_s3_bucket.rag.id
  versioning_configuration {
    status = "Enabled"
  }
}

# ── ECR Repository ─────────────────────────────────────────────────────────────

resource "aws_ecr_repository" "rag_lambda" {
  name                 = "${var.project_name}-ingest"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  tags = {
    Project = var.project_name
  }
}

# ── IAM Role for Lambda ────────────────────────────────────────────────────────

resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_s3" {
  name = "${var.project_name}-lambda-s3-policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.rag.arn,
          "${aws_s3_bucket.rag.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# ── Lambda Function ────────────────────────────────────────────────────────────

resource "aws_lambda_function" "ingest" {
  function_name = "${var.project_name}-ingest"
  role          = aws_iam_role.lambda_exec.arn
  package_type  = "Image"
  image_uri     = var.ecr_image_uri
  timeout       = 300   # 5 minutes — embedding can be slow
  memory_size   = 3008  # 3GB — sentence-transformers needs headroom

  environment {
    variables = {
      COLLECTION_NAME   = "devops_docs"
      EMBEDDING_MODEL   = "all-MiniLM-L6-v2"
      CHUNK_SIZE        = "500"
      CHUNK_OVERLAP     = "50"
      CHROMA_S3_PREFIX  = "chroma_db/"
    }
  }

  tags = {
    Project = var.project_name
  }
}

# ── S3 → Lambda Trigger ────────────────────────────────────────────────────────

resource "aws_lambda_permission" "s3_invoke" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ingest.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.rag.arn
}

resource "aws_s3_bucket_notification" "docs_trigger" {
  bucket = aws_s3_bucket.rag.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.ingest.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "docs/"
  }

  depends_on = [aws_lambda_permission.s3_invoke]
}
