export default function CustomerInfoFields({ form, setF }) {
  return (
    <div className="bg-white rounded-2xl p-6 nx-shadow border border-nx-border space-y-4">
      <h2 className="font-semibold text-nx-text">Customer Information</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-nx-text mb-1.5">Name *</label>
          <input required value={form.customer_name || ""} onChange={e => setF("customer_name", e.target.value)} className="w-full px-3 py-2.5 border border-nx-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="John Smith" />
        </div>
        <div>
          <label className="block text-sm font-medium text-nx-text mb-1.5">Email</label>
          <input type="email" value={form.customer_email || ""} onChange={e => setF("customer_email", e.target.value)} className="w-full px-3 py-2.5 border border-nx-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="customer@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-nx-text mb-1.5">Phone</label>
          <input type="tel" value={form.customer_phone || ""} onChange={e => setF("customer_phone", e.target.value)} className="w-full px-3 py-2.5 border border-nx-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="(555) 000-0000" />
        </div>
        <div>
          <label className="block text-sm font-medium text-nx-text mb-1.5">Job # (optional)</label>
          <input value={form.job_number || ""} onChange={e => setF("job_number", e.target.value)} className="w-full px-3 py-2.5 border border-nx-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="JOB-1024" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-nx-text mb-1.5">Billing Address</label>
          <textarea value={form.billing_address || ""} onChange={e => setF("billing_address", e.target.value)} rows={2} className="w-full px-3 py-2.5 border border-nx-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" placeholder="123 Main St, City, State ZIP" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-nx-text mb-1.5">Service Address</label>
          <textarea value={form.service_address || ""} onChange={e => setF("service_address", e.target.value)} rows={2} className="w-full px-3 py-2.5 border border-nx-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Same as billing or different location" />
        </div>
      </div>
    </div>
  );
}