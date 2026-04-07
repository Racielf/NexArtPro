// Single source of truth for services
export const SERVICES_LIST = [
  {
    id: 'bathroom',
    name: 'Bathroom Remodeling',
    description: 'Modern bathroom renovations with premium fixtures, tile work, and spacious designs that enhance both functionality and aesthetics.',
    image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&h=400&fit=crop',
  },
  {
    id: 'kitchen',
    name: 'Kitchen Remodeling',
    description: 'Complete kitchen redesigns including cabinetry, countertops, appliances, and layout optimization for the heart of your home.',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop',
  },
  {
    id: 'painting',
    name: 'Interior & Exterior Painting',
    description: 'Professional interior and exterior painting services using premium paints and expert application techniques for lasting results.',
    image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=600&h=400&fit=crop',
  },
  {
    id: 'drywall',
    name: 'Drywall Installation & Repair',
    description: 'Expert drywall installation, repair, and finishing for smooth, professional walls and ceilings that stand the test of time.',
    image: 'https://images.unsplash.com/photo-1565084888279-d2b6ba0c0109?w=600&h=400&fit=crop',
  },
  {
    id: 'flooring',
    name: 'Flooring Installation',
    description: 'Quality flooring solutions including hardwood, tile, vinyl, and laminate installations tailored to your style and budget.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop',
  },
  {
    id: 'general',
    name: 'General Repairs & Handyman',
    description: 'Reliable general repair and handyman services for all your home maintenance and improvement needs, big or small.',
    image: 'https://images.unsplash.com/photo-1581092162562-40038f56386d?w=600&h=400&fit=crop',
  },
];

export const getServiceById = (id) => {
  return SERVICES_LIST.find(service => service.id === id);
};

export const getServiceName = (id) => {
  const service = getServiceById(id);
  return service ? service.name : null;
};