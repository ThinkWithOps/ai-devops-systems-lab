"""
Parses Terraform HCL into a list of structured resources and inferred connections.
Uses python-hcl2 for parsing, then applies provider-specific heuristics to
infer relationships between resources.
"""
import hcl2
import io
import re
from typing import List, Dict, Any

from app.schemas.diagram import ParsedResource


PROVIDER_MAP = {
    "aws_vpc": "aws",
    "aws_subnet": "aws",
    "aws_security_group": "aws",
    "aws_instance": "aws",
    "aws_lb": "aws",
    "aws_alb": "aws",
    "aws_ecs_cluster": "aws",
    "aws_ecs_service": "aws",
    "aws_rds_cluster": "aws",
    "aws_db_instance": "aws",
    "aws_s3_bucket": "aws",
    "aws_lambda_function": "aws",
    "aws_api_gateway_rest_api": "aws",
    "aws_cloudfront_distribution": "aws",
    "aws_elasticache_cluster": "aws",
    "aws_sqs_queue": "aws",
    "aws_sns_topic": "aws",
    "aws_iam_role": "aws",
    "aws_eks_cluster": "aws",
    "azurerm_resource_group": "azure",
    "azurerm_virtual_network": "azure",
    "azurerm_linux_virtual_machine": "azure",
    "azurerm_kubernetes_cluster": "azure",
    "google_compute_instance": "gcp",
    "google_container_cluster": "gcp",
    "google_sql_database_instance": "gcp",
    "kubernetes_deployment": "k8s",
    "kubernetes_service": "k8s",
}

# Connection heuristics: if a resource attribute references another resource, infer a link
CONNECTION_PATTERNS = [
    r'aws_vpc\.',
    r'aws_subnet\.',
    r'aws_security_group\.',
    r'aws_lb\.',
    r'aws_rds_cluster\.',
    r'aws_db_instance\.',
    r'aws_ecs_cluster\.',
    r'aws_s3_bucket\.',
    r'aws_lambda_function\.',
    r'aws_sqs_queue\.',
    r'aws_sns_topic\.',
    r'aws_iam_role\.',
]


def _infer_connections(resource_name: str, attributes: Dict[str, Any], all_resources: List[str]) -> List[str]:
    """Return list of resource names this resource references."""
    connections = []
    attr_str = str(attributes)
    for res in all_resources:
        if res != resource_name and res in attr_str:
            connections.append(res)
    return connections


def parse_terraform(hcl_code: str) -> List[ParsedResource]:
    """Parse Terraform HCL string into structured resources."""
    try:
        parsed = hcl2.load(io.StringIO(hcl_code))
    except Exception:
        # Fallback: try to extract resources using regex if hcl2 fails
        return _regex_fallback_parse(hcl_code)

    resources: List[ParsedResource] = []
    resource_blocks = parsed.get("resource", [])

    # Collect all resource names first for connection inference
    all_resource_ids: List[str] = []
    for block in resource_blocks:
        for rtype, rconfigs in block.items():
            for rname in rconfigs.keys():
                all_resource_ids.append(f"{rtype}.{rname}")

    for block in resource_blocks:
        for resource_type, resource_configs in block.items():
            for resource_name, attrs in resource_configs.items():
                provider = PROVIDER_MAP.get(resource_type, _guess_provider(resource_type))
                connections = _infer_connections(
                    f"{resource_type}.{resource_name}",
                    attrs,
                    all_resource_ids,
                )
                resources.append(ParsedResource(
                    resource_type=resource_type,
                    resource_name=resource_name,
                    provider=provider,
                    attributes=attrs if isinstance(attrs, dict) else {},
                    connections=connections,
                ))

    return resources


def _guess_provider(resource_type: str) -> str:
    prefix = resource_type.split("_")[0]
    mapping = {"aws": "aws", "azurerm": "azure", "google": "gcp", "kubernetes": "k8s", "helm": "k8s"}
    return mapping.get(prefix, "generic")


def _regex_fallback_parse(hcl_code: str) -> List[ParsedResource]:
    """Best-effort regex parse when hcl2 fails."""
    resources = []
    pattern = re.compile(r'resource\s+"([^"]+)"\s+"([^"]+)"\s*\{', re.MULTILINE)
    for match in pattern.finditer(hcl_code):
        rtype, rname = match.group(1), match.group(2)
        provider = PROVIDER_MAP.get(rtype, _guess_provider(rtype))
        resources.append(ParsedResource(
            resource_type=rtype,
            resource_name=rname,
            provider=provider,
            attributes={},
            connections=[],
        ))
    return resources
