// Copyright (c) 2024, thinkspedia and contributors
// For license information, please see license.txt

frappe.ui.form.on("PD Organisation Structure", {
	refresh(frm) {
		frm.fields_dict["phone_number"].input.addEventListener("input", function (e) {
			let value = e.target.value;

			// Allow only numeric characters and the plus sign
			let validValue = value.replace(/[^0-9+]/g, "");

			// Update the field value
			e.target.value = validValue;
		});
	}
});
