import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Minus, Pencil, X } from 'lucide-react';

export default function LineItemRow({ 
  item, 
  onUpdate, 
  onDelete,
  showCost = true 
}) {
  const handleQuantityChange = (e) => {
    const quantity = parseFloat(e.target.value) || 0;
    onUpdate({ 
      ...item, 
      quantity,
      totalPrice: quantity * item.unitPrice 
    });
  };

  const handleUnitPriceChange = (e) => {
    const unitPrice = parseFloat(e.target.value) || 0;
    onUpdate({ 
      ...item, 
      unitPrice,
      totalPrice: item.quantity * unitPrice 
    });
  };

  return (
    <div className="border-b border-border py-4">
      <div className="flex items-start gap-4">
        {/* Drag handle / Icon */}
        <div className="flex items-center justify-center w-8 h-8 bg-muted rounded mt-1">
          <Minus className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Service Name and Description */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground">{item.name}</h4>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
          )}
          
          {/* Unit Cost (Admin only) */}
          {showCost && (
            <div className="mt-3">
              <span className="text-xs text-muted-foreground">Unit cost</span>
              <p className="text-sm font-medium text-foreground">
                ${item.unitCost?.toFixed(2) || '0.00'}
              </p>
            </div>
          )}
        </div>

        {/* Quantity */}
        <div className="text-center w-20">
          <span className="text-xs text-muted-foreground block mb-1">Quantity</span>
          <Input
            type="number"
            value={item.quantity}
            onChange={handleQuantityChange}
            className="text-center h-8 text-sm"
          />
        </div>

        {/* Unit Price */}
        <div className="text-center w-24">
          <span className="text-xs text-muted-foreground block mb-1">Unit price</span>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              step="0.01"
              value={item.unitPrice}
              onChange={handleUnitPriceChange}
              className="text-center h-8 text-sm pl-5"
            />
          </div>
        </div>

        {/* Total Price */}
        <div className="text-right w-24">
          <span className="text-xs text-muted-foreground block mb-1">Total price</span>
          <p className="text-sm font-semibold text-foreground h-8 flex items-center justify-end">
            ${item.totalPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => onDelete(item.id)}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
}