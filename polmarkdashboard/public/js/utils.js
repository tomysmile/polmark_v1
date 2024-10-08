frappe.provide('frappe.utils');

frappe.utils.numberFormat = function (number) {
  if (!isNaN(number)) {
    let [main, decimal] = number.toString().split(".");
    main = main.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return decimal ? `${main},${decimal}` : main;
  }
  return number;
};
