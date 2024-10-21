import frappe


def delete_documents(doctype, filters):
    """
    Delete documents from a specified Doctype based on given filters.

    :param doctype: The name of the Doctype to delete documents from
    :param filters: A dictionary of filters to select the documents to delete
    :return: A message indicating the result of the operation
    """
    # Fetch documents based on the provided filters
    documents = frappe.get_all(doctype, filters=filters, fields=['name'])

    if documents:
        # Iterate over the documents and delete each one
        for doc in documents:
            frappe.delete_doc(doctype, doc.name)
        return {"message": f"{len(documents)} documents deleted from {doctype}."}
    else:
        return {"message": "No documents found matching the criteria."}


def delete_kota_bogor():
    doctype = "PD Geojson Kota Bogor"
    filters = {}
    # filters = {
    #     "fieldname": "value"  # Replace with your actual field name and value
    # }

    # execute the function
    delete_documents(doctype, filters)
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
    delete_documents(doctype, filters)
    print("Data deleted successfully!")

