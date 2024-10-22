import frappe


def delete_records_in_batches(doctype, filters, batch_size=1000):
    """
    Deletes all records from the specified Doctype in batches to avoid performance issues.
    :param doctype: The Doctype from which records need to be deleted
    :param batch_size: The number of records to delete in each batch (default is 1000)
    """
    total_deleted = 0
    while True:
        # Fetch the first batch of record names
        records = frappe.get_all(doctype, fields=["name"], limit=batch_size)

        # If no more records, break the loop
        if not records:
            print(f"Deleted {total_deleted} records from {doctype}.")
            break

        # Delete the fetched records
        for record in records:
            frappe.delete_doc(doctype, record.name, force=1, ignore_permissions=True)
        
        frappe.db.commit()  # Commit after each batch to avoid large transactions
        total_deleted += len(records)

        print(f"Deleted {len(records)} records. Total deleted so far: {total_deleted}")


def delete_kota_bogor():
    doctype = "PD Geojson Kota Bogor"
    filters = {}
    # filters = {
    #     "fieldname": "value"  # Replace with your actual field name and value
    # }

    # execute the function
    delete_records_in_batches(doctype, filters, batch_size=1000)
    print("Data deleted successfully!")


def delete_nasional():
    doctype = "PD Geojson Indonesia"
    filters = []
    # excluded_provinces = ['SUMATERA UTARA', 'DKI JAKARTA', 'JAWA BARAT', 'KALIMANTAN TENGAH', 'KALIMANTAN TIMUR']
    # filters = [['region_name', 'not in', excluded_provinces]]
    
    # filters = {
    #     "fieldname": "value"  # Replace with your actual field name and value
    # }

    # execute the function
    delete_records_in_batches(doctype, filters, batch_size=1000)
    print("Data deleted successfully!")


def delete_dpt_kab_bekasi():
    doctype = "PD DPT Kabupaten Bekasi"
    filters = []

    # execute the function
    delete_records_in_batches(doctype, filters, batch_size=1000)
    print("Data deleted successfully!")
