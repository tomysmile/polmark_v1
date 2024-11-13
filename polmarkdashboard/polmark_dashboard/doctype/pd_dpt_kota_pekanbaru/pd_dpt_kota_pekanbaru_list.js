frappe.listview_settings['PD DPT Kota Pekanbaru'] = {
  refresh: function (listview) {
    $('span.sidebar-toggle-btn').hide();
    $('.col-lg-2.layout-side-section').hide();

    listview.page.add_inner_button("Show Rekapitulasi", function () {
      frappe.set_route('/app/rekapitulasi-dpt/kota-pekanbaru');
    });
  },
  hide_name_column: true,
  hide_name_filter: true,
};