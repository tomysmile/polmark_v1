import frappe


def set_active_kab_bekasi():
    doctype = "PD Geojson Kabupaten Bekasi"
    filters = []

    # execute the function
    # Fetch all records from PD_GeoJson_Indonesia
    records = frappe.get_all(doctype, filters=filters, fields=['name'])

    # Iterate over each record and update the 'active' field
    for record in records:
        frappe.db.set_value(doctype, record.name, 'active', 1)

    # Commit the changes to the database
    frappe.db.commit()
    print("Data updated successfully!")


def set_active_kota_balikpapan():
    doctype = "PD Geojson Kota Balikpapan"
    filters = []

    # execute the function
    # Fetch all records from PD_GeoJson_Indonesia
    records = frappe.get_all(doctype, filters=filters, fields=['name'])

    # Iterate over each record and update the 'active' field
    for record in records:
        frappe.db.set_value(doctype, record.name, 'active', 1)

    # Commit the changes to the database
    frappe.db.commit()
    print("Data updated successfully!")



def set_active_kota_medan():
    doctype = "PD Geojson Kota Medan"
    filters = []

    # execute the function
    # Fetch all records from PD_GeoJson_Indonesia
    records = frappe.get_all(doctype, filters=filters, fields=['name'])

    # Iterate over each record and update the 'active' field
    for record in records:
        frappe.db.set_value(doctype, record.name, 'active', 1)

    # Commit the changes to the database
    frappe.db.commit()
    print("Data updated successfully!")

def set_active_sumatera_utara():
    doctype = "PD Geojson Sumatera Utara"
    filters = []

    # execute the function
    # Fetch all records from PD_GeoJson_Indonesia
    records = frappe.get_all(doctype, filters=filters, fields=['name'])

    # Iterate over each record and update the 'active' field
    for record in records:
        frappe.db.set_value(doctype, record.name, 'active', 1)

    # Commit the changes to the database
    frappe.db.commit()
    print("Data updated successfully!")