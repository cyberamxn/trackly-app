// Centralized mock data for Trackly. All B&W, no colors.

export const expenseCategories = [
  { id: "food", label: "Food", icon: "utensils" },
  { id: "fuel", label: "Fuel", icon: "fuel" },
  { id: "rent", label: "Rent", icon: "home" },
  { id: "emi", label: "EMI", icon: "credit-card" },
  { id: "grocery", label: "Grocery", icon: "shopping-cart" },
  { id: "shopping", label: "Shopping", icon: "shopping-bag" },
  { id: "bills", label: "Bills", icon: "receipt" },
  { id: "travel", label: "Travel", icon: "plane" },
  { id: "entertainment", label: "Entertainment", icon: "film" },
  { id: "healthcare", label: "Healthcare", icon: "heart-pulse" },
  { id: "education", label: "Education", icon: "graduation-cap" },
  { id: "others", label: "Others", icon: "more-horizontal" },
] as const;

export const paymentMethods = ["Cash", "Card", "UPI", "Net Banking", "Wallet"];

export interface Expense {
  id: string;
  title: string;
  merchant: string;
  amount: number;
  category: string;
  method: string;
  date: string; // ISO
  time: string;
  notes?: string;
  tags?: string[];
}

export const todayExpenses: Expense[] = [
  { id: "e1", title: "Starbucks Coffee", merchant: "Starbucks", amount: 280, category: "food", method: "Card", date: "2026-07-18", time: "09:12", notes: "Morning latte", tags: ["coffee"] },
  { id: "e2", title: "Uber to Office", merchant: "Uber", amount: 145, category: "travel", method: "UPI", date: "2026-07-18", time: "09:45" },
  { id: "e3", title: "Lunch", merchant: "Sweetgreen", amount: 420, category: "food", method: "Card", date: "2026-07-18", time: "13:05" },
  { id: "e4", title: "Petrol", merchant: "Shell", amount: 1200, category: "fuel", method: "Card", date: "2026-07-18", time: "18:20", notes: "Full tank" },
  { id: "e5", title: "Groceries", merchant: "Whole Foods", amount: 890, category: "shopping", method: "Card", date: "2026-07-18", time: "19:30" },
];

export const weekExpenses: Expense[] = [
  { id: "w1", title: "Movie Night", merchant: "PVR Cinemas", amount: 650, category: "entertainment", method: "Card", date: "2026-07-17", time: "21:00" },
  { id: "w2", title: "Gym Membership", merchant: "Equinox", amount: 2500, category: "healthcare", method: "Card", date: "2026-07-16", time: "07:00" },
  { id: "w3", title: "Internet Bill", merchant: "Airtel", amount: 1199, category: "bills", method: "UPI", date: "2026-07-15", time: "10:00" },
  { id: "w4", title: "Book Purchase", merchant: "Crossword", amount: 540, category: "education", method: "Cash", date: "2026-07-14", time: "16:30" },
  { id: "w5", title: "Dinner", merchant: "The Table", amount: 1850, category: "food", method: "Card", date: "2026-07-13", time: "20:15" },
];

export const allExpenses = [...todayExpenses, ...weekExpenses];

export interface Income {
  id: string;
  source: string;
  amount: number;
  date: string;
  method: string;
}

export const incomes: Income[] = [
  { id: "i1", source: "Salary", amount: 85000, date: "2026-07-01", method: "Bank Transfer" },
  { id: "i2", source: "Freelance Project", amount: 12000, date: "2026-07-10", method: "UPI" },
  { id: "i3", source: "Dividend", amount: 2400, date: "2026-07-12", method: "Bank Transfer" },
];

export interface ShoppingItem {
  id: string;
  name: string;
  store: string;
  price: number;
  status: "pending" | "purchased" | "wishlist";
  returnDeadline?: string;
  warranty?: string;
  hasBill?: boolean;
}

export const shoppingItems: ShoppingItem[] = [
  { id: "s1", name: "AirPods Pro 2", store: "Apple Store", price: 24900, status: "purchased", returnDeadline: "2026-07-25", warranty: "1 Year", hasBill: true },
  { id: "s2", name: "Standing Desk", store: "IKEA", price: 18999, status: "purchased", returnDeadline: "2026-08-02", warranty: "5 Years", hasBill: true },
  { id: "s3", name: "Mechanical Keyboard", store: "Amazon", price: 7500, status: "pending" },
  { id: "s4", name: "Office Chair", store: "IKEA", price: 12500, status: "pending" },
  { id: "s5", name: "Sony A7 IV", store: "Sony Center", price: 215000, status: "wishlist" },
  { id: "s6", name: "iPad Pro M4", store: "Apple Store", price: 99900, status: "wishlist" },
  { id: "s7", name: "Coffee Beans 1kg", store: "Blue Tokai", price: 950, status: "pending" },
];

