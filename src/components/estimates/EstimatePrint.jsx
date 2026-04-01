import React from 'react';

export default function EstimatePrint({ estimate }) {
  const handlePrint = () => window.print();

  return (
    <div>
      <div id="estimate-print-area" className="bg-white p-10 max-w-3xl mx-auto font-inter text-sm">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ESTIMATE</h1>
            <p className="text-gray-500 text-lg">#{estimate.estimate_number}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-xl text-blue-600">FSM Pro</p>
            <p className="text-gray-500 text-xs mt-1">Field Service Management</p>
          </div>
        </div>

        {/* Client Info */}
        <div className="grid grid-cols-2 gap-8 mb-8 p-5 bg-gray-50 rounded-xl">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
            <p className="font-semibold text-gray-900">{estimate.client_name}</p>
            {estimate.client_address && <p className="text-gray-600 mt-0.5">{estimate.client_address}</p>}
            {estimate.client_phone && <p className="text-gray-600">{estimate.client_phone}</p>}
            {estimate.client_email && <p className="text-gray-600">{estimate.client_email}</p>}
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Date:</span>
                <span className="font-medium">{new Date().toLocaleDateString()}</span>
              </div>
              {estimate.expiration_date && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Expires:</span>
                  <span className="font-medium">{estimate.expiration_date}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Status:</span>
                <span className={`font-semibold capitalize ${
                  estimate.status === 'approved' ? 'text-green-600' :
                  estimate.status === 'declined' ? 'text-red-600' : 'text-blue-600'
                }`}>{estimate.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <table className="w-full mb-6">
          <thead>
            <tr className="bg-gray-900 text-white">
              <th className="text-left p-3 rounded-tl-lg font-medium">Service</th>
              <th className="text-center p-3 font-medium w-20">Qty</th>
              <th className="text-right p-3 font-medium w-28">Unit Price</th>
              <th className="text-right p-3 rounded-tr-lg font-medium w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {(estimate.line_items || []).map((item, idx) => (
              <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-3">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  {item.description && <p className="text-gray-500 text-xs mt-0.5">{item.description}</p>}
                </td>
                <td className="p-3 text-center text-gray-700">{item.quantity}</td>
                <td className="p-3 text-right text-gray-700">${(item.unit_price || 0).toFixed(2)}</td>
                <td className="p-3 text-right font-semibold text-gray-900">${(item.total_price || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">${(estimate.subtotal || 0).toFixed(2)}</span>
            </div>
            {estimate.tax_rate > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tax ({estimate.tax_rate}%)</span>
                <span className="font-medium">${(estimate.tax_amount || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="font-bold text-gray-900 text-base">TOTAL</span>
              <span className="font-bold text-blue-600 text-base">${(estimate.total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {estimate.notes && (
          <div className="border-t border-gray-200 pt-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
            <p className="text-gray-600 whitespace-pre-wrap">{estimate.notes}</p>
          </div>
        )}

        {/* Signature area */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-10">
            <div>
              <div className="border-b border-gray-300 pb-6 mb-2"></div>
              <p className="text-xs text-gray-400">Customer Signature</p>
            </div>
            <div>
              <div className="border-b border-gray-300 pb-6 mb-2"></div>
              <p className="text-xs text-gray-400">Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}