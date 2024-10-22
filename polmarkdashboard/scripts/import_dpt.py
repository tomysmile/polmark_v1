import frappe
import json
import time
from datetime import datetime


def import_ndjson_to_doctype(ndjson_file_path, doctype):
    # Initialize record count
    total_records = 0
    batch_size = 1000
    records = []  # Store records for batch insertion

    # Start the timer
    start_time = time.time()
    start_time_formatted = datetime.fromtimestamp(start_time).strftime('%Y-%m-%d %H:%M:%S')
    
    print(f"Conversion started at {start_time_formatted}.")

    with open(ndjson_file_path, 'r') as file:
        for line in file:
            # Parse the NDJSON line
            item = json.loads(line.strip())
            
            # Create the document structure
            doc = {
                "doctype": doctype,
                "nik": item.get("no_ktp"),
                "kk": item.get("no_kk"),
                "fullname": item.get("name"),
                "birth_place": item.get("place_of_birth"),
                "birth_date": datetime.strptime(item.get("date_of_birth"), '%d-%m-%Y').date(),
                "marital_status": item.get("status_nikah"),
                "gender": item.get("gender"),
                "has_ktp_elektronik": item.get("has_ktp_elektronik", False),
                "address": item.get("address"),
                "rt": item.get("rt"),
                "rw": item.get("rw"),
                "tps": item.get("no_tps"),
                "disability": item.get("disability"),
                "notes": item.get("keterangan"),
                "age_per2024": item.get("umur"),
                "phone_number": item.get("phone_number"),
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
            
            records.append(doc)  # Add the document to the records list
            total_records += 1
            
            # If we've reached the batch size, insert records
            if total_records % batch_size == 0:
                # Insert the records into the database
                for record in records:
                    frappe.get_doc(record).insert()
                
                # Commit the transaction
                frappe.db.commit()
                
                print(f"Imported {total_records} records...")
                records = []  # Reset records for the next batch
        
        # Insert any remaining records
        if records:
            for record in records:
                frappe.get_doc(record).insert()
            
            # Commit the transaction
            frappe.db.commit()
            print(f"Imported {total_records} records...")

    end_time = time.time()  # Capture end time
    elapsed_time = end_time - start_time  # Calculate elapsed time
    print(f"Import completed. Total records: {total_records}")
    print(f"Start time: {datetime.fromtimestamp(start_time).strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"End time: {datetime.fromtimestamp(end_time).strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Elapsed time: {elapsed_time:.2f} seconds")


def kab_bekasi():
    # Usage
    ndjson_files = [
        frappe.get_app_path("polmarkdashboard", "tmp_data", "dpt_kab_bekasi_1_10.ndjson"),
        frappe.get_app_path("polmarkdashboard", "tmp_data", "dpt_kab_bekasi_2_10.ndjson"),
        frappe.get_app_path("polmarkdashboard", "tmp_data", "dpt_kab_bekasi_3_10.ndjson"),
        frappe.get_app_path("polmarkdashboard", "tmp_data", "dpt_kab_bekasi_4_10.ndjson"),
        frappe.get_app_path("polmarkdashboard", "tmp_data", "dpt_kab_bekasi_5_10.ndjson"),
        frappe.get_app_path("polmarkdashboard", "tmp_data", "dpt_kab_bekasi_6_10.ndjson"),
        frappe.get_app_path("polmarkdashboard", "tmp_data", "dpt_kab_bekasi_7_10.ndjson"),
        frappe.get_app_path("polmarkdashboard", "tmp_data", "dpt_kab_bekasi_8_10.ndjson"),
        frappe.get_app_path("polmarkdashboard", "tmp_data", "dpt_kab_bekasi_9_10.ndjson"),
        frappe.get_app_path("polmarkdashboard", "tmp_data", "dpt_kab_bekasi_10_10.ndjson")
    ]

    doctype_name = "PD DPT Kabupaten Bekasi"  # Replace with your actual Doctype name

    for ndjson_file in ndjson_files:
        import_ndjson_to_doctype(ndjson_file, doctype_name)
