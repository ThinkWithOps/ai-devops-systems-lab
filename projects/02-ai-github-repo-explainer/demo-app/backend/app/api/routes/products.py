"""Product catalog API routes."""
import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.product_service import product_service
from app.schemas.products import ProductResponse, ProductListResponse

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/products", response_model=ProductListResponse)
async def list_products(
    category: str | None = Query(None, description="Filter by product category"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    List all active products, optionally filtered by category.
    Supports slow_products failure injection (adds 2s delay).
    """
    products = await product_service.get_products(db, category=category, skip=skip, limit=limit)
    total = await product_service.get_product_count(db, category=category)
    return ProductListResponse(
        products=products,
        total=total,
        category=category,
    )


@router.get("/products/search", response_model=list[ProductResponse])
async def search_products(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Search products by name, description, or category."""
    products = await product_service.search_products(db, query=q, limit=limit)
    return products


@router.get("/products/categories", response_model=list[str])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Return all distinct product categories."""
    return await product_service.get_categories(db)


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a single product by ID."""
    product = await product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return product
