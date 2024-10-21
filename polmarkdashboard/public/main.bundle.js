import L from 'leaflet';
import 'leaflet-fullscreen';

import "./js/patch-leaflet.js";
import "./js/utils.js";

// This ensures that the script runs after the app is fully loaded
frappe.after_ajax(() => {
  // This will run after the desk is shown
  localStorage.container_fullwidth = true;
  // set fullscreen
  frappe.ui.toolbar.set_fullwidth_if_enabled();
});