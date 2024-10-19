app_name = "polmarkdashboard"
app_title = "Polmark Dashboard"
app_publisher = "thinkspedia"
app_description = "Polmark Dashboard"
app_email = "tomysmile@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

fixtures = [
    {
        "doctype": "Role",
        "filters": [
            ["name", "in", ["Polmark Dashboard Manager", "Polmark Dashboard User"]]
        ],
    },
    {
        "doctype": "Role Profile",
        "filters": [
            ["name", "in", ["Polmark Manager", "Polmark User", "Polmark Dashboard Manager", "Polmark Dashboard User"]]
        ],
    },
    {"doctype": "Custom HTML Block"},
    {"doctype": "Workspace", "filters": [["Public", "=", 1], ["Module", "=", "Polmark Dashboard"]]},
    {"doctype": "PD Region Type", "filters": [["standard", "=", 1]]},
    {"doctype": "PD Region", "filters": [["standard", "=", 1]]},
    {"doctype": "PD Document Category", "filters": [["standard", "=", 1]]},
    {"doctype": "PD News Site", "filters": [["standard", "=", 1]]},
    {"doctype": "PD Staff Position", "filters": [["standard", "=", 1]]}
]

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "polmarkdashboard",
# 		"logo": "/assets/polmarkdashboard/logo.png",
# 		"title": "Polmark Dashboard",
# 		"route": "/polmarkdashboard",
# 		"has_permission": "polmarkdashboard.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

app_include_css = [
    "style.bundle.css"
]

app_include_js = [
    # "/assets/polmarkdashboard/js/utils.js",
    # "/assets/polmarkdashboard/js/leaflet.js",
    # "/assets/polmarkdashboard/js/patch-leaflet.js",
    # "/assets/polmarkdashboard/js/Leaflet.fullscreen.min.js",
    # "/assets/polmarkdashboard/js/custom_login_redirect.js",
    "main.bundle.js"
]

on_session_creation = "polmarkdashboard.scripts.utils.redirect_user_after_session_creation"

# include js, css files in header of desk.html
# app_include_css = "/assets/polmarkdashboard/css/polmarkdashboard.css"
# app_include_js = "/assets/polmarkdashboard/js/polmarkdashboard.js"

# include js, css files in header of web template
# web_include_css = "/assets/polmarkdashboard/css/polmarkdashboard.css"
# web_include_js = "/assets/polmarkdashboard/js/polmarkdashboard.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "polmarkdashboard/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "polmarkdashboard/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "polmarkdashboard.utils.jinja_methods",
# 	"filters": "polmarkdashboard.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "polmarkdashboard.install.before_install"
# after_install = "polmarkdashboard.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "polmarkdashboard.uninstall.before_uninstall"
# after_uninstall = "polmarkdashboard.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "polmarkdashboard.utils.before_app_install"
# after_app_install = "polmarkdashboard.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "polmarkdashboard.utils.before_app_uninstall"
# after_app_uninstall = "polmarkdashboard.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "polmarkdashboard.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"polmarkdashboard.tasks.all"
# 	],
# 	"daily": [
# 		"polmarkdashboard.tasks.daily"
# 	],
# 	"hourly": [
# 		"polmarkdashboard.tasks.hourly"
# 	],
# 	"weekly": [
# 		"polmarkdashboard.tasks.weekly"
# 	],
# 	"monthly": [
# 		"polmarkdashboard.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "polmarkdashboard.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "polmarkdashboard.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "polmarkdashboard.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["polmarkdashboard.utils.before_request"]
# after_request = ["polmarkdashboard.utils.after_request"]

# Job Events
# ----------
# before_job = ["polmarkdashboard.utils.before_job"]
# after_job = ["polmarkdashboard.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"polmarkdashboard.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }
