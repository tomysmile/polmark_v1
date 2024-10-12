import frappe

@frappe.whitelist(allow_guest=True)
def get_news_links(region=None):
    filters = {"region_code": region, "active": 1}
    news_links = frappe.get_all("PD News Link", filters=filters, fields=["name", "title", "summary", "source_url", "news_posted_date", "news_provider", "news_provider_name", "region", "region_code", "headline_image"])
    return news_links
