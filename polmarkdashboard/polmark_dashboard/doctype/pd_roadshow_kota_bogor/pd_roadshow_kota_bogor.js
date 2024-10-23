// Copyright (c) 2024, thinkspedia and contributors
// For license information, please see license.txt

frappe.ui.form.on("PD Roadshow Kota Bogor", {
  refresh(frm) {
    // Set filter for District field
    frm.set_query('district', function () {
      return {
        filters: {
          region_level: 4  // Only show districts where region_level is 4
        }
      };
    });
    $(frm.fields_dict.total_data.input).on('keypress', function (event) {
      // Only allow numbers (0-9) and prevent other characters
      if ((event.which < 48 || event.which > 57)) {
        event.preventDefault();
      }
    });
    $(frm.fields_dict.rw.input).on('keypress', function (event) {
      // Only allow numbers (0-9) and prevent other characters
      if ((event.which < 48 || event.which > 57)) {
        event.preventDefault();
      }
    });
  },
  district(frm) {
    if (frm.doc.district) {
      // Set filter for Sub District field based on selected District
      frm.set_query('sub_district', function () {
        return {
          filters: {
            parent_code: frm.doc.district  // Filter sub districts based on selected district
          }
        };
      });
    } else {
      frm.set_query('sub_district', function () {
        return {};
      });
    }
  }
});
