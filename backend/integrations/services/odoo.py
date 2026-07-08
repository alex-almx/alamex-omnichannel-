import xmlrpc.client
from django.conf import settings

class OdooClient:
    def __init__(self):
        self.url = settings.ODOO_URL
        self.db = settings.ODOO_DB
        self.user = settings.ODOO_USER
        self.pwd = settings.ODOO_PASSWORD
        self.common = xmlrpc.client.ServerProxy(f"{self.url}/xmlrpc/2/common")
        self.models = xmlrpc.client.ServerProxy(f"{self.url}/xmlrpc/2/object")
        self.uid = self.common.authenticate(self.db, self.user, self.pwd, {})

    def call(self, model, method, *args, **kw):
        return self.models.execute_kw(self.db, self.uid, self.pwd, model, method, list(args), kw)

    # --- Contactos / Leads ---
    def upsert_partner(self, name, email=None, phone=None):
        domain = [['email', '=', email]] if email else [['name', '=', name]]
        found = self.call('res.partner', 'search', domain, limit=1)
        vals = {'name': name, 'email': email, 'phone': phone}
        if found:
            self.call('res.partner', 'write', found, vals)
            return found[0]
        return self.call('res.partner', 'create', vals)

    def create_lead(self, name, partner_id=None, description=''):
        return self.call('crm.lead', 'create',
                         {'name': name, 'partner_id': partner_id, 'description': description})

    # --- Cotizaciones ---
    def create_quotation(self, partner_id, lines):
        # lines = [(product_id, qty, price_unit), ...]
        order_lines = [(0, 0, {'product_id': p, 'product_uom_qty': q, 'price_unit': pr})
                       for (p, q, pr) in lines]
        return self.call('sale.order', 'create',
                         {'partner_id': partner_id, 'order_line': order_lines})

    # --- Lectura (productos/precios) ---
    def search_products(self, term):
        return self.call('product.product', 'search_read',
                         [['name', 'ilike', term]],
                         fields=['id', 'name', 'list_price'], limit=20)