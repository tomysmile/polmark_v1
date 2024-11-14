// Copyright (c) 2019, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt
// Owner: tomysmile

frappe.provide("polmarkdashboard.views");

frappe.pages['rekapitulasi-dpt'].on_page_load = function (wrapper) {
  let page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'Rekapitulasi DPT',
    single_column: true
  });

  // page.set_secondary_action('Show DPT', () => {
  //   console.log('show dpt..');
  // });

  polmarkdashboard.views.Rekapitulasi = new RekapitulasiDPT(wrapper);

  $(wrapper).bind("show", () => {
    polmarkdashboard.views.Rekapitulasi.show();
  });
}

class RekapitulasiDPT {
  constructor(wrapper) {
    this.wrapper = wrapper;
    this.$wrapper = $(wrapper);
  }

  show() {
    return frappe.run_serially([
      () => this.init(),
      () => this.before_refresh(),
      () => this.refresh(),
    ]);
  }

  before_refresh() {
    // modify args here just before making the request
    // see list_view.js
  }

  get_args() {
    return {
      doctype: this.doctype,
      group_by: "province_name, city_name, district_name, sub_district_name, tps",
      page: this.start,
      page_size: this.page_size || 5000,
    };
  }

  get_call_args() {
    const args = this.get_args();
    return {
      method: this.method,
      args: args,
      freeze: this.freeze_on_refresh || false,
      freeze_message: this.freeze_message || __("Loading") + "...",
    };
  }

  refresh() {
    let args = this.get_call_args();
    this.freeze(true);
    // fetch data from server
    return frappe.call(args).then((r) => {
      // render
      setTimeout(() => {
        this.prepare_data(r);
        this.toggle_result_area();
        this.before_render();
        this.render();
        // this.after_render();
        this.freeze(false);
        this.reset_defaults();
      }, 5);
    });
  }

  no_change(args) {
    // returns true if arguments are same for the last 3 seconds
    // this helps in throttling if called from various sources
    // if (this.last_args && JSON.stringify(args) === this.last_args) {
    //   return true;
    // }
    // this.last_args = JSON.stringify(args);
    // setTimeout(() => {
    //   this.last_args = null;
    // }, 3000);
    return false;
  }

  prepare_data(r) {
    let response = (r.message) || {};
    let data = response.data;
    const output = data.map(item => Object.values(item));
    this.data = output;
  }

  toggle_result_area() {
    this.$result.toggle(this.data.length > 0);
    this.$paging_area.toggle(this.data.length > 0);
    this.$no_result.toggle(this.data.length == 0);

    const show_more = this.start + this.page_length <= this.data.length;
    this.$paging_area.find(".btn-more").toggle(show_more);
  }

  reset_defaults() {
    this.page_size = 5000;
    this.start = 1;
  }

  freeze(show) {
    // show a freeze message while data is loading
    const spinner = $('#loading-spinner');

    if (spinner.length) {
      if (show) {
        spinner.css('visibility', 'visible');
      } else {
        spinner.css('visibility', 'hidden');
      }
    } else {
      console.warn("Spinner element not found in DOM");
    }
  }

  before_render() {
    // this.toggle_paging && this.$paging_area.toggle(false);
  }

  after_render() {
    this.$no_result.html(`
			<div class="no-result text-muted flex justify-center align-center">
				${this.get_no_result_message()}
			</div>
		`);
    this.setup_new_doc_event();
    this.toggle_paging && this.$paging_area.toggle(true);
  }

  render() {
    // if (this.data.length === 0) return;
    // this.render_list();
    // this.set_rows_as_checked();
    // this.render_count();
    this.setup_datatable(this.data);
  }

  on_filter_change() {
    // fired when filters are added or removed
  }

  toggle_result_area() {
    this.$result.toggle(this.data.length > 0);
    this.$paging_area.toggle(this.data.length > 0);
    this.$no_result.toggle(this.data.length == 0);

    const show_more = this.start + this.page_size <= this.data.length;
    this.$paging_area.find(".btn-more").toggle(show_more);
  }

