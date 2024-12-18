import multiprocessing
import os
import json
import frappe
from datetime import datetime
import time

# Define a function to process a single file and insert the data into Frappe
def import_file(file_path, doctype):
    start_time = time.time()  # Record the start time for each file

    print(f"Starting import for: {file_path}")
    total_lines = sum(1 for _ in open(file_path))  # Count total lines for progress tracking
    processed_lines = 0

    with open(file_path, 'r') as f:
        for line in f:
            item = json.loads(line)

            # Set has_ktp_elektronik based on status_ktp_elektronik value
            has_ktp_elektronik = 1 if item.get("status_ktp_elektronik") == "S" else 0

            # Create the document structure
            doc = {
                "doctype": doctype,
                "address": item.get("address"),
                "rt": None,
                "rw": None,
                "no_tps": item.get("no_tps"),
                "garis_lintang": item.get("lat"),
                "garis_bujur": item.get("long"),
                "source": item.get("source"),
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
                "sub_district_code_bps": item.get("sub_district_code_bps")
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


def kab_bekasi():
    # Usage
    file_paths = [
        frappe.get_app_path("polmarkdashboard", "tmp_data", "tps_kabupaten_bekasi.ndjson")
    ]

    # Specify the Doctype you are importing data into
    doctype = "PD TPS Kabupaten Bekasi"

    # Start parallel import
    start_time = time.time()  # Record the overall start time
    print(f"Starting the import process at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    import_files_in_parallel(file_paths, doctype)

    total_elapsed_time = time.time() - start_time  # Calculate total elapsed time
    print(f"Completed the import process in {total_elapsed_time:.2f} seconds.")
