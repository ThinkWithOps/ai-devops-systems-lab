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

resource "tls_private_key" "copilot" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "copilot" {
  key_name   = "${var.project_name}-key"
  public_key = tls_private_key.copilot.public_key_openssh
}

# Save private key locally so you can SSH in
resource "local_file" "private_key" {
  content         = tls_private_key.copilot.private_key_pem
  filename        = "${path.module}/../${var.project_name}.pem"
  file_permission = "0600"
}

# ─── Data ────────────────────────────────────────────────────────────────────

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

resource "aws_security_group" "copilot" {
  name        = "${var.project_name}-sg"
  description = "AI DevOps Copilot - allow SSH, frontend, backend"

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
    description = "Ollama API"
    from_port   = 11434
    to_port     = 11434
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Restaurant Demo Frontend"
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Restaurant Demo Backend"
    from_port   = 8010
    to_port     = 8010
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

# ─── IAM Role for CloudWatch ──────────────────────────────────────────────────

resource "aws_iam_role" "copilot_ec2" {
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

resource "aws_iam_role_policy_attachment" "cloudwatch_read" {
  role       = aws_iam_role.copilot_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess"
}

resource "aws_iam_instance_profile" "copilot_ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.copilot_ec2.name
}

# ─── EC2 Instance ─────────────────────────────────────────────────────────────

resource "aws_instance" "copilot" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.copilot.key_name
  vpc_security_group_ids = [aws_security_group.copilot.id]
  iam_instance_profile   = aws_iam_instance_profile.copilot_ec2.name

  root_block_device {
    volume_size = 40
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