  init() {
    if (this.init_promise) return this.init_promise;

    let tasks = [
      this.setup_defaults,
      // make view
      this.setup_page,
      this.setup_main_section,
      this.setup_view,
    ].map((fn) => fn.bind(this));

    this.init_promise = frappe.run_serially(tasks);
    return this.init_promise;
  }

  setup_defaults() {
    this.route = frappe.get_route();
    this.page_name = this.get_pagename();

    if (this.route.length === 2) {
      this.report_name = this.route[1];
    }
    this.doctype = this.get_doctype();
    this.page_title = "Rekapitulasi DPT " + __(this.page_name);
    this.meta = frappe.get_meta(this.doctype);
    this.start = 1;
    this.page_size = 5000; //frappe.is_large_screen() ? 5000 : 20;
    this.data = [];
    this.method = "polmarkdashboard.api.dpt.rekapitulasi.get";
    this.add_totals_row = 1;

    this.fields = [];
    this.filters = [];

    // Setup buttons
    this.primary_action = null;
    this.secondary_action = null;

    this.menu_items = [
      {
        label: __("Refresh"),
        action: () => this.refresh,
        class: "visible-xs",
      },
      {
        label: __("Show Totals"),
        action: () => {
          this.add_totals_row = !this.add_totals_row;
          this.save_view_user_settings({
            add_totals_row: this.add_totals_row,
          });
          this.datatable.refresh(this.get_data(this.data));
        },
      },
      {
        label: __("Print"),
        action: () => {
          // prepare rows in their current state, sorted and filtered
          const rows_in_order = this.datatable.datamanager.rowViewOrder
            .map((index) => {
              if (this.datatable.bodyRenderer.visibleRowIndices.includes(index)) {
                return this.data[index];
              }
            })
            .filter(Boolean);

          if (this.add_totals_row) {
            const total_data = this.get_columns_totals(this.data);

            total_data["name"] = __("Total");
            total_data.is_total_row = true;
            rows_in_order.push(total_data);
          }

          frappe.ui.get_print_settings(false, (print_settings) => {
            var title = this.report_name || __(this.doctype);
            frappe.render_grid({
              title: title,
              subtitle: this.get_filters_html_for_print(),
              print_settings: print_settings,
              columns: this.columns,
              data: rows_in_order,
              can_use_smaller_font: 1,
            });
          });
        },
      },
      {
        label: __("Export"),
        action: () => {
          const args = this.get_args();
          const selected_items = this.get_checked_items(true);

          let extra_fields = [];
          if (this.list_view_settings.disable_count) {
            extra_fields = [
              {
                fieldtype: "Check",
                fieldname: "export_all_rows",
                label: __("Export all matching rows?"),
              },
            ];
          } else if (
            this.total_count > (this.count_without_children || args.page_length)
          ) {
            extra_fields = [
              {
                fieldtype: "Check",
                fieldname: "export_all_rows",
                label: __("Export all {0} rows?", [`<b>${this.total_count}</b>`]),
              },
            ];
          }
          if (frappe.boot.lang !== "en") {
            extra_fields.push({
              fieldtype: "Check",
              fieldname: "translate_values",
              label: __("Translate values"),
              default: 1,
            });
          }

          const d = frappe.report_utils.get_export_dialog(
            __(this.doctype),
            extra_fields,
            (data) => {
              args.cmd = "frappe.desk.reportview.export_query";
              args.file_format_type = data.file_format;
              args.title = this.report_name || this.doctype;
              args.translate_values = data.translate_values;

              if (data.file_format == "CSV") {
                args.csv_delimiter = data.csv_delimiter;
                args.csv_quoting = data.csv_quoting;
              }

              if (this.add_totals_row) {
                args.add_totals_row = 1;
              }

              if (selected_items.length > 0) {
                args.selected_items = selected_items;
              }

              if (!data.export_all_rows) {
                args.start = 0;
                args.page_length = this.data.length;
              } else {
                delete args.start;
                delete args.page_length;
              }

              open_url_post(frappe.request.url, args);

              d.hide();
            }
          );

          d.show();
        },
      }

    ];

    this.sidebar = this.$wrapper.find(".layout-side-section");
    this.main_section = this.$wrapper.find(".layout-main-section");
  }

