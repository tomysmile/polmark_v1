from pymongo import MongoClient
import frappe


def get_database_host():
    # Accessing the database host from the site_config
    db_host = frappe.conf.mongodb_host  # This will give you the database host from site_config.json
    return db_host

def get_mongo_client():
    db_host = get_database_host()
    # Replace with your MongoDB connection details
    client = MongoClient(db_host)
    return client

def get_mongo_collection(db_name, collection_name):
    client = get_mongo_client()
    db = client[db_name]
    collection = db[collection_name]
    return collection