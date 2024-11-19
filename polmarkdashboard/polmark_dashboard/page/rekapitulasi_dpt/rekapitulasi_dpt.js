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
      collection_name: this.report_name,
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

  adjustDatatableHeight() {
    const datatableWrapper = document.querySelector('.dt-scrollable');
    if (datatableWrapper) {
      datatableWrapper.style.height = '80vh';
      // datatableWrapper.style.maxHeight = '80vh';
    }
  };

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
        this.after_render();
        this.freeze(false);
        this.reset_defaults();
        this.adjustDatatableHeight();
      }, 5);
    });
  }

  no_change(args) {
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
    this.update_footer();
  }

  render() {
    // if (this.data.length === 0) return;
    // this.render_list();
    // this.set_rows_as_checked();
    // this.render_count();
    this.setup_datatable(this.data);
  }

  update_footer() {
    //
    if (this.row_totals) {
      const datatableWrapper = document.querySelector('.datatable');

      const headerRow = document.querySelector('.dt-row-header');
      const footerRow = document.querySelector('.dt-footer');
      const clonedHeader = headerRow.cloneNode(true);
      footerRow.appendChild(clonedHeader);

      const indonesianFormatter = new Intl.NumberFormat('id-ID');

      // Modify the first 6 columns in the footer to merge them
      const footerCells = clonedHeader.querySelectorAll('.dt-cell__content');
      footerCells.forEach((cell, index) => {
        const total_1 = indonesianFormatter.format(Object.values(this.row_totals)[0]);
        const total_2 = indonesianFormatter.format(Object.values(this.row_totals)[1]);
        const total_3 = indonesianFormatter.format(Object.values(this.row_totals)[2]);
        if (index < 6) {
          // cell.colSpan = 1;  // Remove column span for merging
          cell.innerHTML = ''; // Empty for merging effect
        } else if (index === footerCells.length - 3) {
          // Set the totals for the last 3 columns
          footerCells[index].innerText = total_1;
        } else if (index === footerCells.length - 2) {
          footerCells[index].innerText = total_2;
        } else if (index === footerCells.length - 1) {
          footerCells[index].innerText = total_3;
        }
      });

      datatableWrapper.appendChild(footerRow);
    }
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
    // this.method = "polmarkdashboard.api.dpt.rekapitulasi.get";
    this.method = "polmarkdashboard.api.dpt.rekap.get_data";
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
        label: __("Export to CSV"),
        action: () => {
          const args = this.get_args();

          const datatable = this.datatable;
          if (!datatable) {
            frappe.msgprint(__('No data to export'));
            return;
          }

          // Get data to export
          const rows = datatable.getRows(); // Fetch visible rows
          const columns = datatable.getColumns(); // Get column definitions
          const headers = columns.map((col, idx) => idx === 0 && !col.content ? "rownum" : col.content || ""); // Add "rownum" for the first empty header

          // Prepare CSV data
          let csvContent = [headers.join(",")]; // Add headers
          rows.forEach(row => {
            let rowData = row.map(cell => {
              if (typeof cell === "object" && cell !== null) {
                return `"${cell.content || ""}"`; // Extract content if cell is an object
              }
              return `"${cell || ""}"`; // Handle plain text or empty cells
            });
            csvContent.push(rowData.join(","));
          });

          // Create a Blob for the CSV file
          const csvBlob = new Blob([csvContent.join("\n")], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(csvBlob);

          // Open a dialog with the row count and download button
          const dialog = new frappe.ui.Dialog({
            title: __('Export to CSV'),
            fields: [
              {
                label: __('Total Rows to Export'),
                fieldtype: 'HTML',
                options: `<p>${rows.length} rows will be exported.</p>`
              },
              {
                label: __('Download File'),
                fieldtype: 'Button',
                click: () => {
                  // Trigger file download
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${frappe.utils.slugify(this.page_name)}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);

                  // Close dialog after download
                  dialog.hide();
                }
              }
            ]
          });

          dialog.show();
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

    // Adjust height on window resize
    window.addEventListener('resize', this.adjustDatatableHeight);

    // Optional: Clean up the event listener when the listview is unloaded
    frappe.ui.on_page_leave = () => {
      window.removeEventListener('resize', this.adjustDatatableHeight);
    };
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

  get_checked_items(only_docnames) {
    // const indexes = this.datatable.rowmanager.getCheckedRows();
    // const items = indexes.map((i) => this.data[i]).filter((i) => i != undefined);

    // if (only_docnames) {
    //   return items.map((d) => d.name);
    // }

    console.log('(get_checked_items) items: ', items);

    return items;
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
        if (col.type === "Int" && col.name === "Total Pemilih") {
          total_all += flt(d[i]);
          row_totals[col.name] = total_all;
        }

        if (col.type === "Int" && col.name === "Pemilih Laki-laki") {
          total_male += flt(d[i]);
          row_totals[col.name] = total_male;
        }

        if (col.type === "Int" && col.name === "Pemilih Perempuan") {
          total_female += flt(d[i]);
          row_totals[col.name] = total_female;
        }
      }, 0);
    });

    return row_totals;
  }

  build_rows(data) {
    const out = data.map((d) => this.build_row(d));

    if (this.add_totals_row) {
      this.row_totals = this.get_columns_totals(data);
    }

    return out;
  }

  get_data(values) {
    return this.build_rows(values);
  }

  setup_paging_area() {
    this.$paging_area = $(
      `<div class="list-paging-area level">
				<div class="level-left">
				</div>
				<div class="level-right">
          <div class="total-container"></div>
				</div>
			</div>`
    ).hide();
    this.$frappe_list.append(this.$paging_area);
  }

  setup_datatable(values) {
    this.$datatable_wrapper.empty();
    this.datatable = new frappe.DataTable(this.$datatable_wrapper[0], {
      columns: this.columns,
      data: this.get_data(values),
      layout: "fluid",
    });
    this.adjustDatatableHeight();
  }
}