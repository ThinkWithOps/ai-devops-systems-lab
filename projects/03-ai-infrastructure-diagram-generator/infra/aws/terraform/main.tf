terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ── SSH Key Pair (auto-generated) ─────────────────────────────────────────────

resource "tls_private_key" "infra_diagram" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "infra_diagram" {
  key_name   = "${var.project_name}-key"
  public_key = tls_private_key.infra_diagram.public_key_openssh
}

resource "local_file" "private_key" {
  content         = tls_private_key.infra_diagram.private_key_pem
  filename        = "${path.module}/../${var.project_name}.pem"
  file_permission = "0600"
}

# ── Latest Ubuntu 22.04 AMI ───────────────────────────────────────────────────

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── Security Group ────────────────────────────────────────────────────────────

resource "aws_security_group" "infra_diagram" {
  name        = "${var.project_name}-sg"
  description = "AI Infrastructure Diagram Generator - SSH, frontend, backend"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Frontend (Next.js)"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Backend (FastAPI)"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-sg"
    Project = var.project_name
  }
}

# ── IAM Role for EC2 (Bedrock + S3 + DynamoDB — no access keys needed) ───────

resource "aws_iam_role" "infra_diagram_ec2" {
  name = "${var.project_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })

  tags = { Project = var.project_name }
}

resource "aws_iam_role_policy" "infra_diagram_permissions" {
  name = "${var.project_name}-permissions"
  role = aws_iam_role.infra_diagram_ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "BedrockInvoke"
        Effect = "Allow"
        Action = ["bedrock:InvokeModel"]
        Resource = [
          "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.claude-haiku-20240307-v1:0"
        ]
      },
      {
        Sid    = "S3DiagramStorage"
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:GetObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.diagrams.arn,
          "${aws_s3_bucket.diagrams.arn}/*"
        ]
      },
      {
        Sid    = "DynamoDBHistory"
        Effect = "Allow"
        Action = ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:Scan", "dynamodb:Query", "dynamodb:ListTables"]
        Resource = [aws_dynamodb_table.history.arn]
      }
    ]
  })
}

resource "aws_iam_instance_profile" "infra_diagram_ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.infra_diagram_ec2.name
}

# ── S3 Bucket for diagram PNGs ────────────────────────────────────────────────

resource "aws_s3_bucket" "diagrams" {
  bucket = var.s3_bucket_name
  tags   = { Project = var.project_name }
}

resource "aws_s3_bucket_lifecycle_configuration" "diagrams" {
  bucket = aws_s3_bucket.diagrams.id
  rule {
    id     = "expire-old-diagrams"
    status = "Enabled"
    filter { prefix = "diagrams/" }
    expiration { days = 30 }
  }
}

resource "aws_s3_bucket_public_access_block" "diagrams" {
  bucket                  = aws_s3_bucket.diagrams.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── DynamoDB table for diagram history ────────────────────────────────────────

resource "aws_dynamodb_table" "history" {
  name         = var.dynamodb_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "diagram_id"

  attribute {
    name = "diagram_id"
    type = "S"
  }

  tags = { Project = var.project_name }
}

# ── EC2 Instance ──────────────────────────────────────────────────────────────

resource "aws_instance" "infra_diagram" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.infra_diagram.key_name
  vpc_security_group_ids = [aws_security_group.infra_diagram.id]
  iam_instance_profile   = aws_iam_instance_profile.infra_diagram_ec2.name

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  user_data = templatefile("${path.module}/../scripts/setup.sh.tpl", {
    github_repo_url     = var.github_repo_url
    github_token        = var.github_token
    aws_region          = var.aws_region
    s3_bucket           = var.s3_bucket_name
    dynamodb_table      = var.dynamodb_table_name
  })

  lifecycle {
    ignore_changes = [ami, user_data, instance_type]
  }

  tags = {
    Name    = var.project_name
    Project = var.project_name
  }
}
