# ─────────────────────────────────────────────────────────────────────────────
# SAMPLE: Ecommerce Platform AWS Infrastructure
# Paste this into the Diagram Generator UI to see a full ecommerce architecture.
# ───────────────────────────────────────────────────────────────────────��─────

resource "aws_vpc" "ecommerce" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
}

resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.ecommerce.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
}

resource "aws_subnet" "public_b" {
  vpc_id            = aws_vpc.ecommerce.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.ecommerce.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "us-east-1a"
}

resource "aws_security_group" "alb" {
  name   = "ecommerce-alb-sg"
  vpc_id = aws_vpc.ecommerce.id
}

resource "aws_security_group" "app" {
  name   = "ecommerce-app-sg"
  vpc_id = aws_vpc.ecommerce.id
}

resource "aws_lb" "ecommerce" {
  name               = "ecommerce-alb"
  load_balancer_type = "application"
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]
  security_groups    = [aws_security_group.alb.id]
}

resource "aws_cloudfront_distribution" "storefront" {
  enabled         = true
  comment         = "Ecommerce storefront CDN"
  default_root_object = "index.html"
  origin {
    domain_name = aws_lb.ecommerce.dns_name
    origin_id   = "alb-origin"
  }
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "alb-origin"
    viewer_protocol_policy = "redirect-to-https"
    forwarded_values {
      query_string = true
      cookies { forward = "none" }
    }
  }
  restrictions { geo_restriction { restriction_type = "none" } }
  viewer_certificate { cloudfront_default_certificate = true }
}

resource "aws_ecs_cluster" "ecommerce" {
  name = "ecommerce-cluster"
}

resource "aws_ecs_service" "storefront" {
  name            = "storefront"
  cluster         = aws_ecs_cluster.ecommerce.id
  desired_count   = 2
  load_balancer {
    target_group_arn = aws_lb.ecommerce.arn
    container_name   = "storefront"
    container_port   = 3000
  }
  network_configuration {
    subnets         = [aws_subnet.private_a.id]
    security_groups = [aws_security_group.app.id]
  }
}

resource "aws_ecs_service" "api" {
  name          = "product-api"
  cluster       = aws_ecs_cluster.ecommerce.id
  desired_count = 2
  network_configuration {
    subnets         = [aws_subnet.private_a.id]
    security_groups = [aws_security_group.app.id]
  }
}

resource "aws_db_instance" "postgres" {
  identifier        = "ecommerce-db"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  db_name           = "ecommerce"
  username          = "admin"
  password          = "CHANGE_ME"
  vpc_security_group_ids = [aws_security_group.app.id]
  skip_final_snapshot    = true
}

resource "aws_elasticache_cluster" "sessions" {
  cluster_id      = "ecommerce-sessions"
  engine          = "redis"
  node_type       = "cache.t3.micro"
  num_cache_nodes = 1
  subnet_group_name = "default"
}

resource "aws_s3_bucket" "product_images" {
  bucket = "ecommerce-product-images"
}

resource "aws_s3_bucket" "order_exports" {
  bucket = "ecommerce-order-exports"
}

resource "aws_sqs_queue" "orders" {
  name = "ecommerce-order-queue"
}

resource "aws_lambda_function" "order_processor" {
  function_name = "ecommerce-order-processor"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
}

resource "aws_lambda_function" "email_notifier" {
  function_name = "ecommerce-email-notifier"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
}

resource "aws_sns_topic" "order_events" {
  name = "ecommerce-order-events"
}

resource "aws_iam_role" "lambda" {
  name               = "ecommerce-lambda-role"
  assume_role_policy = "{}"
}

resource "aws_api_gateway_rest_api" "checkout" {
  name = "ecommerce-checkout-api"
}
