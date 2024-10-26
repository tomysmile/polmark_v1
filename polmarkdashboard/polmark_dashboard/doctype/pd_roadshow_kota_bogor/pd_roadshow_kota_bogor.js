const CONST_PROVINCE_CODE = 32;
const CONST_PROVINCE_NAME = "JAWA BARAT";
const CONST_CITY_CODE = 3271;
const CONST_CITY_NAME = "KOTA BOGOR";

// Copyright (c) 2024, thinkspedia and contributors
// For license information, please see license.txt

frappe.ui.form.on("PD Roadshow Kota Bogor", {
  refresh(frm) {
    // Set default values
    frm.set_value('province_code', CONST_PROVINCE_CODE);
    frm.set_value('province_name', CONST_PROVINCE_NAME);
    frm.set_value('city_code', CONST_CITY_CODE);
    frm.set_value('city_name', CONST_CITY_NAME);

    // Set filter for District field
    frm.set_query('district_code', function () {
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
  district_code(frm) {
    if (frm.doc.district_code) {
      // Set filter for Sub District field based on selected District
      frm.set_query('sub_district_code', function () {
        return {
          filters: {
            parent_code: frm.doc.district_code  // Filter sub districts based on selected district
          }
        };
      });
    } else {
      frm.set_query('sub_district_code', function () {
        return {};
      });
    }
  }
});