  get_pagename() {
    const urlString = frappe.get_route_str();
    return urlString
      .split("/")[1] // Get the part after the slash
      .split("-") // Split the words by hyphen
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
      .join(" "); // Join the words with space
  }

  get_doctype() {
    const urlString = frappe.get_route_str();
    // Split the URL string into two parts by '/'
    const [prefix, location] = urlString.split("/");
    const transformedString = "PD DPT " + location
      .split("-") // Split the location by hyphen
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
      .join(" "); // Join the words with space

    return transformedString;
  }

  setup_page() {
    this.page = this.wrapper.page;
    this.$page = $(this.wrapper);
    !this.hide_card_layout && this.page.main.addClass("frappe-card");
    this.page.page_form.removeClass("row").addClass("flex");
    this.hide_page_form && this.page.page_form.hide();
    this.hide_sidebar && this.$page.addClass("no-list-sidebar");
    this.setup_page_head();
  }

  setup_page_head() {
    this.set_title();
    this.set_menu_items();
    this.set_breadcrumbs();
  }

  set_title() {
    this.page.set_title(this.page_title, null, true, "", this.meta?.description);
  }

  set_default_secondary_action() {
    if (this.secondary_action) {
      const $secondary_action = this.page.set_secondary_action(
        this.secondary_action.label,
        this.secondary_action.action,
        this.secondary_action.icon
      );
      if (!this.secondary_action.icon) {
        $secondary_action.addClass("hidden-xs");
      } else if (!this.secondary_action.label) {
        $secondary_action.addClass("visible-xs");
      }
    } else {
      this.refresh_button = this.page.add_action_icon(
        "es-line-reload",
        () => {
          this.refresh();
        },
        "",
        __("Reload List")
      );
    }
  }

  set_menu_items() {
    this.set_default_secondary_action();

    this.menu_items &&
      this.menu_items.map((item) => {
        if (item.condition && item.condition() === false) {
          return;
        }
        const $item = this.page.add_menu_item(
          item.label,
          item.action,
          item.standard,
          item.shortcut
        );
        if (item.class) {
          $item && $item.addClass(item.class);
        }
      });
  }

  set_breadcrumbs() {
    frappe.breadcrumbs.add({
      type: "Custom",
      label: __("Rekapitulasi DPT"),
      route: "/app/rekapitulasi-dpt",
    });
  }

  setup_view() {
    this.setup_columns();
  }

  setup_columns() {
    // setup columns for list view
    this.columns = [];
    this.columns.push({
      name: "Provinsi"
    }, {
      name: "Kota/Kabupaten"
    }, {
      name: "Kecamatan"
    }, {
      name: "Desa/Kelurahan"
    }, {
      name: "TPS",
      type: "Int"
    }, {
      name: "Pemilih Laki-laki",
      type: "Int"
    }, {
      name: "Pemilih Perempuan",
      type: "Int"
    }, {
      name: "Total Pemilih",
      type: "Int"
    });
  }

  setup_main_section() {
    return frappe.run_serially(
      [
        this.setup_list_wrapper,
        // this.show_or_hide_sidebar,
        // this.setup_filter_area,
        // this.setup_sort_selector,
        this.setup_result_area,
        this.setup_no_result_area,
        this.setup_freeze_area,
        this.setup_paging_area,
      ].map((fn) => fn.bind(this))
    );
  }

  setup_list_wrapper() {
    this.$frappe_list = $('<div class="frappe-list">').appendTo(this.page.main);
  }

  setup_result_area() {
    this.$result = $(`<div class="result">`);
    this.$frappe_list.append(this.$result);
    this.setup_charts_area();
    this.$datatable_wrapper = $('<div class="datatable-wrapper">');
    this.$result.append(this.$datatable_wrapper);
  }

