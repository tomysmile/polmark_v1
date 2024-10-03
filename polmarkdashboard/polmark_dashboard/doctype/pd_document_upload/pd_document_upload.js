// Copyright (c) 2024, thinkspedia and contributors
// For license information, please see license.txt

frappe.ui.form.on("PD Document Upload", {
  refresh: function (frm) {
    if (frm.doc.upload_file) {
      let file_url = frm.doc.upload_file;

      // Get the file type and size
      let file_extension = file_url.split(".").pop().toLowerCase();
      let html = "";

      if (["jpg", "jpeg", "png", "gif"].includes(file_extension)) {
        // Preview image
        html = `<img src="${file_url}" width="100%" />`;
      } else if (file_extension === "pdf") {
        // Preview PDF
        html = `<iframe id="pdfIframe" src="${file_url}" width="100%" height="1200px"></iframe>`;
      } else {
        html = "Unsupported file format";
      }

      frm.set_df_property("preview", "options", html);
    } else {
      frm.set_df_property("preview", "options", "No file uploaded");
    }
  }
});
