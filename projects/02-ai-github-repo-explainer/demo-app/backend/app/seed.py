"""
Seed data for ShopFlow ecommerce demo.

Provides 12 realistic products across 4 categories and 2 demo user accounts.
Called on application startup and available via the admin /seed endpoint.
"""
import structlog
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from app.models import Product, User

logger = structlog.get_logger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_PRODUCTS = [
    # Electronics
    {
        "name": "Wireless Noise-Cancelling Headphones",
        "description": "Premium over-ear headphones with 30-hour battery life and active noise cancellation. Crystal-clear audio with deep bass response.",
        "price": Decimal("149.99"),
        "category": "Electronics",
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
        "stock_quantity": 45,
        "sku": "ELEC-001",
    },
    {
        "name": "4K Webcam Pro",
        "description": "Ultra HD 4K webcam with auto-focus, built-in ring light, and dual microphones. Perfect for remote work and streaming.",
        "price": Decimal("89.99"),
        "category": "Electronics",
        "image_url": "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=400",
        "stock_quantity": 30,
        "sku": "ELEC-002",
    },
    {
        "name": "Mechanical Keyboard TKL",
        "description": "Tenkeyless mechanical keyboard with Cherry MX Brown switches. RGB backlit with programmable macros. Compact design for desk clarity.",
        "price": Decimal("119.00"),
        "category": "Electronics",
        "image_url": "https://images.unsplash.com/photo-1561112078-7d24e04c3407?w=400",
        "stock_quantity": 20,
        "sku": "ELEC-003",
    },
    # Clothing
    {
        "name": "Premium Merino Wool Sweater",
        "description": "100% Merino wool crew-neck sweater. Naturally temperature-regulating, soft against skin, and machine washable. Available in multiple colors.",
        "price": Decimal("79.95"),
        "category": "Clothing",
        "image_url": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400",
        "stock_quantity": 60,
        "sku": "CLTH-001",
    },
    {
        "name": "Slim Fit Chino Trousers",
        "description": "Versatile slim-fit chinos crafted from stretch cotton blend. Wrinkle-resistant fabric for all-day comfort. Smart casual or office-ready.",
        "price": Decimal("54.99"),
        "category": "Clothing",
        "image_url": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400",
        "stock_quantity": 80,
        "sku": "CLTH-002",
    },
    {
        "name": "Performance Running Jacket",
        "description": "Lightweight water-resistant running jacket with reflective details. Packable design with ventilation panels. Ideal for early morning runs.",
        "price": Decimal("94.00"),
        "category": "Clothing",
        "image_url": "https://images.unsplash.com/photo-1544441893-675973e31985?w=400",
        "stock_quantity": 35,
        "sku": "CLTH-003",
    },
    # Books
    {
        "name": "Designing Data-Intensive Applications",
        "description": "The definitive guide to the principles, architecture, and practical trade-offs of modern data systems. By Martin Kleppmann. Essential for engineers.",
        "price": Decimal("42.99"),
        "category": "Books",
        "image_url": "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400",
        "stock_quantity": 100,
        "sku": "BOOK-001",
    },
    {
        "name": "The Pragmatic Programmer",
        "description": "Timeless lessons on becoming a better programmer. Covers tools, techniques, and philosophies that every developer should know. 20th Anniversary Edition.",
        "price": Decimal("38.50"),
        "category": "Books",
        "image_url": "https://images.unsplash.com/photo-1589998059171-988d887df646?w=400",
        "stock_quantity": 75,
        "sku": "BOOK-002",
    },
    {
        "name": "Clean Architecture",
        "description": "Robert C. Martin's comprehensive guide to software structure and design. Learn to build systems that are testable, maintainable, and scalable.",
        "price": Decimal("35.99"),
        "category": "Books",
        "image_url": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400",
        "stock_quantity": 90,
        "sku": "BOOK-003",
    },
    # Home
    {
        "name": "Bamboo Desk Organizer Set",
        "description": "Eco-friendly 5-piece bamboo desk organizer. Includes pen holder, cable tray, phone stand, and document sorter. Sustainable and stylish.",
        "price": Decimal("34.95"),
        "category": "Home",
        "image_url": "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400",
        "stock_quantity": 55,
        "sku": "HOME-001",
    },
    {
        "name": "Smart LED Desk Lamp",
        "description": "Touch-control LED desk lamp with 5 color temperatures and 10 brightness levels. USB charging port, memory function, and eye-care technology.",
        "price": Decimal("49.99"),
        "category": "Home",
        "image_url": "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=400",
        "stock_quantity": 40,
        "sku": "HOME-002",
    },
    {
        "name": "Ceramic Pour-Over Coffee Set",
        "description": "Handcrafted ceramic pour-over dripper with matching carafe and two mugs. Brews 600ml at optimal temperature. Includes paper filters.",
        "price": Decimal("67.00"),
        "category": "Home",
        "image_url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400",
        "stock_quantity": 25,
        "sku": "HOME-003",
    },
]

DEMO_USERS = [
    {
        "email": "demo@shopflow.io",
        "password": "demo1234",
        "name": "Demo Customer",
        "is_admin": False,
    },
    {
        "email": "admin@shopflow.io",
        "password": "admin1234",
        "name": "Shop Admin",
        "is_admin": True,
    },
]


async def seed_database(db: AsyncSession) -> None:
    """Seed products and users into the database (skips existing records)."""
    # Seed products
    products_seeded = 0
    for product_data in DEMO_PRODUCTS:
        existing = await db.execute(
            select(Product).where(Product.sku == product_data["sku"])
        )
        if not existing.scalar_one_or_none():
            product = Product(**product_data)
            db.add(product)
            products_seeded += 1

    # Seed users
    users_seeded = 0
    for user_data in DEMO_USERS:
        existing = await db.execute(
            select(User).where(User.email == user_data["email"])
        )
        if not existing.scalar_one_or_none():
            user = User(
                email=user_data["email"],
                hashed_password=pwd_context.hash(user_data["password"]),
                name=user_data["name"],
                is_admin=user_data["is_admin"],
            )
            db.add(user)
            users_seeded += 1

    await db.flush()
    logger.info(
        "seed_complete",
        products_seeded=products_seeded,
        users_seeded=users_seeded,
    )
