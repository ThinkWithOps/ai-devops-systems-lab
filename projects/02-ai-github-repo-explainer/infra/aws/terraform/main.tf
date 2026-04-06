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

# ─── Auto-generated SSH Key Pair ─────────────────────────────────────────────

resource "tls_private_key" "repo_explainer" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "repo_explainer" {
  key_name   = "${var.project_name}-key"
  public_key = tls_private_key.repo_explainer.public_key_openssh
}

resource "local_file" "private_key" {
  content         = tls_private_key.repo_explainer.private_key_pem
  filename        = "${path.module}/../${var.project_name}.pem"
  file_permission = "0600"
}

# ─── Data ─────────────────────────────────────────────────────────────────────

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

# ─── Security Group ───────────────────────────────────────────────────────────

resource "aws_security_group" "repo_explainer" {
  name        = "${var.project_name}-sg"
  description = "AI GitHub Repo Explainer - allow SSH, frontend, backend"

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

  ingress {
    description = "ShopFlow Demo Frontend"
    from_port   = 3002
    to_port     = 3002
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "ShopFlow Demo Backend"
    from_port   = 8020
    to_port     = 8020
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

# ─── IAM Role ─────────────────────────────────────────────────────────────────

resource "aws_iam_role" "repo_explainer_ec2" {
  name = "${var.project_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })

  tags = {
    Project = var.project_name
  }
}

resource "aws_iam_instance_profile" "repo_explainer_ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.repo_explainer_ec2.name
}

# ─── EC2 Instance ─────────────────────────────────────────────────────────────

resource "aws_instance" "repo_explainer" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.repo_explainer.key_name
  vpc_security_group_ids = [aws_security_group.repo_explainer.id]
  iam_instance_profile   = aws_iam_instance_profile.repo_explainer_ec2.name

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  user_data = templatefile("${path.module}/../scripts/setup.sh.tpl", {
    github_repo_url = var.github_repo_url
    github_token    = var.github_token
    groq_api_key    = var.groq_api_key
  })

  lifecycle {
    ignore_changes = [ami, user_data, instance_type]
  }

  tags = {
    Name    = var.project_name
    Project = var.project_name
  }
}
