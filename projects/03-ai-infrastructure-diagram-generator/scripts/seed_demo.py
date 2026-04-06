"""
Sends a few demo Terraform snippets to the local backend to pre-populate
diagram history for demo/video purposes.

Usage: python scripts/seed_demo.py
"""
import requests
import json

API = "http://localhost:8000"

DEMOS = [
    {
        "title": "AWS Three-Tier Web App",
        "terraform_code": '''
resource "aws_vpc" "main" { cidr_block = "10.0.0.0/16" }
resource "aws_subnet" "public" { vpc_id = aws_vpc.main.id; cidr_block = "10.0.1.0/24" }
resource "aws_lb" "app" { load_balancer_type = "application"; subnets = [aws_subnet.public.id] }
resource "aws_ecs_cluster" "main" { name = "app" }
resource "aws_db_instance" "db" { engine = "postgres"; instance_class = "db.t3.micro" }
resource "aws_s3_bucket" "static" { bucket = "static-assets" }
''',
    },
    {
        "title": "AWS Serverless Event Pipeline",
        "terraform_code": '''
resource "aws_api_gateway_rest_api" "gw" { name = "events-api" }
resource "aws_lambda_function" "ingest" { function_name = "ingest"; role = aws_iam_role.exec.arn }
resource "aws_sqs_queue" "queue" { name = "events" }
resource "aws_lambda_function" "processor" { function_name = "processor"; role = aws_iam_role.exec.arn }
resource "aws_dynamodb_table" "results" { name = "results"; billing_mode = "PAY_PER_REQUEST" }
resource "aws_iam_role" "exec" { name = "lambda-role" }
''',
    },
]

for demo in DEMOS:
    print(f"Generating: {demo['title']}...")
    res = requests.post(
        f"{API}/api/diagrams/generate",
        json={
            "terraform_code": demo["terraform_code"],
            "diagram_title": demo["title"],
            "diagram_style": "graphviz",
            "include_ai_summary": True,
        },
        timeout=60,
    )
    if res.ok:
        data = res.json()
        print(f"  OK — {data['resource_count']} resources, ID: {data['diagram_id']}")
    else:
        print(f"  ERROR {res.status_code}: {res.text[:200]}")

print("\nDone. Open http://localhost:3000 to see the populated dashboard.")
