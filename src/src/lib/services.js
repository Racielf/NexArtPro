// Single source of truth for services - simplified, high-level construction services
export const SERVICES_LIST = [
  {
    id: 'kitchen',
    name: 'Kitchen Remodeling',
    description: 'Complete kitchen redesigns including cabinetry, countertops, appliances, and layout optimization.',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop',
  },
  {
    id: 'bathroom',
    name: 'Bathroom Remodeling',
    description: 'Modern bathroom renovations with premium fixtures, tile work, and spacious designs.',
    image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&h=400&fit=crop',
  },
  {
    id: 'painting-interior',
    name: 'Interior Painting',
    description: 'Quality interior wall and ceiling painting with attention to detail.',
    image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=600&h=400&fit=crop',
  },
  {
    id: 'painting-exterior',
    name: 'Exterior Painting',
    description: 'Weather-resistant exterior painting and finishing for your home\'s curb appeal.',
    image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=600&h=400&fit=crop',
  },
  {
    id: 'flooring',
    name: 'Flooring Installation',
    description: 'Quality flooring solutions including hardwood, tile, vinyl, and laminate installations.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop',
  },
  {
    id: 'drywall-repair',
    name: 'Drywall Repair',
    description: 'Expert drywall installation, repair, and finishing for smooth, professional walls and ceilings.',
    image: 'https://images.unsplash.com/photo-1565084888279-d2b6ba0c0109?w=600&h=400&fit=crop',
  },
  {
    id: 'roofing',
    name: 'Roof Repair / Replacement',
    description: 'Professional roofing repair and replacement services to protect your home.',
    image: 'https://images.unsplash.com/photo-1553618929-474fa15ae351?w=600&h=400&fit=crop',
  },
  {
    id: 'general-renovation',
    name: 'General Home Renovation',
    description: 'Comprehensive home renovation and restoration services for your space.',
    image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&h=400&fit=crop',
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    description: 'Professional plumbing installation, repair, and maintenance services.',
    image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&h=400&fit=crop',
  },
  {
    id: 'electrical',
    name: 'Electrical Work',
    description: 'Licensed electrical installation, repair, and upgrade services.',
    image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&h=400&fit=crop',
  },
  {
    id: 'carpentry',
    name: 'Carpentry',
    description: 'Custom carpentry, trim work, and fine wood finishing.',
    image: 'https://images.unsplash.com/photo-1581092162562-40038f56386d?w=600&h=400&fit=crop',
  },
  {
    id: 'doors-windows',
    name: 'Door & Window Installation',
    description: 'Professional installation of doors, windows, and frames.',
    image: 'https://images.unsplash.com/photo-1581092162562-40038f56386d?w=600&h=400&fit=crop',
  },
  {
    id: 'home-additions',
    name: 'Home Additions',
    description: 'Design and construction of room additions and home expansions.',
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&h=400&fit=crop',
  },
  {
    id: 'basement-finishing',
    name: 'Basement Finishing',
    description: 'Complete basement finishing and renovation services.',
    image: 'https://images.unsplash.com/photo-1585399363686-b80b97701bfb?w=600&h=400&fit=crop',
  },
  {
    id: 'deck-patio',
    name: 'Deck & Patio Construction',
    description: 'Design and construction of decks, patios, and outdoor living spaces.',
    image: 'https://images.unsplash.com/photo-1600210691155-8e4962a7c1df?w=600&h=400&fit=crop',
  },
];

export const getServiceById = (id) => {
  return SERVICES_LIST.find(service => service.id === id);
};

export const getServiceName = (id) => {
  const service = getServiceById(id);
  return service ? service.name : null;
};