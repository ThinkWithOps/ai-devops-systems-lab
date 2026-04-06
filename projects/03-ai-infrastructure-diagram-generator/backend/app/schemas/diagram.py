from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class DiagramStyle(str, Enum):
    graphviz = "graphviz"
    mermaid = "mermaid"


class ParsedResource(BaseModel):
    resource_type: str
    resource_name: str
    provider: str
    attributes: Dict[str, Any] = {}
    connections: List[str] = []


class GenerateRequest(BaseModel):
    terraform_code: str = Field(..., description="Raw Terraform HCL code to parse")
    diagram_style: DiagramStyle = DiagramStyle.graphviz
    diagram_title: Optional[str] = "Infrastructure Architecture"
    include_ai_summary: bool = True


class AgentStep(BaseModel):
    step: str
    status: str  # running | complete | error
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class DiagramResult(BaseModel):
    diagram_id: str
    title: str
    image_url: Optional[str] = None
    mermaid_code: Optional[str] = None
    dot_source: Optional[str] = None
    ai_summary: Optional[str] = None
    resources: List[ParsedResource] = []
    agent_steps: List[AgentStep] = []
    resource_count: int = 0
    connection_count: int = 0
    providers: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DiagramHistoryItem(BaseModel):
    diagram_id: str
    title: str
    resource_count: int
    providers: List[str]
    created_at: datetime
    image_url: Optional[str] = None


class MetricsSummary(BaseModel):
    total_diagrams: int
    total_resources_parsed: int
    avg_resources_per_diagram: float
    top_providers: List[Dict[str, Any]]
    diagrams_today: int
    avg_generation_time_ms: float