  setup_charts_area() {
    this.$charts_wrapper = $(`<div class="charts-wrapper hidden">
			<div class="text-right"><button class="btn btn-default btn-xs btn-chart-configure"
				style="margin-right: 15px; margin-top: 15px">Configure</button></div>
			<div class="charts-inner-wrapper"></div>
		</div>`);
    this.$result.append(this.$charts_wrapper);
    this.$charts_wrapper.find(".btn-chart-configure").on("click", () => {
      this.setup_charts();
    });
  }

  setup_no_result_area() {
    this.$no_result = $(`
			<div class="no-result text-muted flex justify-center align-center">
				${this.get_no_result_message()}
			</div>
		`).hide();
    this.$frappe_list.append(this.$no_result);
  }

  setup_freeze_area() {
    this.$freeze = $('<div class="freeze"></div>').hide();
    this.$frappe_list.append(this.$freeze);
    this.$loader = $('<div id="loading-spinner" class="loading-spinner"><div class="spinner">').appendTo(this.$result);
    this.$loader.append(`<p class="loading-text">${__('Please wait, data is loading...')}`);
  }

  get_no_result_message() {
    return __("Nothing to show");
  }

  build_row(d) {
    // return this.columns.map((col) => {
    //   if (col.field in d) {
    //     const value = d[col.field];
    //     return {
    //       name: d.name,
    //       content: value,
    //     };
    //   }
    //   return {
    //     content: "",
    //   };
    // });
    return d;
  }

  get_columns_totals(data) {
		if (!this.add_totals_row) {
			return [];
		}

		const row_totals = {};
    let total_male = 0;
    let total_female = 0;
    let total_all = 0;

		this.columns.forEach((col, i) => {
			const totals = data.reduce((totals, d) => {
        // console.log('col: ', col);
        // console.log('d: ', d);
				// if (col.id in d && frappe.model.is_numeric_field(col.docfield)) {
				// 	totals += flt(d[col.id]);
				// 	return totals;
				// }
        if (col.type === "Int" && col.name === "Pemilih Laki-laki") {
          // console.log('col: ', col);
          // console.log('d: ', d);
          total_male += flt(d[col.name]);
        }
			}, 0);

			row_totals[col.id] = totals;
		});

		return row_totals;
	}

  build_rows(data) {
    const out = data.map((d) => this.build_row(d));

    // console.log('this.add_totals_row: ', this.add_totals_row);

    if (this.add_totals_row) {
    	const totals = this.get_columns_totals(data);
    	// const totals_row = this.columns.map((col, i) => {
    	// 	return {
    	// 		name: __("Totals Row"),
    	// 		content: totals[col.id],
    	// 		format: (value) => {
    	// 			let formatted_value = frappe.format(
    	// 				value,
    	// 				col.docfield,
    	// 				{
    	// 					always_show_decimals: true,
    	// 				},
    	// 				data[0]
    	// 			);
    	// 			if (i === 0) {
    	// 				return this.format_total_cell(formatted_value, col);
    	// 			}
    	// 			return formatted_value;
    	// 		},
    	// 	};
    	// });

    	// out.push(totals_row);
    }

    return out;
  }

  get_data(values) {
    return this.build_rows(values);
  }

  setup_paging_area() {
    const paging_values = [20, 100, 500, 5000, 100000];
    // <div>Total Pemilih Laki-laki:  <span id="total_voter_male">70</span>,</div>
    // <div>Total Pemilih Perempuan:  <span id="total_voter_female">80</span>,</div>
    // <div>Total Pemilih: <span id="total_voter">150</span></div>
    this.$paging_area = $(
      `<div class="list-paging-area level">
				<div class="level-left">
					<div class="btn-group">
						${paging_values
        .map(
          (value) => `
							<button type="button" class="btn btn-default btn-sm btn-paging"
								data-value="${value}">
								${value}
							</button>
						`
        )
        .join("")}
					</div>
				</div>
				<div class="level-right">
          <div class="total-container"></div>
					<button class="btn btn-default btn-more btn-sm">
						${__("Load More")}
					</button>
				</div>
			</div>`
    ).hide();
    this.$frappe_list.append(this.$paging_area);

    console.log('this.page_size:', this.page_size);

    // set default paging btn active
    this.$paging_area
      .find(`.btn-paging[data-value="${this.page_size}"]`)
      .addClass("btn-info");

    this.$paging_area.on("click", ".btn-paging", (e) => {
      const $this = $(e.currentTarget);

      // set active button
      this.$paging_area.find(".btn-paging").removeClass("btn-info");
      $this.addClass("btn-info");

      this.start = 1;
      this.page_size = this.selected_page_count = $this.data().value;

      this.refresh();
    });

    this.$paging_area.on("click", ".btn-more", (e) => {
      this.start += this.page_size;
      this.page_size = this.selected_page_count || 5000;
      this.refresh();
    });
  }

