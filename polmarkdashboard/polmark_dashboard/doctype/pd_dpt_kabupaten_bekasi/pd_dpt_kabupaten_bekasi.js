// Copyright (c) 2024, thinkspedia and contributors
// For license information, please see license.txt
const CONST_PROVINCE_CODE = 32;
const CONST_PROVINCE_NAME = "JAWA BARAT";
const CONST_CITY_CODE = 3216;
const CONST_CITY_NAME = "KABUPATEN BEKASI";

frappe.ui.form.on("PD DPT Kabupaten Bekasi", {
  refresh(frm) {
    //
    frm.set_value('province_code', CONST_PROVINCE_CODE);
    frm.set_value('province_name', CONST_PROVINCE_NAME);
    frm.set_value('province_code_bps', CONST_PROVINCE_CODE);
    frm.set_value('city_code', CONST_CITY_CODE);
    frm.set_value('city_name', CONST_CITY_NAME);
    frm.set_value('city_code_bps', CONST_CITY_CODE);

    frm.set_query('district_code', function () {
      return {
        filters: {
          region_level: 4
        }
      };
    });
    frm.set_query('sub_district_code', function () {
      return {
        filters: {
          region_level: 5
        }
      };
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
