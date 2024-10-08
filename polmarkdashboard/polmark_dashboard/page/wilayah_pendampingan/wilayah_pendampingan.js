frappe.pages['wilayah-pendampingan'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Wilayah Pendampingan',
		single_column: true
	});
  page.set_secondary_action("Refresh", () => page.capacity_dashboard.refresh(), "refresh");
	page.start = 0;
  page.company_field = page.add_field({
		fieldname: "company",
		label: __("Company"),
		fieldtype: "Link",
		options: "Company",
		reqd: 1,
		default: frappe.defaults.get_default("company"),
		change: function () {
			page.capacity_dashboard.start = 0;
			page.capacity_dashboard.refresh();
		},
	});
}