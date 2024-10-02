// Copyright (c) 2024, thinkspedia and contributors
// For license information, please see license.txt

frappe.ui.form.on("PD Google Drive Link", {
	refresh(frm) {
		// Make sure the field exists and is visible
		if (frm.fields_dict["google_drive_url"]) {
			// Get the field's value and construct the URL
			var fieldValue = frm.doc.google_drive_url;
			if (fieldValue) {
				frm.set_df_property(
					"clickable_url",
					"options",
					`
			  Google Drive URL <br/>&nbsp;&nbsp;
			  <a href="#" id="myClickableField" style="text-decoration: underline; color: blue;">
				  ${fieldValue}
			  </a>
			`
				);

				// Add a click event to the link
				frm.$wrapper.find("#myClickableField").on("click", function (e) {
					e.preventDefault();
					// Define the URL you want to open
					var url = fieldValue; // Assuming the field contains a URL
					// Open the URL in a new window
					window.open(url, "_blank");
				});
			}

			if (frm.doc.google_drive_url) {
				// Hide the field
				frm.toggle_display("google_drive_url", false);
			} else {
				// Show the field if it does not have a value
				frm.toggle_display("google_drive_url", true);
			}
		}
	},
});
