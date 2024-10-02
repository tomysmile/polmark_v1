# Copyright (c) 2024, thinkspedia and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class PDStaffPosition(Document):
	pass


@frappe.whitelist()
def get_latest_sequence():
	# Fetch the maximum sequence_number from the database
	latest_doc = frappe.db.sql("""SELECT MAX(sequence_number) FROM `tabPD Staff Position`""", as_list=True)
	return latest_doc[0][0] if latest_doc and latest_doc[0][0] else 0
