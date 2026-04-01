import React, { useState } from 'react';
import StatusStepper from '../components/estimates/StatusStepper';
import OptionTabs from '../components/estimates/OptionTabs';
import CustomerSidebar from '../components/estimates/CustomerSidebar';
import EstimateCanvas from '../components/estimates/EstimateCanvas';

const initialCustomer = {
  name: 'Letisia Mejias Dominguez',
  address: '1440 SE 143rd Ave',
  city: 'Portland',
  state: 'OR',
  zip: '97233',
  email: 'Holakidrtis@gmail.com',
  propertyValue: 368912,
  beds: 3,
  baths: 2,
  sqft: 1819,
  builtIn: 2019
};

const initialOptions = [
  { id: 'opt1', name: 'Option #1' }
];

const initialEstimate = {
  number: 27,
  assignedTo: 'Rodolfo Fernandez Romero',
  currentStep: 'approval',
  lineItems: [
    {
      id: 1,
      name: 'Remove Old Flooring',
      description: '',
      quantity: 990,
      unitPrice: 2.00,
      unitCost: 0.00,
      totalPrice: 1980.00
    },
    {
      id: 2,
      name: 'Floor',
      description: 'Apply liquid treatment to eradicate subsoil odor',
      quantity: 990,
      unitPrice: 1.20,
      unitCost: 0.00,
      totalPrice: 1188.00
    }
  ]
};

export default function Estimates() {
  const [customer] = useState(initialCustomer);
  const [options, setOptions] = useState(initialOptions);
  const [activeOption, setActiveOption] = useState('opt1');
  const [estimate, setEstimate] = useState(initialEstimate);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const handleOptionChange = (optionId) => {
    setActiveOption(optionId);
  };

  const handleAddOption = () => {
    const newOption = {
      id: `opt${options.length + 1}`,
      name: `Option #${options.length + 1}`
    };
    setOptions([...options, newOption]);
    setActiveOption(newOption.id);
  };

  const handleUpdateLineItem = (updatedItem) => {
    setEstimate(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      )
    }));
  };

  const handleDeleteLineItem = (itemId) => {
    setEstimate(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== itemId)
    }));
  };

  const handleAddLineItem = () => {
    const newItem = {
      id: Date.now(),
      name: 'New Service',
      description: '',
      quantity: 1,
      unitPrice: 0.00,
      unitCost: 0.00,
      totalPrice: 0.00
    };
    setEstimate(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem]
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <div className="bg-white border-b border-border">
        <div className="px-6">
          <OptionTabs
            options={options}
            activeOption={activeOption}
            onOptionChange={handleOptionChange}
            onAddOption={handleAddOption}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="flex gap-6">
          {/* Customer Sidebar */}
          <CustomerSidebar
            customer={customer}
            isExpanded={sidebarExpanded}
            onToggle={() => setSidebarExpanded(!sidebarExpanded)}
          />

          {/* Main Canvas Area */}
          <div className="flex-1 space-y-6">
            {/* Status Stepper */}
            <div className="bg-white rounded-lg border border-border p-6">
              <StatusStepper currentStep={estimate.currentStep} />
            </div>

            {/* Estimate Canvas */}
            <EstimateCanvas
              estimate={estimate}
              onUpdateLineItem={handleUpdateLineItem}
              onDeleteLineItem={handleDeleteLineItem}
              onAddLineItem={handleAddLineItem}
            />
          </div>
        </div>
      </div>
    </div>
  );
}