import frappe
import re

# import geojson
import json
import os


def insert_to_database(doctype, file_path):
    # Check if the file exists
    if not os.path.exists(file_path):
        frappe.throw(f"File not found: {file_path}")

    # Load the GeoJSON data from the file
    with open(file_path, "r") as json_file:
        # data = json.loads(json_file)
        file_content = json_file.read()

    # Parse the JSON data from the string
    data = json.loads(file_content)

    # Loop through each feature (province) in the GeoJSON
    for item in data:
        region_type = item.get("region_type")
        region_name = remove_keywords(item.get("region_name"), region_type)
        region_fullname = join_with_space_uppercase_first(region_type, region_name)

        geojson_str = json.dumps(item.get("feature"))

        doc = frappe.get_doc(
            {
                "doctype": doctype,
                "region_code": item.get("region_code"),
                "region_name": item.get("region_name"),
                "region_type": region_type,
                "region_fullname": region_fullname,
                "region_level": item.get("region_level"),
                "region_code_bps": item.get("region_code_bps"),
                "region_name_bps": item.get("region_name_bps"),
                "parent_code": item.get("parent_code"),
                "parent_code_bps": item.get("parent_code_bps"),
                "parent_name": item.get("parent_name"),
                "parent_type": item.get("parent_type"),
                "parent_level": item.get("parent_level"),
                "data_source": item.get("data_source"),
                "dapil_dpr_ri": item.get("dapil_dpr_ri"),
                "province_name": item.get("province_name"),
                "province_code": item.get("province_code"),
                "province_code_bps": item.get("province_code_bps"),
                "province_zone": item.get("province_zone"),
                "city_name": item.get("city_name"),
                "city_code": item.get("city_code"),
                "city_code_bps": item.get("city_code_bps"),
                "city_zone": item.get("city_zone"),
                "district_name": item.get("district_name"),
                "district_code": item.get("district_code"),
                "district_code_bps": item.get("district_code_bps"),
                "district_zone": item.get("district_zone"),
                "sub_district_name": item.get("sub_district_name"),
                "sub_district_code": item.get("sub_district_code"),
                "sub_district_code_bps": item.get("sub_district_code_bps"),
                "sub_district_zone": item.get("sub_district_zone"),
                "num_district": item.get("num_district"),
                "num_sub_district": item.get("num_sub_district"),
                "num_sub_district_kelurahan": item.get("num_sub_district_kelurahan"),
                "num_sub_district_desa": item.get("num_sub_district_desa"),
                "num_tps": item.get("num_tps"),
                "num_citizen": item.get("num_citizen"),
                "num_cde": item.get("num_cde"),
                "num_voter": item.get("num_voter"),
                "num_family": item.get("num_family"),
                "num_voter_per_family": item.get("num_voter_per_family"),
                "num_voter_women": item.get("num_voter_women"),
                "num_voter_men": item.get("num_voter_men"),
                "num_voter_young": item.get("num_voter_young"),
                "zone": item.get("zone"),
                "color": item.get("color"),
                "num_voter_dpthp2": item.get("num_voter_dpthp2"),
                "num_voter_per_family_dpthp2": item.get("num_voter_per_family_dpthp2"),
                "num_voter_women_dpthp2": item.get("num_voter_women_dpthp2"),
                "num_voter_men_dpthp2": item.get("num_voter_men_dpthp2"),
                "num_voter_young_dpthp2": item.get("num_voter_young_dpthp2"),
                "target_voter": item.get("target_voter"),
                "volunteer": item.get("volunteer"),
                "visited_voter": item.get("visited_voter"),
                "percentage_target_voter": item.get("percentage_target_voter"),
                "target_visited_kk": item.get("target_visited_kk"),
                "partisipasi_80": item.get("partisipasi_80"),
                "total_baliho": item.get("total_baliho"),
                "total_spanduk": item.get("total_spanduk"),
                "geojson": geojson_str,
                "standard": 1,
            }
        )
        doc.insert()

    # Commit the transaction
    frappe.db.commit()


