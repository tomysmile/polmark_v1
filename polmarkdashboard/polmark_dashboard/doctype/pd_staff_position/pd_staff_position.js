// Copyright (c) 2024, thinkspedia and contributors
// For license information, please see license.txt

frappe.ui.form.on("PD Staff Position", {
	refresh(frm) {
		if (frm.is_new()) {
			// Ensure this only runs for new documents
			frm.set_value("sequence_number", 1);
			frappe.call({
				method: "polmarkdashboard.polmark_dashboard.doctype.pd_staff_position.pd_staff_position.get_latest_sequence",
				callback: function (r) {
					if (r.message) {
						let next_sequence = r.message + 1; // Increment the sequence
						frm.set_value("sequence_number", next_sequence);
					}
				},
			});
		}
	},
});
