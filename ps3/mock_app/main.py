from fastapi import FastAPI
from fastapi.responses import JSONResponse
import random, time

app = FastAPI()
error_mode = False
products = [{"id": i, "name": f"Product {i}"} for i in range(1, 11)]
users = [{"id": i, "name": f"User {i}"} for i in range(1, 6)]

@app.get("/products")
def get_products():
    time.sleep(random.uniform(0.05, 0.2))
    if error_mode and random.random() < 0.3:
        return JSONResponse(status_code=500, content={"error": "Service failure"})
    return products

@app.get("/users")
def get_users():
    return users

@app.post("/orders")
def create_order(order: dict):
    time.sleep(random.uniform(0.05, 0.15))
    return {"status": "order placed", "order": order}

@app.get("/payment/fail")
def payment_fail():
    global error_mode
    error_mode = True
    return {"status": "payment failure mode enabled"}

@app.get("/payment/recover")
def payment_recover():
    global error_mode
    error_mode = False
    return {"status": "recovered"}