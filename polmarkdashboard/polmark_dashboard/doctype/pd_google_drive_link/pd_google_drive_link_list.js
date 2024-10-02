frappe.listview_settings["PD Google Drive Link"] = {
	formatters: {
		google_drive_url(val) {
			return `<a href="${val}" target="_blank">${val}</a>`;
		},
	},
};
