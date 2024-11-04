import multiprocessing
import os
import json
import frappe
from datetime import datetime
import time
from pymongo import MongoClient

# Define a function to process a single file and insert the data into Frappe
def import_file(file_path, doctype):
    start_time = time.time()  # Record the start time for each file

    print(f"Starting import for: {file_path}")
    total_lines = sum(1 for _ in open(file_path))  # Count total lines for progress tracking
    processed_lines = 0

    with open(file_path, 'r') as f:
        for line in f:
            item = json.loads(line)

            # Create the document structure
            doc = {
                "doctype": doctype,
                "region_code": item.get("region_code"),
                "region_name": item.get("region_name"),
                "region_type": item.get("region_type"),
                "region_level": item.get("region_level"),
                "region_code_bps": item.get("region_code_bps"),
                "region_name_bps": item.get("region_name_bps"),
                "parent_code": item.get("parent_code"),
                "parent_code_bps": item.get("parent_code_bps"),
                "parent_name": item.get("parent_name"),
                "parent_type": item.get("parent_type"),
                "parent_level": item.get("parent_level"),
                "data_source": item.get("data_source"),
                "province_name": item.get("province_name"),
                "province_code": item.get("province_code"),
                "province_code_bps": item.get("province_code_bps"),
                "city_name": item.get("city_name"),
                "city_code": item.get("city_code"),
                "city_code_bps": item.get("city_code_bps"),
                "district_name": item.get("district_name"),
                "district_code": item.get("district_code"),
                "district_code_bps": item.get("district_code_bps"),
                "sub_district_name": item.get("sub_district_name"),
                "sub_district_code": item.get("sub_district_code"),
                "sub_district_code_bps": item.get("sub_district_code_bps"),
                "standard": 1
            }

            # Insert the document into Frappe
            frappe.get_doc(doc).insert()
            processed_lines += 1

            # Print progress every 1000 records
            if processed_lines % 1000 == 0 or processed_lines == total_lines:
                elapsed_time = time.time() - start_time
                elapsed_time = round(elapsed_time)
                print(f"Processed {processed_lines}/{total_lines} records for {file_path.split('/')[-1]} | Elapsed time: ({elapsed_time//60//60%60}:{elapsed_time//60%60}:{elapsed_time%60})")

        frappe.db.commit()  # Commit the changes after processing the file

    elapsed_time = time.time() - start_time  # Calculate elapsed time
    print(f"Completed import for: {file_path} in {elapsed_time:.2f} seconds.\n")

# Function to run import in parallel using multiple cores
def import_files_in_parallel(file_paths, doctype):
    num_cores = multiprocessing.cpu_count()  # Detect available cores
    print(f"Using {num_cores} cores for import.")
    with multiprocessing.Pool(num_cores) as pool:
        pool.starmap(import_file, [(file_path, doctype) for file_path in file_paths])


def import_db(database, collection, doctype):
    # Connect to MongoDB (local instance)
    client = MongoClient('mongodb://localhost:27017/')
    db = client[database]
    collection = db[collection]

    # Define the Frappe Doctype to which data will be imported
    doctype = doctype

    # Fetch data from MongoDB collection
    documents = collection.find()  # Retrieve all documents

    for item in documents:
        # Construct the Frappe document using the MongoDB data
        doc = {
            "doctype": doctype,
            "region_code": item.get("code"),
            "region_name": item.get("name"),
            "region_type": item.get("type"),
            "region_level": item.get("level"),
            "region_code_bps": item.get("code_bps"),
            "region_name_bps": item.get("name_bps"),
            "parent_code": item.get("parent_code"),
            "parent_code_bps": item.get("parent_code_bps"),
            "parent_name": item.get("parent_name"),
            "parent_type": item.get("parent_type"),
            "parent_level": item.get("parent_level"),
            "data_source": item.get("data_source"),
            "province_name": item.get("p_province_name"),
            "province_code": item.get("p_province_code"),
            "province_code_bps": item.get("p_province_code_bps"),
            "city_name": item.get("p_city_name"),
            "city_code": item.get("p_city_code"),
            "city_code_bps": item.get("p_city_code_bps"),
            "district_name": item.get("p_district_name"),
            "district_code": item.get("p_district_code"),
            "district_code_bps": item.get("p_district_code_bps"),
            "sub_district_name": item.get("p_sub_district_name"),
            "sub_district_code": item.get("p_sub_district_code"),
            "sub_district_code_bps": item.get("p_sub_district_code_bps"),
            "standard": 1
        }
    
        # Insert document into Frappe
        frappe_doc = frappe.get_doc(doc)
        frappe_doc.insert(ignore_permissions=True)
        print(f"Inserted document: {frappe_doc.name}")

    # Commit the transaction to save all records
    frappe.db.commit()

    print("Data has been successfully imported into Frappe Doctype.")

def kota_bogor():
    # Usage
    file_paths = [
        frappe.get_app_path("polmarkdashboard", "tmp_data", "region_kota_bogor.ndjson"),
    ]

    # Specify the Doctype you are importing data into
    doctype = "PD Region Kota Bogor"

    # Start parallel import
    start_time = time.time()  # Record the overall start time
    print(f"Starting the import process at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    import_files_in_parallel(file_paths, doctype)

    total_elapsed_time = time.time() - start_time  # Calculate total elapsed time
    print(f"Completed the import process in {total_elapsed_time:.2f} seconds.")


def kabupaten_bekasi():
    # Specify the Doctype you are importing data into
    doctype = "PD Region Kabupaten Bekasi"
    db = "region"
    collection = "kabupaten_bekasi"

    # Start parallel import
    start_time = time.time()  # Record the overall start time
    print(f"Starting the import process at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    import_db(db, collection, doctype)

    total_elapsed_time = time.time() - start_time  # Calculate total elapsed time
    print(f"Completed the import process in {total_elapsed_time:.2f} seconds.")
