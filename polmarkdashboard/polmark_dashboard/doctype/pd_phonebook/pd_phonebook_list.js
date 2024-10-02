frappe.listview_settings["PD Phonebook"] = {
	hide_name_column: true, // hide the last column which shows the `name`
	formatters: {
		phone_number(val) {
			return `<a href="tel:${val}">${val}</a>`;
		},
	},
};
