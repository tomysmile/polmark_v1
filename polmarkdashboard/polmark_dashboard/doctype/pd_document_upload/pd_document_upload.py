# Copyright (c) 2024, thinkspedia and contributors
# For license information, please see license.txt

import frappe
from frappe import _
import mimetypes
from frappe.model.document import Document

from frappe.utils.file_manager import safe_b64decode
from frappe.utils.file_manager import is_safe_path
from frappe.utils import get_files_path, get_url

from .exceptions import (
    MaxFileSizeReachedError,
)

URL_PREFIXES = ("http://", "https://")


class PDDocumentUpload(Document):
    def get_query_param(param):
        return frappe.local.request.args.get(param)

    def set_file_type(self):
        file_type = mimetypes.guess_type(self.upload_file)[0]
        if not file_type:
            return

        file_extension = mimetypes.guess_extension(file_type)
        self.file_type = file_extension.lstrip(".").upper() if file_extension else None

    def get_full_path(self):
        """Returns file path from given file name"""

        file_path = self.upload_file

        site_url = get_url()
        if "/files/" in file_path and file_path.startswith(site_url):
            file_path = file_path.split(site_url, 1)[1]

        if "/" not in file_path:
            if self.is_private:
                file_path = f"/private/files/{file_path}"
            else:
                file_path = f"/files/{file_path}"

        if file_path.startswith("/private/files/"):
            file_path = get_files_path(
                *file_path.split("/private/files/", 1)[1].split("/"), is_private=1
            )

        elif file_path.startswith("/files/"):
            file_path = get_files_path(*file_path.split("/files/", 1)[1].split("/"))

        elif file_path.startswith(URL_PREFIXES):
            pass

        elif not self.upload_file:
            frappe.throw(
                _("There is some problem with the file url: {0}").format(file_path)
            )

        if not is_safe_path(file_path):
            frappe.throw(_("Cannot access file path {0}").format(file_path))

        return file_path

    def get_content(self) -> bytes:
        file_path = self.get_full_path()

        # read the file
        with open(file_path, mode="rb") as f:
            self._content = f.read()
            try:
                # for plain text files
                self._content = self._content.decode()
            except UnicodeDecodeError:
                # for .png, .jpg, etc
                pass

        return self._content

    def check_max_file_size(self):
        from frappe.core.api.file import get_max_file_size

        converted_file_size = ""

        max_file_size = get_max_file_size()
        file_size = len(self._content or b"")

        if file_size > max_file_size:
            msg = _("File size exceeded the maximum allowed size of {0} MB").format(
                max_file_size / 1048576
            )
            if frappe.has_permission("System Settings", "write"):
                msg += ".<br>" + _("You can increase the limit from System Settings.")
            frappe.throw(msg, exc=MaxFileSizeReachedError)

        if file_size > 0:
            converted_file_size = "{:.2f}".format(file_size / 1024) + "K"

        return converted_file_size

    def decode_file_content(content: bytes) -> bytes:
        if isinstance(content, str):
            content = content.encode("utf-8")
        if b"," in content:
            content = content.split(b",")[1]
        return safe_b64decode(content)

    def before_insert(self):
        self.set_file_type()
        self.get_content()
        self.file_size = self.check_max_file_size()

    def get_list(self, *args, **kwargs):
        # Get filters from query string
        document_category_filter_value = self.get_query_param("document_category")
        region_filter_value = self.get_query_param("region_code")

        # Apply custom filtering logic based on query string
        if document_category_filter_value:
            kwargs["filters"].append(
                ["document_category", "=", document_category_filter_value]
            )

        if region_filter_value:
            kwargs["filters"].append(["region", "=", region_filter_value])

        # Return the filtered list
        return super().get_list(*args, **kwargs)
