import json
import os
import time
from datetime import datetime
from multiprocessing import Pool, cpu_count
import frappe

def process_chunk(data_chunk, chunk_index):
    """
    Function to process a chunk of data and convert it to NDJSON format.
    Returns a list of NDJSON lines.
    """
    ndjson_lines = []
    for obj in data_chunk:
        ndjson_lines.append(json.dumps(obj))
    return ndjson_lines

@frappe.whitelist()  # Allows the function to be called with bench execute
def convert_json_to_ndjson(input_file, output_file, num_workers=cpu_count()):
    
    actual_input_file = frappe.get_app_path("polmarkdashboard", input_file)
    actual_output_file = frappe.get_app_path("polmarkdashboard", output_file)

    if not os.path.exists(actual_input_file):
        frappe.throw(f"File not found: {actual_input_file}")

    # Start the timer
    start_time = time.time()
    start_time_formatted = datetime.fromtimestamp(start_time).strftime('%Y-%m-%d %H:%M:%S')
    print(f"Conversion started at {start_time_formatted}.")

    # Load the large JSON file
    with open(actual_input_file, 'r') as json_file:
        try:
            data = json.load(json_file)
            if not isinstance(data, list):
                raise ValueError("Input JSON file must contain an array of objects")

        except json.JSONDecodeError as e:
            print(f"Error reading JSON file: {e}")
            return

    # Calculate chunk size for parallel processing
    total_records = len(data)
    chunk_size = total_records // num_workers

    # Split data into chunks
    data_chunks = [data[i:i + chunk_size] for i in range(0, total_records, chunk_size)]

    # Use multiprocessing Pool to process chunks in parallel
    with Pool(num_workers) as pool:
        results = pool.starmap(process_chunk, [(chunk, idx) for idx, chunk in enumerate(data_chunks)])

    # Write NDJSON output
    with open(actual_output_file, 'w') as ndjson_file:
        for result in results:
            for line in result:
                ndjson_file.write(line + '\n')

    # Calculate elapsed time
    elapsed_time = time.time() - start_time
    print(f"Data conversion completed. Elapsed time: {elapsed_time:.2f} seconds.")

    # Example:
    # bench --site polmark.localhost execute polmarkdashboard.scripts.json_conversion.convert_json_to_ndjson --kwargs "{'input_file': 'tmp_data/tps_bekasi.json', 'output_file': 'tmp_data/tps_bekasi.ndjson'}"
