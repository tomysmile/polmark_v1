// Copyright (c) 2024, thinkspedia and contributors
// For license information, please see license.txt
const CONST_PROVINCE_CODE = 12;
const CONST_PROVINCE_NAME = "SUMATERA UTARA";
const CONST_CITY_CODE = 1271;
const CONST_CITY_NAME = "KOTA MEDAN";

frappe.ui.form.on("PD DPT Kota Medan", {
  refresh(frm) {
    //
    frm.set_value('province_code', CONST_PROVINCE_CODE);
    frm.set_value('province_name', CONST_PROVINCE_NAME);
    frm.set_value('province_code_bps', CONST_PROVINCE_CODE);
    frm.set_value('city_code', CONST_CITY_CODE);
    frm.set_value('city_name', CONST_CITY_NAME);
    frm.set_value('city_code_bps', CONST_CITY_CODE);

    frm.set_df_property('province_code', 'hidden', (frm.is_new()) ? 1 : 0);
    frm.set_df_property('city_code', 'hidden', (frm.is_new()) ? 1 : 0);
    frm.set_df_property('province_name', 'hidden', (!frm.is_new()) ? 1 : 0);
    frm.set_df_property('city_name', 'hidden', (!frm.is_new()) ? 1 : 0);

    frm.set_df_property('province_code_bps', 'hidden', 1);
    frm.set_df_property('city_code_bps', 'hidden', 1);
    frm.set_df_property('district_name', 'hidden', 1);
    frm.set_df_property('district_code_bps', 'hidden', 1);
    frm.set_df_property('sub_district_name', 'hidden', 1);
    frm.set_df_property('sub_district_code_bps', 'hidden', 1);

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

    frm.fields_dict.district_code.$input.on("keydown", function(evt){
	    // Code specified here will run when a key is pressed on the customer field.
      if (evt.key === "Backspace" || evt.keyCode === 8) {
        // clear sub_district_code
        frm.set_value('sub_district_code', '');
        frm.set_query('sub_district_code', function () {
          return {};
        });
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
