frappe.listview_settings['PD News Link'] = {
  refresh: function (listview) {
    $('span.sidebar-toggle-btn').hide();
    $('.col-lg-2.layout-side-section').hide();
  },
  hide_name_column: true,
  hide_name_filter: true,
  formatters: {
    'source_url': function (value, subject, doc) {
      return `<a href="${value}" target="_blank">${value}</a>`;
    }
  },
};