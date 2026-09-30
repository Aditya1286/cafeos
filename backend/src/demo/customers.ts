import { DemoCafe } from './cafes';
import { chance } from './random';

// Each demo café's made-up customers: a small set of regulars who come back again and again (repeat-
// customer stats, lifetime spend), and a large pool of occasional visitors who mostly order once.
// Their numbers start with 5 — no Indian mobile number does — so no message can reach a real person.
const POOL_SIZE = 5000;
const REGULARS = 80;

const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Akash', 'Ananya', 'Anil', 'Arjun', 'Ayesha', 'Bhavana', 'Chaitra', 'Darshan', 'Deepa',
  'Divya', 'Farhan', 'Ganesh', 'Gautham', 'Harsha', 'Ishaan', 'Joseph', 'Karthik', 'Kavya', 'Keerthi', 'Kiran',
  'Lakshmi', 'Madhu', 'Manoj', 'Maria', 'Meghana', 'Mohan', 'Nandini', 'Naveen', 'Nikhil', 'Nithya', 'Pavan',
  'Pooja', 'Pradeep', 'Pranav', 'Priya', 'Rahul', 'Rakesh', 'Ramya', 'Rashmi', 'Rhea', 'Rohan', 'Sahana',
  'Sandeep', 'Sanjana', 'Shreya', 'Shruti', 'Siddharth', 'Sneha', 'Srinivas', 'Suresh', 'Swathi', 'Tanvi',
  'Tejas', 'Varun', 'Vidya', 'Vikram', 'Vinay', 'Yash', 'Zoya'
];

const LAST_NAMES = [
  'Rao', 'Reddy', 'Iyer', 'Nair', 'Shetty', 'Gowda', 'Hegde', 'Kumar', 'Sharma', 'Menon', 'Pillai', 'Bhat',
  'Kamath', 'Naidu', 'Joshi', 'Kulkarni', 'Patil', 'Das', 'Khan', "D'Souza", 'Fernandes', 'Singh', 'Gupta',
  'Varma', 'Prasad', 'Murthy', 'Acharya', 'Krishnan'
];

export interface DemoCustomer {
  name: string;
  phone: string; // 10 digits, e.g. 5100000042
}

export const customerAt = (cafe: DemoCafe, index: number): DemoCustomer => ({
  name: `${FIRST_NAMES[(index * 7 + Number(cafe.phoneDigit) * 3) % FIRST_NAMES.length]} ${
    LAST_NAMES[(index * 13 + Number(cafe.phoneDigit)) % LAST_NAMES.length]
  }`,
  phone: `5${cafe.phoneDigit}${String(index).padStart(8, '0')}`
});

// A regular most of the time (per the café's repeatShare), otherwise anyone from the wider pool.
export const pickCustomer = (cafe: DemoCafe): DemoCustomer => {
  const index = chance(cafe.traffic.repeatShare)
    ? Math.floor(Math.random() * REGULARS)
    : REGULARS + Math.floor(Math.random() * (POOL_SIZE - REGULARS));
  return customerAt(cafe, index);
};

// The OTP service's stored form of a demo number ("91" + 10 digits), for its verification records.
export const verificationMobileOf = (phone: string) => `91${phone}`;
