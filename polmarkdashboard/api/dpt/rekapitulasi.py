# polmarkdashboard.api.dpt.rekapitulasi.get
# http://xyz:port/api/method/polmarkdashboard.api.dpt.rekapitulasi.get?doctype=PD DPT Kota Pekanbaru&group_by=city_name,district_name,sub_district_name,tps&page_size=500

import frappe
import math

@frappe.whitelist(allow_guest=True)
def get(doctype, group_by, order_by=None, province_code=None, city_code=None, district_code=None, sub_district_code=None, tps=None, page=1, page_size=50):
    # Convert page and page_size to integers, with defaults in case of invalid input
    try:
        page = int(page)
    except ValueError:
        page = 1
    
    try:
        page_size = int(page_size)
    except ValueError:
        page_size = 50

    # Ensure page and page_size are at least 1
    page = max(page, 1)
    page_size = max(page_size, 1)

    # Ensure the Doctype exists to prevent SQL injection
    if not frappe.db.exists("DocType", doctype):
      frappe.throw(f"Doctype {doctype} does not exist")

    # Check if user wants all records with specific filters without grouping
    if sub_district_code and tps:
        select_fields = "name, creation, modified, nik, kk, fullname, birth_place, birth_date, gender, marital_status, disability, has_ktp_elektronik, age_per2024, phone_number, profile_photo, province_name, province_code, city_name, city_code, district_name, district_code, sub_district_name, sub_district_code, address, rt, rw, tps"

        # Query to get all records with all fields, filtered by sub_district_code and tps
        query = f"""
            SELECT
              {select_fields}
              FROM `tab{doctype}`
              WHERE sub_district_code = %s AND tps = %s AND active = 1
        """
        
        # Add ORDER BY clause if specified
        if order_by:
            order_fields = ", ".join(field.strip() for field in order_by.split(','))
            query += f" ORDER BY {order_fields}"

        # Pagination support: Count the total records for pagination
        count_query = f"SELECT COUNT(*) FROM ({query}) AS total_count"
        filter_values = tuple(filter for filter in [sub_district_code, tps] if filter)
        total_records = frappe.db.sql(count_query, filter_values)[0][0]
        total_pages = math.ceil(total_records / page_size) if page_size else 1
        
        # Add LIMIT and OFFSET for pagination
        offset = (page - 1) * page_size
        query += f" LIMIT %s OFFSET %s"

        records = frappe.db.sql(query, filter_values + (page_size, offset), as_dict=True)

        return {
            "total_data": total_records,
            "total_pages": total_pages,
            "page": page,
            "page_size": page_size,
            "data": records
        }
    
    # If grouping is needed, parse group_by_fields as a comma-separated string if provided
    if group_by:
        group_by = [field.strip() for field in group_by.split(',')]
    else:
        group_by = []
    
    # Validate group_by
    valid_group_fields = ['province_name', 'city_name', 'district_name', 'sub_district_name', 'tps']
    for field in group_by:
        if field not in valid_group_fields:
            frappe.throw(f"Invalid group_by '{field}'. Valid options are: {', '.join(valid_group_fields)}")
    
    # Construct SELECT clause for the group-by fields
    select_fields = ", ".join(group_by) if group_by else "*"
    
    # Base query for counting by district_name, sub_district_name, and TPS
    query = f"""
        SELECT 
            {select_fields}, 
            COUNT(CASE WHEN gender = 'L' THEN 1 END) AS num_of_L,
            COUNT(CASE WHEN gender = 'P' THEN 1 END) AS num_of_P,
            COUNT(*) AS total
        FROM `tab{doctype}`
    """

    # Add filters if provided
    # example: filters = {
    #     "province_code": "14",
    #     "city_code": "1471",
    #     "district_code": "147114",
    #     "sub_district_code": "1471141003",
    #     "tps": "1",
    # }
    #

    # Prepare the filter conditions based on the parameters
    filters = []
    
    if province_code:
        filters.append("province_code = %s")
    if city_code:
        filters.append("city_code = %s")
    if sub_district_code:
        filters.append("sub_district_code = %s")
    if tps:
        filters.append("tps = %s")
    
    # Add filters to the query
    if filters:
        query += " WHERE " + " AND ".join(filters) + " AND active = 1"

    # Add GROUP BY clause if grouping fields are specified
    if group_by:
        group_by_clause = ", ".join(group_by)
        query += f" GROUP BY {group_by_clause}"
    
    # Add ORDER BY clause if specified
    if order_by:
        order_clause = parse_order_by(order_by)
        query += f" ORDER BY {order_clause}"

    # Pagination support: Count the total records for pagination
    count_query = f"SELECT COUNT(*) FROM ({query}) AS total_count"
    filter_values = tuple(filter for filter in [province_code, city_code, district_code, sub_district_code, tps] if filter)
    total_records = frappe.db.sql(count_query, filter_values)[0][0]
    total_pages = math.ceil(total_records / page_size) if page_size else 1
    
    # Add LIMIT and OFFSET for pagination
    offset = (page - 1) * page_size
    query += f" LIMIT %s OFFSET %s"

    records = frappe.db.sql(query, filter_values + (page_size, offset), as_dict=True)

    return {
            "total_data": total_records,
            "total_pages": total_pages,
            "page": page,
            "page_size": page_size,
            "data": records
        }


def parse_order_by(order_by):
    # Allowed fields and directions
    valid_order_fields = ['creation', 'modified', 'province_name', 'province_code', 'city_name', 'city_code', 'district_name', 'district_code', 'sub_district_name', 'sub_district_code', 'name', 'fullname', 'age_per2024', 'tps']
    order_clause = []

    for item in order_by.split(','):
        item = item.strip()
        parts = item.split()
        field = parts[0]
        
        # Validate field name
        if field not in valid_order_fields:
            frappe.throw(f"Invalid order_by field '{field}'. Valid options are: {', '.join(valid_order_fields)}")

        # Check for optional direction
        direction = parts[1].upper() if len(parts) > 1 and parts[1].upper() in ["ASC", "DESC"] else "ASC"
        order_clause.append(f"{field} {direction}")

    return ", ".join(order_clause)