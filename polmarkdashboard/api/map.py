import frappe
import json

@frappe.whitelist(allow_guest=True)
def roadshow(region, level=None, region_code=None):
    filters = []
    filters.append(["active", "=", 1])

    # Province Level
    if int(level) == 2:
        filters.append(["province_code", "=", region_code])
    # City Level
    elif int(level) == 3:
        filters.append(["city_code", "=", region_code])
    # District Level
    elif int(level) == 4:
        filters.append(["district_code", "like", region_code + "%"])
    # SubDistrict Level
    elif int(level) == 5:
        filters.append(["sub_district_code", "like", region_code + "%"])

    regionTable = "PD Roadshow" + " " + region
    fields = [
        "province_code",
        "province_name",
        "city_code",
        "city_name",
        "district_code",
        "district_name",
        "sub_district_code",
        "sub_district_name",
        "rw",
        "activity_date",
        "roadshow_activity",
        "total_data",
        "garis_lintang",
        "garis_bujur",
        "active"
    ]
    
    data = frappe.get_all(regionTable, filters=filters, fields=fields)
    return data