export interface BorrowLend {
  id: string;
  person: string;
  type: "borrowed" | "lent";
  amount: number;
  paid: number;
  dueDate: string;
  note?: string;
  reason?: string;
  paymentMethod?: "cash" | "online";
  date?: string;
}

export const borrowLendItems: BorrowLend[] = [
  { id: "b1", person: "Rahul Sharma", type: "lent", amount: 5000, paid: 2000, dueDate: "2026-07-30", note: "For concert tickets", reason: "Concert tickets", paymentMethod: "online", date: "2026-07-10" },
  { id: "b2", person: "Priya Patel", type: "borrowed", amount: 2500, paid: 0, dueDate: "2026-08-15", reason: "Shopping", paymentMethod: "cash", date: "2026-07-12" },
  { id: "b3", person: "Arjun Mehta", type: "lent", amount: 8000, paid: 8000, dueDate: "2026-07-10", note: "Trip split", reason: "Trip split", paymentMethod: "online", date: "2026-07-05" },
  { id: "b4", person: "Sneha Reddy", type: "borrowed", amount: 1500, paid: 500, dueDate: "2026-08-05", reason: "Emergency", paymentMethod: "cash", date: "2026-07-14" },
];

export interface Habit {
  id: string;
  name: string;
  icon: string;
  streak: number;
  goal: number;
  done: number;
  unit: string;
  history: boolean[]; // last 7 days, Mon-Sun
}

export const habits: Habit[] = [
  { id: "h1", name: "Gym", icon: "dumbbell", streak: 12, goal: 1, done: 1, unit: "session", history: [true, true, false, true, true, true, true] },
  { id: "h2", name: "Water Intake", icon: "droplet", streak: 30, goal: 8, done: 5, unit: "glasses", history: [true, true, true, true, true, true, true] },
  { id: "h3", name: "Reading", icon: "book-open", streak: 7, goal: 30, done: 20, unit: "min", history: [false, true, true, true, true, true, true] },
  { id: "h4", name: "Meditation", icon: "brain", streak: 21, goal: 15, done: 15, unit: "min", history: [true, true, true, true, true, true, true] },
  { id: "h5", name: "Coding", icon: "code", streak: 45, goal: 60, done: 45, unit: "min", history: [true, true, true, true, true, true, true] },
  { id: "h6", name: "Walking", icon: "footprints", streak: 5, goal: 10000, done: 7200, unit: "steps", history: [false, false, true, true, true, true, true] },
  { id: "h7", name: "Sleep", icon: "moon", streak: 3, goal: 8, done: 7, unit: "hrs", history: [false, true, true, false, true, true, true] },
];

export interface RoutineTask {
  id: string;
  label: string;
  done: boolean;
}

export interface Routine {
  id: string;
  period: "Morning" | "Afternoon" | "Evening" | "Night";
  icon: string;
  tasks: RoutineTask[];
}

export const routines: Routine[] = [
  {
    id: "r1", period: "Morning", icon: "sunrise", tasks: [
      { id: "t1", label: "Drink water (500ml)", done: true },
      { id: "t2", label: "Meditate 10 min", done: true },
      { id: "t3", label: "Workout", done: true },
      { id: "t4", label: "Cold shower", done: false },
    ]
  },
  {
    id: "r2", period: "Afternoon", icon: "sun", tasks: [
      { id: "t5", label: "Lunch (light)", done: true },
      { id: "t6", label: "10 min walk", done: false },
      { id: "t7", label: "Read 15 min", done: false },
    ]
  },
  {
    id: "r3", period: "Evening", icon: "sunset", tasks: [
      { id: "t8", label: "Dinner", done: false },
      { id: "t9", label: "Family time", done: false },
      { id: "t10", label: "Plan tomorrow", done: false },
    ]
  },
  {
    id: "r4", period: "Night", icon: "moon", tasks: [
      { id: "t11", label: "Skincare", done: false },
      { id: "t12", label: "Journal", done: false },
      { id: "t13", label: "Lights off by 11pm", done: false },
    ]
  },
];

export interface Note {
  id: string;
  title: string;
  preview: string;
  date: string;
  pinned: boolean;
  hasImage?: boolean;
  hasVoice?: boolean;
  hasChecklist?: boolean;
  tags?: string[];
}

