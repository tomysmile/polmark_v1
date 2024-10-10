# polmarkdashboard/polmarkdashboard/scripts/utils.py

import frappe

def redirect_user_after_session_creation():
    user = frappe.session.user

    # Alternatively, redirect based on role
    roles = frappe.get_roles(user)
    
    if "Polmark Dashboard Manager" in roles:
        frappe.local.response["home_page"] = "/app/pd-peta-zona-pemenangan"