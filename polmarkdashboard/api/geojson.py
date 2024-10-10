import frappe
import json


def build_geojson(data):
    # Build the GeoJSON structure
    geojson = {"type": "FeatureCollection", "features": []}

    for region in data:
        # Convert 'geometry' field from string to JSON (if needed)
        geometry_full_data = json.loads(region.get("geojson", "{}"))

        # Build each feature
        feature = {
            "type": "Feature",
            "properties": {
                "name": region.get("region_name"),
                "region_name": region.get("region_name"),
                "region_code": region.get("region_code"),
                "region_type": region.get("region_type"),
                "region_level": region.get("region_level"),
                "region_fullname": region.get("region_fullname"),
                "region_code_bps": region.get("region_code_bps"),
                "parent_code": region.get("parent_code"),
                "parent_code_bps": region.get("parent_code_bps"),
                "parent_name": region.get("parent_name"),
                "parent_type": region.get("parent_type"),
                "parent_level": region.get("parent_level"),
                "data_source": region.get("data_source"),
                "dapil_dpr_ri": region.get("dapil_dpr_ri"),
                "zonasi": region.get("zone"),
                "color": region.get("color"),
                "province_name": region.get("province_name"),
                "province_code": region.get("province_code"),
                "province_zone": region.get("province_zone"),
                "city_name": region.get("city_name"),
                "city_code": region.get("city_code"),
                "city_zone": region.get("city_zone"),
                "district_name": region.get("district_name"),
                "district_code": region.get("district_code"),
                "district_zone": region.get("district_zone"),
                "sub_district_name": region.get("sub_district_name"),
                "sub_district_code": region.get("sub_district_code"),
                "sub_district_zone": region.get("sub_district_zone"),
                "jml_kec": region.get("num_district"),
                "jml_kel": region.get("num_sub_district_kelurahan"),
                "jml_desa": region.get("num_sub_district_desa"),
                "jml_tps": region.get("num_tps"),
                "jml_kk": region.get("num_family"),
                "jml_dpt": region.get("num_voter"),
                "jml_dpt_perkk": region.get("num_voter_per_family"),
                "jml_dpt_perempuan": region.get("num_voter_women"),
                "jml_dpt_laki": region.get("num_voter_men"),
                "jml_dpt_muda": region.get("num_voter_young"),
                "jml_cde": region.get("num_cde"),
                "jml_pend": region.get("num_citizen"),
                "jml_dpthp2": region.get("num_voter_dpthp2"),
                "jml_dpthp2_perkk": region.get("num_voter_per_family_dpthp2"),
                "jml_dpthp2_perempuan": region.get("num_voter_women_dpthp2"),
                "jml_dpthp2_laki": region.get("num_voter_men_dpthp2"),
                "jml_dpthp2_muda": region.get("num_voter_young_dpthp2"),
                "jml_relawan": region.get("volunteer"),
                "jml_pemilih_terkunjungi": region.get("visited_voter"),
                "jml_target_kk_terkunjungi": region.get("target_visited_kk"),
                "jml_target_suara": region.get("target_voter"),
                "jml_percentage_target_suara": region.get("percentage_target_voter"),
                "jml_partisipasi_80": region.get("partisipasi_80"),
                "jml_total_baliho": region.get("total_baliho"),
                "jml_total_spanduk": region.get("total_spanduk")
            },
            "geometry": geometry_full_data.get("geometry"),
        }

        # Add feature to the features list
        geojson["features"].append(feature)
    return geojson


@frappe.whitelist(allow_guest=True)
def get_geojson_data_by_region(region=None, region_code=None, region_level=None):
    # Fetch GeoJSON data based on the region (province, city, etc.)
    filters = {}
    if int(region_level) == 3:
        filters = {"province_code": region_code, "region_level": region_level}
    elif int(region_level) > 3:
        filters = {"parent_code": region_code, "region_level": region_level}
    regiontable = "PD Geojson" + " " + region
    regions = frappe.get_all(regiontable, filters=filters, fields=["*"])
    geojson = build_geojson(regions)
    return geojson


@frappe.whitelist(allow_guest=True)
def get_tabular_data(region=None, region_code=None, region_level=None):
    # Fetch GeoJSON data based on the region (province, city, etc.)
    filters = {}
    if int(region_level) == 2:
        filters = {"region_level": region_level}
    elif int(region_level) == 3:
        filters = {"province_code": region_code, "region_level": region_level}
    elif int(region_level) > 3:
        filters = {"parent_code": region_code, "region_level": region_level}

    fields = [
        "name",
        "region_code",
        "region_code_bps",
        "region_name",
        "region_type",
        "region_level",
        "region_fullname",
        "parent_code",
        "parent_code_bps",
        "parent_name",
        "parent_type",
        "parent_level",
        "data_source",
        "dapil_dpr_ri",
        "province_name",
        "province_code",
        "province_code_bps",
        "city_name",
        "city_code",
        "city_code_bps",
        "district_name",
        "district_code",
        "district_code_bps",
        "sub_district_name",
        "sub_district_code",
        "sub_district_code_bps",
        "num_district",
        "num_sub_district_kelurahan",
        "num_sub_district_desa",
        "num_tps",
        "num_citizen",
        "num_cde",
        "num_voter",
        "num_family",
        "num_voter_per_family",
        "num_voter_women",
        "num_voter_young",
        "num_voter_men",
        "num_voter_dpthp2",
        "num_voter_per_family_dpthp2",
        "num_voter_women_dpthp2",
        "num_voter_young_dpthp2",
        "num_voter_men_dpthp2",
        "target_voter",
        "visited_voter",
        "percentage_target_voter",
        "target_visited_kk",
        "volunteer",
        "partisipasi_80",
        "total_baliho",
        "total_spanduk",
        "zone",
        "province_zone",
        "city_zone",
        "district_zone",
        "sub_district_zone",
        "color",
    ]

    regiontable = "PD Geojson" + " " + region
    regions = frappe.get_all(regiontable, filters=filters, fields=fields)
    return regions


@frappe.whitelist(allow_guest=True)
def get_geojson_data(region=None, region_code=None, region_level=None):
    # Fetch GeoJSON data based on the region (province, city, etc.)
    filters = {}
    if int(region_level) == 2:
        filters = {"region_level": region_level, "active": 1}
    elif int(region_level) == 3:
        filters = {"province_code": region_code, "region_level": region_level, "active": 1}
    elif int(region_level) > 3:
        filters = {"parent_code": region_code, "region_level": region_level, "active": 1}
    regiontable = "PD Geojson" + " " + region
    regions = frappe.get_all(regiontable, filters=filters, fields=["*"])
    geojson = build_geojson(regions)
    return geojson