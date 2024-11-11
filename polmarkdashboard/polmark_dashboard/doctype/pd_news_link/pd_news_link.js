// Copyright (c) 2024, thinkspedia and contributors
// For license information, please see license.txt

frappe.ui.form.on("PD News Link", {
	refresh(frm) {
		// Ensure the preview gets updated on form load
		frm.trigger("image");
	},
	image: function (frm) {
		let image_url = frm.doc.headline_image;

		if (image_url) {
			// Show the image preview
			frm.fields_dict["image_preview"].$wrapper.html(`
			<img src="${image_url}" style="max-width: 400px; max-height: 400px;" />
		  `);
		} else {
			// Clear the preview if no image is uploaded
			frm.fields_dict["image_preview"].$wrapper.empty();
		}

		// Make sure the field exists and is visible
		if (frm.fields_dict["source_url"]) {
			// Get the field's value and construct the URL
			var fieldValue = frm.doc.source_url;
			if (fieldValue) {
				frm.set_df_property(
					"clickable_url",
					"options",
					`
			  Original News URL <br/>&nbsp;&nbsp;
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
		}
	},
});
