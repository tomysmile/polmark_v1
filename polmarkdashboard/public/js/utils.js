frappe.provide('frappe.utils');

frappe.utils.numberFormat = function (number) {
  if (!isNaN(number)) {
    let [main, decimal] = number.toString().split(".");
    main = main.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return decimal ? `${main},${decimal}` : main;
  }
  return number;
};

frappe.utils.toCamelCase = function (str) {
  if (typeof str !== 'string') return str; // Return if not a string

  return str.split(' ').map(function (word) {
    // Only capitalize words that have 3 or more characters
    if (word.length < 3) {
      return word.toUpperCase(); // Keep it in uppercase
    }
    // Capitalize the first letter and make the rest lowercase
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
};

// Generate a slugified filename
frappe.utils.slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
};