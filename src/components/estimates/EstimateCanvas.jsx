import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  Plus, 
  List, 
  LayoutGrid, 
  Pencil,
  BookOpen,
  FileText,
  User
} from 'lucide-react';
import LineItemRow from './LineItemRow';

export default function EstimateCanvas({ 
  estimate, 
  onUpdateLineItem, 
  onDeleteLineItem,
  onAddLineItem 
}) {
  const [viewMode, setViewMode] = useState('list');

  const subtotal = estimate.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div className="flex-1 space-y-6">
      {/* Estimate Header */}
      <Card className="shadow-sm border border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Estimate <span className="text-primary">#{estimate.number}</span>
            </h2>
            
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Expiration date:</span>
                <button className="flex items-center gap-1 text-primary hover:underline">
                  <Plus className="w-3 h-3" />
                  Expiration date
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Customer can approve:</span>
                <button className="text-primary hover:underline">
                  Only one option
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items Section */}
      <Card className="shadow-sm border border-border">
        <CardContent className="p-6">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Line items</h3>
            
            <div className="flex items-center gap-2">
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Assigned To */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{estimate.assignedTo}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Pencil className="w-3 h-3 text-muted-foreground" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 mb-4">
            <button className="flex items-center gap-1 text-sm text-primary hover:underline">
              <FileText className="w-4 h-4" />
              Templates
            </button>
            <button className="flex items-center gap-1 text-sm text-primary hover:underline">
              <BookOpen className="w-4 h-4" />
              Service Price Book
            </button>
          </div>

          {/* Services Label */}
          <div className="mb-2">
            <span className="text-sm font-medium text-foreground">Services</span>
          </div>

          {/* Line Items */}
          <div className="divide-y divide-border">
            {estimate.lineItems.map((item) => (
              <LineItemRow
                key={item.id}
                item={item}
                onUpdate={onUpdateLineItem}
                onDelete={onDeleteLineItem}
              />
            ))}
          </div>

          {/* Add Service Button */}
          <div className="mt-4 pt-4 border-t border-border">
            <Button 
              variant="outline" 
              className="text-primary border-primary hover:bg-primary/5"
              onClick={onAddLineItem}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add service
            </Button>
          </div>

          {/* Subtotal */}
          <div className="mt-6 pt-4 border-t border-border flex justify-end">
            <div className="text-right">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <p className="text-xl font-bold text-foreground">
                ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}