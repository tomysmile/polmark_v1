frappe.listview_settings['PD DPT Kabupaten Bekasi'] = {
  refresh: function (listview) {
    $('span.sidebar-toggle-btn').hide();
    $('.col-lg-2.layout-side-section').hide();

    listview.page.add_inner_button("Show Rekapitulasi", function () {
      frappe.set_route('/app/rekapitulasi-dpt/kabupaten-bekasi');
    });
  },
  hide_name_column: true,
  hide_name_filter: true,
};