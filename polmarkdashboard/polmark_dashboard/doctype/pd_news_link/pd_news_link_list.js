frappe.listview_settings['PD News Link'] = {
  refresh: function (listview) {
    $('span.sidebar-toggle-btn').hide();
    $('.col-lg-2.layout-side-section').hide();
  },
  hide_name_column: true,
  hide_name_filter: true,
  formatters: {
		source_url(val) {
			return `<a href="${val}" target="_blank">${val}</a>`;
		},
	},
};