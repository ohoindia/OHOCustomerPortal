export type Hospital = {
  id: number;
  name: string;
  area: string;
  rating: number;
  reviews: number;
  distance: string;
  icon: string;
};

export type Doctor = {
  id: number;
  name: string;
  specialty: string;
  degree: string;
  experience: string;
  hospital: string;
  rating: number;
  reviews: number;
  fee: number;
  avatar: string;
};

export type WellnessPackage = {
  id: number;
  name: string;
  tests: number;
  price: number;
  oldPrice: number;
  off: string;
  icon: string;
};

export type LabTest = {
  id: number;
  name: string;
  price: number;
};

export type Medicine = {
  id: number;
  name: string;
  pack: string;
  price: number;
  icon: string;
};

export type Booking = {
  id: number;
  type: string;
  title: string;
  subtitle: string;
  date: string;
  status: string;
  icon: string;
};

export const hospitals: Hospital[] = [
  {
    id: 1,
    name: "Apollo Hospitals",
    area: "Jubilee Hills, Hyderabad",
    rating: 4.5,
    reviews: 1280,
    distance: "2.3 km",
    icon: "🏥",
  },
  {
    id: 2,
    name: "KIMS Hospitals",
    area: "Secunderabad, Hyderabad",
    rating: 4.3,
    reviews: 980,
    distance: "3.1 km",
    icon: "🏨",
  },
  {
    id: 3,
    name: "AIG Hospitals",
    area: "Gachibowli, Hyderabad",
    rating: 4.4,
    reviews: 723,
    distance: "4.7 km",
    icon: "🏥",
  },
  {
    id: 4,
    name: "CARE Hospitals",
    area: "Banjara Hills, Hyderabad",
    rating: 4.2,
    reviews: 532,
    distance: "5.2 km",
    icon: "🏨",
  },
];

export const doctors: Doctor[] = [
  {
    id: 1,
    name: "Dr. Rajesh Sharma",
    specialty: "Cardiologist",
    degree: "MBBS, MD - Cardiology",
    experience: "15+ Years",
    hospital: "Apollo Hospitals, Jubilee Hills",
    rating: 4.6,
    reviews: 532,
    fee: 800,
    avatar: "👨🏻‍⚕️",
  },
  {
    id: 2,
    name: "Dr. Ananya Rao",
    specialty: "Pediatrician",
    degree: "MBBS, MD - Pediatrics",
    experience: "12+ Years",
    hospital: "Rainbow Children’s Hospital",
    rating: 4.8,
    reviews: 412,
    fee: 650,
    avatar: "👩🏻‍⚕️",
  },
];

export const packages: WellnessPackage[] = [
  {
    id: 1,
    name: "OHO Basic Health Check",
    tests: 32,
    price: 999,
    oldPrice: 1500,
    off: "33%",
    icon: "🧑‍⚕️",
  },
  {
    id: 2,
    name: "OHO Advanced Health Check",
    tests: 75,
    price: 1999,
    oldPrice: 3500,
    off: "43%",
    icon: "🩺",
  },
  {
    id: 3,
    name: "OHO Senior Citizen Check",
    tests: 68,
    price: 1699,
    oldPrice: 2800,
    off: "39%",
    icon: "👵🏻",
  },
];

export const labTests: LabTest[] = [
  { id: 1, name: "Complete Blood Count (CBC)", price: 350 },
  { id: 2, name: "Lipid Profile", price: 450 },
  { id: 3, name: "Thyroid Profile (T3, T4, TSH)", price: 650 },
  { id: 4, name: "Vitamin D Test", price: 1200 },
  { id: 5, name: "HbA1c", price: 350 },
];

export const medicines: Medicine[] = [
  {
    id: 1,
    name: "Paracetamol 650mg",
    pack: "Strip of 15 Tablets",
    price: 25,
    icon: "💊",
  },
  {
    id: 2,
    name: "Calcium Tablets",
    pack: "Strip of 15 Tablets",
    price: 120,
    icon: "🧴",
  },
  {
    id: 3,
    name: "Vitamin C Tablets",
    pack: "Bottle of 30 Tablets",
    price: 180,
    icon: "🍊",
  },
];

export const bookings: Booking[] = [
  {
    id: 1,
    type: "Doctor",
    title: "Dr. Rajesh Sharma",
    subtitle: "Cardiologist · Apollo Hospitals",
    date: "20 May 2026 · 10:30 AM",
    status: "Upcoming",
    icon: "👨🏻‍⚕️",
  },
  {
    id: 2,
    type: "Package",
    title: "OHO Advanced Health Check",
    subtitle: "OHO Diagnostics, Madhapur",
    date: "21 May 2026 · 08:00 AM",
    status: "Upcoming",
    icon: "🩺",
  },
  {
    id: 3,
    type: "Lab",
    title: "Home Collection",
    subtitle: "Blood Test",
    date: "22 May 2026 · 07:30 AM",
    status: "Upcoming",
    icon: "🧪",
  },
];