def remove_keywords(text, region_type):
    # List of keywords to remove
    keywords = [
        "PROVINSI",
        "KOTA",
        "KABUPATEN",
        "KECAMATAN",
        "DESA",
        "KELURAHAN",
    ]

    if "KOTA ADM." not in region_type:
        keywords.append("KOTA ADM.")
    if "KABUPATEN ADM." not in region_type:
        keywords.append("KABUPATEN ADM.")

    # Sort the keywords by length (longest first) to avoid partial matches
    keywords.sort(key=len, reverse=True)

    # Create a regex pattern to match any of the keywords as full words
    pattern = r"\b(?:" + "|".join(re.escape(keyword) for keyword in keywords) + r")\b"

    # Split text into sentences
    sentences = re.split(r'(?<=[.!?])\s+', text)

    # Apply the word removal to the first sentence only
    if sentences:
        sentences[0] = re.sub(pattern, '', sentences[0], flags=re.IGNORECASE)
        # Remove extra spaces left after removing words in the first sentence
        sentences[0] = re.sub(r'\s+', ' ', sentences[0]).strip()

    # Join the sentences back together
    cleaned_text = ' '.join(sentences)

    return cleaned_text


def join_with_space_uppercase_first(word1, word2):
    # Ensure the first word is uppercase and join with the second word
    if isinstance(word1, str) and isinstance(word2, str):
        # Make the first word uppercase and join with one space between the two words
        return f"{word1.strip().upper()} {word2.strip()}"
    return ""


def import_dki_jakarta():
    file_path = frappe.get_app_path(
        "polmarkdashboard", "tmp_data", "geojson_indonesia.dki_jakarta.json"
    )
    doctype = "PD Geojson DKI Jakarta"

    # execute the function
    insert_to_database(doctype, file_path)
    print("GeoJSON data imported successfully!")


def import_kab_bekasi():
    file_path = frappe.get_app_path(
        "polmarkdashboard", "tmp_data", "geojson_indonesia.kab_bekasi.json"
    )
    doctype = "PD Geojson Kab Bekasi"

    # execute the function
    insert_to_database(doctype, file_path)
    print("GeoJSON data imported successfully!")


def import_kota_bogor():
    file_path = frappe.get_app_path(
        "polmarkdashboard", "tmp_data", "geojson_indonesia.kota_bogor.json"
    )
    doctype = "PD Geojson Kota Bogor"

    # execute the function
    insert_to_database(doctype, file_path)
    print("GeoJSON data imported successfully!")


def import_kota_medan():
    file_path = frappe.get_app_path(
        "polmarkdashboard", "tmp_data", "geojson_indonesia.kota_medan.json"
    )
    doctype = "PD Geojson Kota Medan"

    # execute the function
    insert_to_database(doctype, file_path)
    print("GeoJSON data imported successfully!")


def import_kota_balikpapan():
    file_path = frappe.get_app_path(
        "polmarkdashboard", "tmp_data", "geojson_indonesia.kota_balikpapan.json"
    )
    doctype = "PD Geojson Kota Balikpapan"

    # execute the function
    insert_to_database(doctype, file_path)
    print("GeoJSON data imported successfully!")


def import_kota_bandung():
    file_path = frappe.get_app_path(
        "polmarkdashboard", "tmp_data", "geojson_indonesia.kota_bandung.json"
    )
    doctype = "PD Geojson Kota Bandung"

    # execute the function
    insert_to_database(doctype, file_path)
    print("GeoJSON data imported successfully!")


def import_kalteng():
    file_path = frappe.get_app_path(
        "polmarkdashboard", "tmp_data", "geojson_indonesia.kalimantan_tengah.json"
    )
    doctype = "PD Geojson Kalimantan Tengah"

    # execute the function
    insert_to_database(doctype, file_path)
    print("GeoJSON data imported successfully!")


def import_jawa_barat():
    file_path = frappe.get_app_path(
        "polmarkdashboard", "tmp_data", "geojson_indonesia.jawa_barat.json"
    )
    doctype = "PD Geojson Jawa Barat"

    # execute the function
    insert_to_database(doctype, file_path)
    print("GeoJSON data imported successfully!")


def import_sumatera_utara():
    file_path = frappe.get_app_path(
        "polmarkdashboard", "tmp_data", "geojson_indonesia.sumatera_utara.json"
    )
    doctype = "PD Geojson Sumatera Utara"

    # execute the function
    insert_to_database(doctype, file_path)
    print("GeoJSON data imported successfully!")
