from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import structlog

from app.db.database import SessionLocal, create_tables, Table, MenuItem, Reservation, Order, Payment

logger = structlog.get_logger()


def seed_database():
    """Seed the database with realistic restaurant data."""
    create_tables()
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Table).count() > 0:
            logger.info("database_already_seeded", table_count=db.query(Table).count())
            return {"status": "already_seeded", "message": "Database already contains data"}

        logger.info("seeding_database_start")

        # ─── Tables ───────────────────────────────────────────────────────────
        tables_data = [
            {"number": 1, "capacity": 2},
            {"number": 2, "capacity": 2},
            {"number": 3, "capacity": 4},
            {"number": 4, "capacity": 4},
            {"number": 5, "capacity": 4},
            {"number": 6, "capacity": 6},
            {"number": 7, "capacity": 6},
            {"number": 8, "capacity": 8},
            {"number": 9, "capacity": 8},
            {"number": 10, "capacity": 8},
        ]
        tables = []
        for t in tables_data:
            table = Table(**t)
            db.add(table)
            tables.append(table)
        db.flush()
        logger.info("tables_seeded", count=len(tables))

        # ─── Menu Items ───────────────────────────────────────────────────────
        menu_items_data = [
            # Starters
            {
                "name": "Bruschetta al Pomodoro",
                "category": "Starters",
                "description": "Toasted sourdough with vine tomatoes, fresh basil, and extra virgin olive oil",
                "price": 8.50,
                "prep_time_minutes": 8,
            },
            {
                "name": "Burrata con Prosciutto",
                "category": "Starters",
                "description": "Creamy burrata cheese with aged Parma ham and rocket salad",
                "price": 14.00,
                "prep_time_minutes": 5,
            },
            {
                "name": "Calamari Fritti",
                "category": "Starters",
                "description": "Crispy fried calamari rings with lemon aioli and marinara dipping sauce",
                "price": 12.50,
                "prep_time_minutes": 12,
            },
            {
                "name": "Zuppa di Pesce",
                "category": "Starters",
                "description": "Traditional Sicilian seafood soup with clams, mussels, and saffron broth",
                "price": 16.00,
                "prep_time_minutes": 15,
            },
            {
                "name": "Carpaccio di Manzo",
                "category": "Starters",
                "description": "Thinly sliced prime beef with capers, Parmesan shavings, and truffle oil",
                "price": 18.00,
                "prep_time_minutes": 5,
            },
            # Mains
            {
                "name": "Tagliatelle al Ragù",
                "category": "Mains",
                "description": "Handmade tagliatelle with slow-cooked Bolognese sauce and Parmigiano",
                "price": 22.00,
                "prep_time_minutes": 20,
            },
            {
                "name": "Risotto ai Funghi Porcini",
                "category": "Mains",
                "description": "Creamy Arborio rice with wild porcini mushrooms, truffle butter, and aged Parmesan",
                "price": 24.00,
                "prep_time_minutes": 25,
            },
            {
                "name": "Bistecca alla Fiorentina",
                "category": "Mains",
                "description": "28-day aged T-bone steak grilled over charcoal, served with rosemary potatoes",
                "price": 48.00,
                "prep_time_minutes": 30,
            },
            {
                "name": "Branzino al Forno",
                "category": "Mains",
                "description": "Whole roasted Mediterranean sea bass with capers, olives, and cherry tomatoes",
                "price": 36.00,
                "prep_time_minutes": 25,
            },
            {
                "name": "Pappardelle al Cinghiale",
                "category": "Mains",
                "description": "Wide ribbon pasta with slow-braised wild boar ragù and juniper berries",
                "price": 28.00,
                "prep_time_minutes": 20,
            },
            {
                "name": "Pizza Margherita Verace",
                "category": "Mains",
                "description": "Certified Neapolitan pizza with San Marzano tomatoes and buffalo mozzarella",
                "price": 18.00,
                "prep_time_minutes": 15,
            },
            # Desserts
            {
                "name": "Tiramisù della Casa",
                "category": "Desserts",
                "description": "Classic house tiramisù with savoiardi biscuits, mascarpone, and Marsala wine",
                "price": 9.00,
                "prep_time_minutes": 5,
            },
            {
                "name": "Panna Cotta al Caramello",
                "category": "Desserts",
                "description": "Silky vanilla panna cotta with salted caramel sauce and crushed hazelnuts",
                "price": 8.50,
                "prep_time_minutes": 5,
            },
            {
                "name": "Cannoli Siciliani",
                "category": "Desserts",
                "description": "Traditional Sicilian cannoli filled with sweetened ricotta and dark chocolate chips",
                "price": 10.00,
                "prep_time_minutes": 5,
            },
            {
                "name": "Gelato Artigianale",
                "category": "Desserts",
                "description": "Three scoops of artisan gelato — choose from pistachio, stracciatella, or limone",
                "price": 7.50,
                "prep_time_minutes": 3,
            },
            # Drinks
            {
                "name": "Aperol Spritz",
                "category": "Drinks",
                "description": "Classic Italian aperitivo with Aperol, Prosecco, and soda water",
                "price": 11.00,
                "prep_time_minutes": 3,
            },
            {
                "name": "Bottega Prosecco (Bottle)",
                "category": "Drinks",
                "description": "750ml chilled Bottega Gold Prosecco DOC Treviso",
                "price": 42.00,
                "prep_time_minutes": 2,
            },
            {
                "name": "San Pellegrino (750ml)",
                "category": "Drinks",
                "description": "Sparkling natural mineral water",
                "price": 5.50,
                "prep_time_minutes": 1,
            },
            {
                "name": "Espresso Doppio",
                "category": "Drinks",
                "description": "Double shot of house-blend Italian espresso",
                "price": 4.50,
                "prep_time_minutes": 3,
            },
            {
                "name": "Negroni Classico",
                "category": "Drinks",
                "description": "Gin, sweet vermouth, and Campari served over ice with an orange twist",
                "price": 13.00,
                "prep_time_minutes": 3,
            },
        ]

        menu_items = []
        for item in menu_items_data:
            mi = MenuItem(**item)
            db.add(mi)
            menu_items.append(mi)
        db.flush()
        logger.info("menu_items_seeded", count=len(menu_items))

        # ─── Sample Reservations ──────────────────────────────────────────────
        today = datetime.utcnow().date()
        reservations_data = [
            {
                "customer_name": "Marco Rossi",
                "customer_email": "marco.rossi@example.com",
                "table_id": tables[0].id,
                "party_size": 2,
                "date": str(today),
                "time_slot": "19:00",
                "status": "confirmed",
            },
            {
                "customer_name": "Giulia Bianchi",
                "customer_email": "giulia.bianchi@example.com",
                "table_id": tables[2].id,
                "party_size": 4,
                "date": str(today),
                "time_slot": "20:00",
                "status": "confirmed",
            },
            {
                "customer_name": "Luca Ferrari",
                "customer_email": "luca.ferrari@example.com",
                "table_id": tables[5].id,
                "party_size": 6,
                "date": str(today + timedelta(days=1)),
                "time_slot": "13:00",
                "status": "confirmed",
            },
            {
                "customer_name": "Sofia Esposito",
                "customer_email": "sofia.esposito@example.com",
                "table_id": tables[7].id,
                "party_size": 8,
                "date": str(today + timedelta(days=2)),
                "time_slot": "18:00",
                "status": "confirmed",
            },
            {
                "customer_name": "Andrea Colombo",
                "customer_email": "andrea.colombo@example.com",
                "table_id": tables[1].id,
                "party_size": 2,
                "date": str(today - timedelta(days=1)),
                "time_slot": "21:00",
                "status": "no_show",
            },
        ]

        for res_data in reservations_data:
            res = Reservation(**res_data)
            db.add(res)
        db.flush()
        logger.info("reservations_seeded", count=len(reservations_data))

        # ─── Sample Orders ────────────────────────────────────────────────────
        sample_items_1 = [
            {"menu_item_id": menu_items[5].id, "name": menu_items[5].name, "quantity": 2, "unit_price": menu_items[5].price},
            {"menu_item_id": menu_items[0].id, "name": menu_items[0].name, "quantity": 2, "unit_price": menu_items[0].price},
        ]
        order1 = Order(
            table_id=tables[0].id,
            customer_name="Marco Rossi",
            status="served",
            total_amount=sum(i["quantity"] * i["unit_price"] for i in sample_items_1),
            items=sample_items_1,
        )
        db.add(order1)

        sample_items_2 = [
            {"menu_item_id": menu_items[6].id, "name": menu_items[6].name, "quantity": 1, "unit_price": menu_items[6].price},
            {"menu_item_id": menu_items[15].id, "name": menu_items[15].name, "quantity": 3, "unit_price": menu_items[15].price},
        ]
        order2 = Order(
            table_id=tables[2].id,
            customer_name="Table 3 Order",
            status="preparing",
            total_amount=sum(i["quantity"] * i["unit_price"] for i in sample_items_2),
            items=sample_items_2,
        )
        db.add(order2)

        sample_items_3 = [
            {"menu_item_id": menu_items[7].id, "name": menu_items[7].name, "quantity": 2, "unit_price": menu_items[7].price},
            {"menu_item_id": menu_items[11].id, "name": menu_items[11].name, "quantity": 2, "unit_price": menu_items[11].price},
            {"menu_item_id": menu_items[16].id, "name": menu_items[16].name, "quantity": 1, "unit_price": menu_items[16].price},
        ]
        order3 = Order(
            table_id=tables[5].id,
            customer_name="Table 6 Order",
            status="pending",
            total_amount=sum(i["quantity"] * i["unit_price"] for i in sample_items_3),
            items=sample_items_3,
        )
        db.add(order3)
        db.flush()

        # Payments for seeded orders
        payment1 = Payment(
            order_id=order1.id,
            amount=order1.total_amount,
            status="success",
            method="card",
        )
        db.add(payment1)

        payment2 = Payment(
            order_id=order2.id,
            amount=order2.total_amount,
            status="pending",
            method="card",
        )
        db.add(payment2)

        payment3 = Payment(
            order_id=order3.id,
            amount=order3.total_amount,
            status="pending",
            method="cash",
        )
        db.add(payment3)

        db.commit()
        logger.info("seeding_complete", tables=10, menu_items=20, reservations=5, orders=3)
        return {"status": "success", "message": "Database seeded successfully"}

    except Exception as e:
        db.rollback()
        logger.error("seeding_failed", error=str(e))
        raise
    finally:
        db.close()
