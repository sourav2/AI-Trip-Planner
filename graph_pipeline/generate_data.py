import csv
import random
import os
from datetime import datetime, timedelta

def create_mock_data():
    os.makedirs('data', exist_ok=True)
    
    # 1. Generate Users
    users = [
        ("U101", "Alice Smith", "alice@example.com", 28, "New York"),
        ("U102", "Bob Jones", "bob@example.com", 35, "San Francisco"),
        ("U103", "Charlie Brown", "charlie@example.com", 22, "Chicago"),
        ("U104", "Diana Prince", "diana@example.com", 30, "Seattle"),
        ("U105", "Evan Wright", "evan@example.com", 42, "Austin"),
    ]
    with open('data/users.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["userId", "name", "email", "age", "location"])
        writer.writerows(users)
        
    # 2. Generate Products & Categories
    products = [
        ("P201", "Wireless Headphones", "Electronics", 99.99),
        ("P202", "Ergonomic Keyboard", "Electronics", 129.99),
        ("P203", "Running Shoes", "Apparel", 89.99),
        ("P204", "Leather Jacket", "Apparel", 199.99),
        ("P205", "Dumbbell Set", "Fitness", 49.99),
        ("P206", "Yoga Mat", "Fitness", 24.99),
    ]
    with open('data/products.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["productId", "title", "category", "price"])
        writer.writerows(products)

    # 3. Generate Purchases (Orders)
    orders = [
        ("O301", "U101", "P201", "2026-06-01 10:30:00", 1, 99.99),
        ("O302", "U101", "P203", "2026-06-02 14:15:00", 1, 89.99),
        ("O303", "U102", "P202", "2026-06-01 11:00:00", 1, 129.99),
        ("O304", "U103", "P201", "2026-06-03 09:45:00", 2, 199.98),
        ("O305", "U103", "P205", "2026-06-04 16:20:00", 1, 49.99),
        ("O306", "U104", "P204", "2026-06-05 18:00:00", 1, 199.99),
        ("O307", "U104", "P206", "2026-06-05 18:05:00", 2, 49.98),
        ("O308", "U105", "P202", "2026-06-06 12:00:00", 1, 129.99),
    ]
    with open('data/purchases.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["orderId", "userId", "productId", "timestamp", "quantity", "totalAmount"])
        writer.writerows(orders)

    # 4. Generate Ratings / Reviews
    ratings = [
        ("U101", "P201", 5, "2026-06-01 11:00:00"),
        ("U101", "P203", 4, "2026-06-02 16:00:00"),
        ("U102", "P202", 5, "2026-06-01 12:30:00"),
        ("U103", "P201", 3, "2026-06-03 11:00:00"),
        ("U103", "P205", 5, "2026-06-04 17:30:00"),
        ("U104", "P204", 4, "2026-06-05 20:00:00"),
        ("U105", "P202", 2, "2026-06-07 09:00:00"),
    ]
    with open('data/ratings.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["userId", "productId", "rating", "timestamp"])
        writer.writerows(ratings)

    # 5. Generate Social Connections (Friends)
    friends = [
        ("U101", "U102"),
        ("U101", "U103"),
        ("U102", "U104"),
        ("U103", "U105"),
        ("U104", "U105"),
    ]
    with open('data/friends.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["user1", "user2"])
        writer.writerows(friends)

    print("Mock data generated successfully in './data' directory.")

if __name__ == "__main__":
    create_mock_data()