  setup_datatable(values) {
    this.$datatable_wrapper.empty();
    this.datatable = new frappe.DataTable(this.$datatable_wrapper[0], {
      columns: this.columns,
      data: this.get_data(values),
      layout: "fluid",
      // cellHeight: 35,
      // getEditor: this.get_editing_object.bind(this),
      // language: frappe.boot.lang,
      // translations: frappe.utils.datatable.get_translations(),
      // checkboxColumn: true,
      // inlineFilters: true,

      // direction: frappe.utils.is_rtl() ? "rtl" : "ltr",
      // events: {
      // 	onRemoveColumn: (column) => {
      // 		this.remove_column_from_datatable(column);
      // 	},
      // 	onSwitchColumn: (column1, column2) => {
      // 		this.switch_column(column1, column2);
      // 	},
      // 	onCheckRow: () => {
      // 		const checked_items = this.get_checked_items();
      // 		this.toggle_actions_menu_button(checked_items.length > 0);
      // 	},
      // },
      // hooks: {
      // 	columnTotal: frappe.utils.report_column_total,
      // },
      // headerDropdown: [
      // 	{
      // 		label: __("Add Column"),
      // 		action: (datatabe_col) => {
      // 			let columns_in_picker = [];
      // 			const columns = this.get_columns_for_picker();

      // 			columns_in_picker = columns[this.doctype]
      // 				.filter((df) => !this.is_column_added(df))
      // 				.map((df) => ({
      // 					label: __(df.label, null, df.parent),
      // 					value: df.fieldname,
      // 				}));

      // 			delete columns[this.doctype];

      // 			for (let cdt in columns) {
      // 				columns[cdt]
      // 					.filter((df) => !this.is_column_added(df))
      // 					.map((df) => ({
      // 						label: __(df.label, null, df.parent) + ` (${cdt})`,
      // 						value: df.fieldname + "," + cdt,
      // 					}))
      // 					.forEach((df) => columns_in_picker.push(df));
      // 			}

      // 			const d = new frappe.ui.Dialog({
      // 				title: __("Add Column"),
      // 				fields: [
      // 					{
      // 						label: __("Select Column"),
      // 						fieldname: "column",
      // 						fieldtype: "Autocomplete",
      // 						options: columns_in_picker,
      // 					},
      // 					{
      // 						label: __("Insert Column Before {0}", [
      // 							__(datatabe_col.docfield.label).bold(),
      // 						]),
      // 						fieldname: "insert_before",
      // 						fieldtype: "Check",
      // 					},
      // 				],
      // 				primary_action: ({ column, insert_before }) => {
      // 					if (!columns_in_picker.map((col) => col.value).includes(column)) {
      // 						frappe.show_alert({
      // 							message: __("Invalid column"),
      // 							indicator: "orange",
      // 						});
      // 						d.hide();
      // 						return;
      // 					}

      // 					let doctype = this.doctype;
      // 					if (column.includes(",")) {
      // 						[column, doctype] = column.split(",");
      // 					}

      // 					let index = datatabe_col.colIndex;
      // 					if (insert_before) {
      // 						index = index - 1;
      // 					}

      // 					this.add_column_to_datatable(column, doctype, index);
      // 					d.hide();
      // 				},
      // 			});

      // 			d.show();
      // 		},
      // 	},
      // ],
    });
  }
}