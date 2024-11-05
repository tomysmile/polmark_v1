// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt
// overrides from:
// /frappe-bench/apps/frappe/frappe/public/js/frappe/desk.js

/* eslint-disable no-console */

frappe.Application = class CustomApplication extends frappe.Application {
  logout() {
		var me = this;
		me.logged_out = true;
		return frappe.call({
			method: "logout",
			callback: function (r) {
				if (r.exc) {
					return;
				}
				me.redirect_to_login();
			},
		});
	}

  redirect_to_login() {
    window.location.href = `/login`;
	}
}