export const notes: Note[] = [
  { id: "n1", title: "Q3 Goals", preview: "Ship Trackly v2, hit 10k MRR, hire designer...", date: "2026-07-17", pinned: true, hasChecklist: true, tags: ["work"] },
  { id: "n2", title: "Book Ideas", preview: "Atomic Habits meets Getting Things Done...", date: "2026-07-15", pinned: true, hasVoice: true, tags: ["personal"] },
  { id: "n3", title: "Trip to Japan", preview: "Tokyo → Kyoto → Osaka. Day 1: Shibuya crossing...", date: "2026-07-12", pinned: false, hasImage: true, tags: ["travel"] },
  { id: "n4", title: "Meeting Notes", preview: "Discussed roadmap, prioritized Quick Add...", date: "2026-07-10", pinned: false, tags: ["work"] },
  { id: "n5", title: "Recipe", preview: "Pasta carbonara — guanciale, pecorino, eggs...", date: "2026-07-08", pinned: false, hasChecklist: true },
  { id: "n6", title: "Birthday Gift Ideas", preview: "Mom: silk scarf, watch. Dad: leather wallet...", date: "2026-07-05", pinned: false },
];

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "task" | "bill" | "event" | "birthday" | "reminder";
}

export const calendarEvents: CalendarEvent[] = [
  { id: "c1", title: "Credit Card Bill", date: "2026-07-20", type: "bill" },
  { id: "c2", title: "Mom's Birthday", date: "2026-07-22", type: "birthday" },
  { id: "c3", title: "Dentist Appointment", date: "2026-07-24", type: "event" },
  { id: "c4", title: "Submit Project Report", date: "2026-07-25", type: "task" },
  { id: "c5", title: "Pay Rent", date: "2026-08-01", type: "bill" },
  { id: "c6", title: "Friend's Wedding", date: "2026-08-10", type: "event" },
];

export interface AppNotification {
  id: string;
  category: "Bills" | "Habits" | "Budget" | "Borrow" | "Shopping";
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

export const notifications: AppNotification[] = [
  { id: "nt1", category: "Bills", title: "Credit Card Bill Due", body: "₹12,450 due in 2 days. Pay now to avoid late fee.", time: "2h ago", unread: true },
  { id: "nt2", category: "Habits", title: "Hydration Reminder", body: "You've had 5/8 glasses of water today. 3 more to go.", time: "3h ago", unread: true },
  { id: "nt3", category: "Budget", title: "80% Budget Used", body: "You've spent ₹24,500 of your ₹30,000 monthly budget.", time: "5h ago", unread: true },
  { id: "nt4", category: "Borrow", title: "Rahul owes you ₹3,000", body: "Due in 12 days. Tap to send a gentle reminder.", time: "1d ago", unread: false },
  { id: "nt5", category: "Shopping", title: "Return Deadline Tomorrow", body: "AirPods Pro 2 return window closes tomorrow.", time: "1d ago", unread: false },
  { id: "nt6", category: "Habits", title: "Streak Achievement", body: "45-day coding streak! Keep it up.", time: "2d ago", unread: false },
];

// ===== Stats helpers =====
export const monthlyBudget = 30000;
export const todaySpending = todayExpenses.reduce((s, e) => s + e.amount, 0);
export const weekSpending = [...todayExpenses, ...weekExpenses].reduce((s, e) => s + e.amount, 0);
export const monthSpending = 24500;
export const monthIncome = incomes.reduce((s, i) => s + i.amount, 0);

export const weeklyTrend = [
  { day: "Mon", amount: 1850 },
  { day: "Tue", amount: 540 },
  { day: "Wed", amount: 1199 },
  { day: "Thu", amount: 2500 },
  { day: "Fri", amount: 650 },
  { day: "Sat", amount: 890 },
  { day: "Sun", amount: todaySpending },
];

export const categoryBreakdown = [
  { category: "Food", amount: 5680, percent: 23 },
  { category: "Fuel", amount: 4200, percent: 17 },
  { category: "Bills", amount: 3699, percent: 15 },
  { category: "Shopping", amount: 3380, percent: 14 },
  { category: "Healthcare", amount: 2500, percent: 10 },
  { category: "Entertainment", amount: 1850, percent: 8 },
  { category: "Travel", amount: 1450, percent: 6 },
  { category: "Others", amount: 1241, percent: 7 },
];

export const habitCompletion = [
  { day: "Mon", pct: 71 },
  { day: "Tue", pct: 86 },
  { day: "Wed", pct: 86 },
  { day: "Thu", pct: 100 },
  { day: "Fri", pct: 100 },
  { day: "Sat", pct: 100 },
  { day: "Sun", pct: 86 },
];

// ===== Format helpers =====
export function formatINR(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

export function formatTime(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
