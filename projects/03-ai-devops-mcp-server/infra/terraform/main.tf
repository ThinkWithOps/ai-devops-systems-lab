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

# ── Key pair ──────────────────────────────────────────────────────────────────

resource "aws_key_pair" "mcp_demo" {
  key_name   = "${var.project_name}-key"
  public_key = file(var.public_key_path)
}

# ── Security group ────────────────────────────────────────────────────────────

resource "aws_security_group" "mcp_demo" {
  name        = "${var.project_name}-sg"
  description = "Allow SSH and k3s API access"

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # k3s API server — needed for kubectl from your laptop
  ingress {
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Docker daemon — needed for remote Docker tools
  ingress {
    from_port   = 2375
    to_port     = 2375
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound
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

# ── EC2 instance ──────────────────────────────────────────────────────────────

# Ubuntu 22.04 LTS (us-east-1) — update if deploying in a different region
locals {
  ubuntu_ami = "ami-00de3875b03809ec5"
}

resource "aws_instance" "mcp_demo" {
  ami                    = local.ubuntu_ami
  instance_type          = var.instance_type
  key_name               = aws_key_pair.mcp_demo.key_name
  vpc_security_group_ids = [aws_security_group.mcp_demo.id]

  user_data = templatefile("${path.module}/user_data.sh.tpl", {
    project_name = var.project_name
  })

  tags = {
    Name    = "${var.project_name}-server"
    Project = var.project_name
  }
}
