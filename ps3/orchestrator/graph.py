
SERVICE_GRAPH = {
    "frontend": ["cartservice", "productcatalog", "currencyservice",
                 "checkoutservice", "adservice", "recommendservice"],
    "checkoutservice": ["cartservice", "shippingservice", "currencyservice",
                        "paymentservice", "emailservice", "productcatalog"],
    "recommendservice": ["productcatalog"],
    "cartservice": [],
    "productcatalog": [],
    "currencyservice": [],
    "paymentservice": [],
    "shippingservice": [],
    "emailservice": [],
    "adservice": [],
}