// Types
export type UserRole = 'admin' | 'agronomist' | 'farmer';
export type FarmerStatus = 'pending' | 'approved' | 'rejected';

export interface Farmer {
  id: string;
  fullName: string;
  phoneNumber: string;
  cropType: string;
  farmSize: number; // in hectares
  expectedYield: number; // in tons
  location: {
    latitude: number;
    longitude: number;
  };
  status: FarmerStatus;
  submissionDate: Date;
  rejectionReason?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Notification {
  id: string;
  type: 'approval' | 'rejection' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// Mock Users
export const mockUsers: Record<UserRole, User> = {
  admin: {
    id: 'admin-1',
    name: 'Rajesh Kumar',
    email: 'rajesh.admin@farmiclegrow.com',
    role: 'admin',
  },
  agronomist: {
    id: 'agro-1',
    name: 'Priya Sharma',
    email: 'priya.agro@farmiclegrow.com',
    role: 'agronomist',
  },
  farmer: {
    id: 'farmer-1',
    name: 'Amit Patel',
    email: 'amit.patel@farm.com',
    role: 'farmer',
  },
};

// Mock Farmers
export const mockFarmers: Farmer[] = [
  {
    id: 'farmer-101',
    fullName: 'Deepak Singh',
    phoneNumber: '+91-9876543210',
    cropType: 'Wheat',
    farmSize: 2.5,
    expectedYield: 5.2,
    location: {
      latitude: 28.6139,
      longitude: 77.209,
    },
    status: 'pending',
    submissionDate: new Date('2024-04-15'),
  },
  {
    id: 'farmer-102',
    fullName: 'Meera Devi',
    phoneNumber: '+91-9876543211',
    cropType: 'Rice',
    farmSize: 3.0,
    expectedYield: 6.5,
    location: {
      latitude: 28.5244,
      longitude: 77.1855,
    },
    status: 'approved',
    submissionDate: new Date('2024-04-10'),
  },
  {
    id: 'farmer-103',
    fullName: 'Vikram Joshi',
    phoneNumber: '+91-9876543212',
    cropType: 'Maize',
    farmSize: 1.8,
    expectedYield: 4.2,
    location: {
      latitude: 28.4595,
      longitude: 77.0266,
    },
    status: 'pending',
    submissionDate: new Date('2024-04-18'),
  },
  {
    id: 'farmer-104',
    fullName: 'Sunita Rao',
    phoneNumber: '+91-9876543213',
    cropType: 'Cotton',
    farmSize: 2.2,
    expectedYield: 3.8,
    location: {
      latitude: 28.7041,
      longitude: 77.1025,
    },
    status: 'rejected',
    submissionDate: new Date('2024-04-05'),
    rejectionReason: 'Farm size below minimum requirement',
  },
  {
    id: 'farmer-105',
    fullName: 'Ramesh Gupta',
    phoneNumber: '+91-9876543214',
    cropType: 'Sugarcane',
    farmSize: 4.5,
    expectedYield: 8.9,
    location: {
      latitude: 28.5355,
      longitude: 77.391,
    },
    status: 'approved',
    submissionDate: new Date('2024-04-08'),
  },
  {
    id: 'farmer-106',
    fullName: 'Anita Verma',
    phoneNumber: '+91-9876543215',
    cropType: 'Soybean',
    farmSize: 2.0,
    expectedYield: 3.5,
    location: {
      latitude: 28.4744,
      longitude: 77.5052,
    },
    status: 'pending',
    submissionDate: new Date('2024-04-20'),
  },
  {
    id: 'farmer-107',
    fullName: 'Harjeet Singh',
    phoneNumber: '+91-9876543216',
    cropType: 'Chickpea',
    farmSize: 1.5,
    expectedYield: 2.8,
    location: {
      latitude: 28.6162,
      longitude: 77.2206,
    },
    status: 'approved',
    submissionDate: new Date('2024-04-03'),
  },
  {
    id: 'farmer-108',
    fullName: 'Kavya Nair',
    phoneNumber: '+91-9876543217',
    cropType: 'Groundnut',
    farmSize: 2.8,
    expectedYield: 4.9,
    location: {
      latitude: 28.5244,
      longitude: 77.1855,
    },
    status: 'pending',
    submissionDate: new Date('2024-04-19'),
  },
  {
    id: 'farmer-109',
    fullName: 'Suresh Yadav',
    phoneNumber: '+91-9876543218',
    cropType: 'Barley',
    farmSize: 2.3,
    expectedYield: 4.5,
    location: {
      latitude: 28.7041,
      longitude: 77.1025,
    },
    status: 'approved',
    submissionDate: new Date('2024-04-12'),
  },
  {
    id: 'farmer-110',
    fullName: 'Lakshmi Das',
    phoneNumber: '+91-9876543219',
    cropType: 'Lentil',
    farmSize: 1.7,
    expectedYield: 3.2,
    location: {
      latitude: 28.5355,
      longitude: 77.391,
    },
    status: 'rejected',
    submissionDate: new Date('2024-04-06'),
    rejectionReason: 'Incomplete documentation',
  },
];

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'approval',
    title: 'Application Approved',
    message: 'Your farm registration has been approved by the admin team.',
    timestamp: new Date('2024-04-18T10:30:00'),
    read: true,
  },
  {
    id: 'notif-2',
    type: 'system',
    title: 'New Feature Available',
    message: 'Weather alerts are now available in your dashboard.',
    timestamp: new Date('2024-04-17T14:15:00'),
    read: true,
  },
  {
    id: 'notif-3',
    type: 'system',
    title: 'Yield Prediction Updated',
    message: 'Your crop yield prediction has been updated based on recent data.',
    timestamp: new Date('2024-04-16T09:45:00'),
    read: false,
  },
  {
    id: 'notif-4',
    type: 'system',
    title: 'Reminder: Submit Monthly Report',
    message: 'Please submit your monthly crop report to stay updated.',
    timestamp: new Date('2024-04-15T16:20:00'),
    read: false,
  },
];

// Helper functions
export function getFarmerById(id: string): Farmer | undefined {
  return mockFarmers.find((farmer) => farmer.id === id);
}

export function getFarmersByStatus(
  status: FarmerStatus
): Farmer[] {
  return mockFarmers.filter((farmer) => farmer.status === status);
}

export function getStatsCounts() {
  return {
    total: mockFarmers.length,
    pending: mockFarmers.filter((f) => f.status === 'pending').length,
    approved: mockFarmers.filter((f) => f.status === 'approved').length,
    rejected: mockFarmers.filter((f) => f.status === 'rejected').length,
  };
}
