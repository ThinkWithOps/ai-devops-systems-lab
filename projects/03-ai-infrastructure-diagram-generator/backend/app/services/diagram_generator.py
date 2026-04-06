"""
Generates visual architecture diagrams from parsed Terraform resources.
Supports Graphviz DOT output (rendered to PNG) and Mermaid flowchart output.
"""
import os
import uuid
import graphviz
from typing import List, Optional, Tuple

from app.schemas.diagram import ParsedResource, DiagramStyle

PROVIDER_COLORS = {
    "aws": "#FF9900",
    "azure": "#0078D4",
    "gcp": "#4285F4",
    "k8s": "#326CE5",
    "generic": "#6B7280",
}

RESOURCE_SHAPES = {
    "aws_vpc": "rectangle",
    "aws_subnet": "rectangle",
    "aws_instance": "box3d",
    "aws_lb": "diamond",
    "aws_alb": "diamond",
    "aws_rds_cluster": "cylinder",
    "aws_db_instance": "cylinder",
    "aws_s3_bucket": "folder",
    "aws_lambda_function": "component",
    "aws_ecs_cluster": "box3d",
    "aws_eks_cluster": "box3d",
    "aws_api_gateway_rest_api": "trapezium",
    "aws_cloudfront_distribution": "parallelogram",
    "aws_sqs_queue": "rect",
    "aws_sns_topic": "doublecircle",
    "default": "box",
}


def generate_graphviz_diagram(
    resources: List[ParsedResource],
    title: str,
    output_dir: str,
) -> Tuple[str, str]:
    """Returns (image_url_path, dot_source)."""
    diagram_id = str(uuid.uuid4())[:8]
    dot = graphviz.Digraph(
        name=title,
        comment=title,
        graph_attr={
            "rankdir": "TB",
            "splines": "ortho",
            "nodesep": "0.8",
            "ranksep": "1.0",
            "fontname": "Helvetica",
            "label": title,
            "fontsize": "18",
            "labelloc": "t",
            "bgcolor": "#1e1e2e",
            "fontcolor": "white",
            "pad": "0.5",
        },
        node_attr={"fontname": "Helvetica", "fontsize": "11"},
        edge_attr={"color": "#888888", "arrowsize": "0.7"},
    )

    # Group resources by provider in subgraphs
    providers = {}
    for r in resources:
        providers.setdefault(r.provider, []).append(r)

    for provider, res_list in providers.items():
        color = PROVIDER_COLORS.get(provider, PROVIDER_COLORS["generic"])
        with dot.subgraph(name=f"cluster_{provider}") as sub:
            sub.attr(
                label=provider.upper(),
                style="filled,rounded",
                color=color,
                fillcolor=f"{color}22",
                fontcolor=color,
                fontsize="13",
                fontname="Helvetica Bold",
            )
            for r in res_list:
                node_id = f"{r.resource_type}.{r.resource_name}"
                shape = RESOURCE_SHAPES.get(r.resource_type, RESOURCE_SHAPES["default"])
                label = f"{r.resource_type}\n{r.resource_name}"
                sub.node(
                    node_id,
                    label=label,
                    shape=shape,
                    style="filled",
                    fillcolor="#2a2a3e",
                    fontcolor="white",
                    color=color,
                )

    # Add edges
    for r in resources:
        source = f"{r.resource_type}.{r.resource_name}"
        for conn in r.connections:
            dot.edge(source, conn)

    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, diagram_id)
    dot.render(out_path, format="png", cleanup=True)

    return f"/output/{diagram_id}.png", dot.source


def generate_mermaid_diagram(resources: List[ParsedResource], title: str) -> str:
    """Generate a Mermaid flowchart string."""
    lines = ["flowchart TD"]
    lines.append(f'    title["{title}"]:::titleStyle')

    id_map = {}
    for i, r in enumerate(resources):
        node_id = f"n{i}"
        id_map[f"{r.resource_type}.{r.resource_name}"] = node_id
        label = f"{r.resource_type}\\n{r.resource_name}"
        lines.append(f'    {node_id}["{label}"]')

    for r in resources:
        src = id_map.get(f"{r.resource_type}.{r.resource_name}")
        for conn in r.connections:
            tgt = id_map.get(conn)
            if src and tgt:
                lines.append(f"    {src} --> {tgt}")

    lines.append("    classDef titleStyle fill:#1e1e2e,stroke:#ccc,color:#fff,font-size:16px")
    return "\n".join(lines)
