# polmarkdashboard.api.dpt.rekapitulasi.get
# http://xyz:port/api/method/polmarkdashboard.api.dpt.rekap.get_data?collection_name=cars

import frappe
from polmarkdashboard.scripts.utils.mongodb import get_mongo_collection

@frappe.whitelist(allow_guest=True)
def get_data(collection_name, query={}):
    """
    Fetch data from a MongoDB collection.
    :param collection_name: Name of the MongoDB collection
    :param query: Query to execute (as JSON)
    :return: List of documents
    """
    try:
        query = frappe.parse_json(query)  # Parse string JSON to Python dict
        collection = get_mongo_collection("dpt", collection_name)

        # MongoDB aggregation pipeline
        pipeline = [
            {
                "$group": {
                    "_id": {
                        "province_name": "$province_name",
                        "city_name": "$city_name",
                        "district_name": "$district_name",
                        "sub_district_name": "$sub_district_name",
                        "no_tps": "$no_tps"
                    },
                    "num_of_L": { "$sum": { "$cond": [{ "$eq": ["$gender", "L"] }, 1, 0] } },
                    "num_of_P": { "$sum": { "$cond": [{ "$eq": ["$gender", "P"] }, 1, 0] } },
                    "total": { "$sum": 1 }
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "province_name": "$_id.province_name",
                    "city_name": "$_id.city_name",
                    "district_name": "$_id.district_name",
                    "sub_district_name": "$_id.sub_district_name",
                    "no_tps": "$_id.no_tps",
                    "num_of_L": 1,
                    "num_of_P": 1,
                    "total": 1
                }
            },
            {
                "$sort": {
                    "province_name": 1,
                    "city_name": 1,
                    "district_name": 1,
                    "sub_district_name": 1,
                    "no_tps": 1
                }
            }
        ]

        # documents = collection.find(query, {"_id": 0})  # Exclude MongoDB's _id field
        # Execute the aggregation query
        results = collection.aggregate(pipeline)
        
        # Convert results to a list
        data = list(results)

        # Calculate total number of records
        total_count = len(data)

        # Reorder fields manually if needed
        reordered_data = []
        for result in data:
            reordered_data.append({
                "province_name": result["province_name"],
                "city_name": result["city_name"],
                "district_name": result["district_name"],
                "sub_district_name": result["sub_district_name"],
                "tps": result["no_tps"],
                "count_by_gender_L": result["num_of_L"],
                "count_by_gender_P": result["num_of_P"],
                "total": result["total"]
            })

        response = {
            "data": reordered_data,
            "total_data": total_count
        }

        return response
    except Exception as e:
        frappe.throw(f"Error fetching data: {str(e)}")
