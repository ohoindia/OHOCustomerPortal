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

export const hospitals: Hospital[];
export const doctors: Doctor[];
export const packages: WellnessPackage[];
export const labTests: LabTest[];
export const medicines: Medicine[];
export const bookings: Booking[];
