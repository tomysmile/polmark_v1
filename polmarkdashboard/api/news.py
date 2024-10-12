import frappe
import requests

@frappe.whitelist(allow_guest=True)
def get_news_links():
    news_links = frappe.get_all("PD News Link", fields=["name", "title", "summary", "source_url", "news_posted_date", "news_provider", "news_provider_name", "region", "region_code", "headline_image"])
    return news_links
