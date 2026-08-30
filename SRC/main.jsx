import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  Building2,
  Wallet,
  Users,
  UserRound,
  Bell,
  Plus,
  Bot,
  Send,
  Search,
  ChevronRight,
  ChevronDown,
  CreditCard,
  BriefcaseBusiness,
  TrendingUp,
  Menu,
  X,
  Check,
  AlertTriangle,
  MessageSquare,
  LogOut,
  LogIn,
  UserPlus,
  Package,
  Landmark,
  ShieldCheck,
  Settings,
  RefreshCw,
  Save,
  Sparkles,
  MapPin,
  Eye,
  MessageCircle,
  Store,
  Wrench,
  PiggyBank,
  Gift,
  Activity,
  ClipboardList,
  Boxes,
  Receipt,
  ShoppingCart,
  CalendarClock,
  ListChecks,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import "./styles.css";
import { apiGet, apiPost } from "./api";

/* =========================================================
   LIFEBOOST
   React + Vite frontend · Google Apps Script backend

   NAV TREE
   ├── Home                          personal overview
   ├── My Businesses
   │     └── [selected business]
   │           ├── Overview          ├── Products
   │           ├── Professionals     ├── Sales
   │           ├── Customers         ├── Expenses
   │           │                     ├── Quotations
   │           │                     └── Requests
   ├── Professional work (only if the user is an employee elsewhere)
   │     └── [employer business]  → My Jobs / Deadlines / Progress / Send Request
   ├── As customer (only if the user is a customer of a business)
   │     └── [that business]      → My Orders / My Jobs / Job Progress / Payments / Requests
   ├── My Finances  → Assets / Income / Expenses / Sacco / Offers
   ├── Notifications
   ├── My Activity
   └── Settings

   Every add/update action still goes through requireAuth().
   Marketplace stays reachable (from My Assets) without login,
   it's just no longer a top-level nav item.
========================================================= */

const AUTH_STORAGE_KEY = "lifeboost_user_id";

/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */

function money(value) {
  return `KSh ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function uid(prefix) {
  return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
}
function isTrue(value) {
  return value === true || String(value).toLowerCase() === "true" || String(value) === "1";
}

const assetIcon = {
  Property: Landmark,
  Vehicle: Package,
  Farm: Package,
  Investment: TrendingUp,
  Equipment: Package,
  Land: Package,
  Other: Package,
};

/* ---------------------------------------------------------
   NAV STRUCTURE
--------------------------------------------------------- */

const BUSINESS_SUBNAV = [
  ["business:overview", "Overview", ClipboardList],
  ["business:professionals", "Professionals", BriefcaseBusiness],
  ["business:customers", "Customers", Users],
  ["business:products", "Products", Boxes],
  ["business:sales", "Sales", Wallet],
  ["business:expenses", "Expenses", Receipt],
  ["business:quotations", "Quotations", ListChecks],
  ["business:requests", "Requests", CreditCard],
];

const PROFESSIONAL_SUBNAV = [
  ["professional:jobs", "My Jobs", ClipboardList],
  ["professional:deadlines", "Deadlines", CalendarClock],
  ["professional:progress", "Progress", ListChecks],
  ["professional:request", "Send Request", Send],
];

const CUSTOMER_SUBNAV = [
  ["customer:orders", "My Orders", ShoppingCart],
  ["customer:jobs", "My Jobs", ClipboardList],
  ["customer:progress", "Job Progress", ListChecks],
  ["customer:payments", "Payments", CreditCard],
  ["customer:requests", "Requests", Send],
];

const FINANCE_SUBNAV = [
  ["finance:assets", "Assets", Landmark],
  ["finance:income", "Income", TrendingUp],
  ["finance:expenses", "Expenses", Receipt],
  ["finance:sacco", "Sacco", PiggyBank],
  ["finance:offers", "Offers", Gift],
];

const PAGE_TITLES = {
  home: "Home",
  "business:list": "My Businesses",
  "business:overview": "Overview",
  "business:professionals": "Professionals",
  "business:customers": "Customers",
  "business:products": "Products",
  "business:sales": "Sales",
  "business:expenses": "Expenses",
  "business:quotations": "Quotations",
  "business:requests": "Requests",
  "professional:jobs": "My Jobs",
  "professional:deadlines": "Deadlines",
  "professional:progress": "Progress",
  "professional:request": "Send Request",
  "customer:orders": "My Orders",
  "customer:jobs": "My Jobs",
  "customer:progress": "Job Progress",
  "customer:payments": "Payments",
  "customer:requests": "Requests",
  "finance:assets": "Assets",
  "finance:income": "Income",
  "finance:expenses": "Expenses",
  "finance:sacco": "Sacco",
  "finance:offers": "Offers",
  notifications: "Notifications",
  activity: "My Activity",
  settings: "Settings",
  marketplace: "Marketplace",
};

/* =========================================================
   ROOT APP
========================================================= */

function App() {
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState("home");
  const [mobileNav, setMobileNav] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [notificationLog, setNotificationLog] = useState([]);

  const [authUser, setAuthUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const [openGroups, setOpenGroups] = useState({ businesses: true });

  // Owned businesses (My Businesses)
  const [businesses, setBusinesses] = useState([]);
  const [businessId, setBusinessId] = useState("");
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);

  // Business-scoped data
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [businessDashboard, setBusinessDashboard] = useState(null);

  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingBusinessDashboard, setLoadingBusinessDashboard] = useState(false);

  // Personal assets + public marketplace
  const [assets, setAssets] = useState([]);
  const [marketplace, setMarketplace] = useState({
    assets: [],
    professionals: [],
    businesses: [],
  });
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);

  // Across-all-businesses customers, for the personal Overview
  const [allCustomers, setAllCustomers] = useState([]);
  const [loadingAllCustomers, setLoadingAllCustomers] = useState(false);

  // Relationships: businesses the user works at, or buys from
  const [relatedBusinessInfo, setRelatedBusinessInfo] = useState({});
  const [employmentBusinessId, setEmploymentBusinessId] = useState("");
  const [customerBusinessId, setCustomerBusinessId] = useState("");

  const [employmentJobs, setEmploymentJobs] = useState([]);
  const [employmentRequests, setEmploymentRequests] = useState([]);
  const [loadingEmploymentJobs, setLoadingEmploymentJobs] = useState(false);
  const [loadingEmploymentRequests, setLoadingEmploymentRequests] = useState(false);

  const [customerRecordByBusiness, setCustomerRecordByBusiness] = useState({});
  const [customerSales, setCustomerSales] = useState([]);
  const [customerJobs, setCustomerJobs] = useState([]);
  const [customerRequestsMine, setCustomerRequestsMine] = useState([]);
  const [loadingCustomerContext, setLoadingCustomerContext] = useState(false);

  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");

  const toastTimers = useRef({});
  const viewedAssetIds = useRef(new Set());

  function notify(message, tone = "default") {
    const tid = uid("t");
    setToasts((prev) => [...prev, { id: tid, message, tone }]);
    toastTimers.current[tid] = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== tid));
    }, 3800);
    setNotificationLog((prev) =>
      [{ id: tid, message, tone, at: new Date().toISOString() }, ...prev].slice(0, 40)
    );
  }

  useEffect(() => {
    return () => {
      Object.values(toastTimers.current).forEach(clearTimeout);
    };
  }, []);

  /* -------------------------------------------------------
     AUTH
  ------------------------------------------------------- */

  function requireAuth() {
    if (authUser) return true;
    setShowLogin(true);
    return false;
  }

  async function restoreSession(userId) {
    try {
      const res = await apiGet("user", { user_id: userId });
      if (!res.success) throw new Error(res.message);
      setAuthUser(res.data);
    } catch (e) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthUser(null);
    }
  }

  async function login(form) {
    const res = await apiPost("login", { email: form.email, password: form.password });
    if (!res.success) throw new Error(res.message || "Incorrect email or password.");
    localStorage.setItem(AUTH_STORAGE_KEY, res.data.user_id);
    setAuthUser(res.data);
    notify(`Welcome back, ${res.data.name || "there"}.`, "success");
  }

  async function register(form) {
    const res = await apiPost("register", {
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
    });
    if (!res.success) throw new Error(res.message || "Could not create your account.");
    localStorage.setItem(AUTH_STORAGE_KEY, res.data.user_id);
    setAuthUser(res.data);
    notify(`Welcome to LifeBoost, ${res.data.name || "there"}.`, "success");
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthUser(null);
    setBusinesses([]);
    setBusinessId("");
    setAssets([]);
    setCustomers([]);
    setEmployees([]);
    setProducts([]);
    setSales([]);
    setExpenses([]);
    setQuotations([]);
    setRequests([]);
    setAllCustomers([]);
    setEmploymentBusinessId("");
    setCustomerBusinessId("");
    setEmploymentJobs([]);
    setEmploymentRequests([]);
    setCustomerSales([]);
    setCustomerJobs([]);
    setCustomerRequestsMine([]);
    setRelatedBusinessInfo({});
    setPage("home");
    setMobileNav(false);
    notify("Signed out.", "default");
  }

  /* -------------------------------------------------------
     LOADERS — My Businesses
  ------------------------------------------------------- */

  async function loadBusinesses() {
    if (!authUser) return;
    setLoadingBusinesses(true);
    try {
      const res = await apiGet("businesses", { user_id: authUser.user_id });
      if (!res.success) throw new Error(res.message);
      setBusinesses(res.data || []);
    } catch (e) {
      setError(e.message || "Could not load businesses.");
    } finally {
      setLoadingBusinesses(false);
    }
  }

  async function loadBusinessDashboard(bid) {
    if (!bid || !authUser) return;
    setLoadingBusinessDashboard(true);
    try {
      const res = await apiGet("dashboard", { business_id: bid, user_id: authUser.user_id });
      if (!res.success) throw new Error(res.message);
      setBusinessDashboard(res.data);
    } catch (e) {
      notify(e.message || "Could not load the business overview.", "warn");
    } finally {
      setLoadingBusinessDashboard(false);
    }
  }

  async function loadCustomers(bid) {
    if (!bid) return;
    setLoadingCustomers(true);
    try {
      const res = await apiGet("customers", { business_id: bid });
      if (!res.success) throw new Error(res.message);
      setCustomers(res.data || []);
    } catch (e) {
      notify(e.message || "Could not load customers.", "warn");
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function loadEmployees(bid) {
    if (!bid) return;
    setLoadingEmployees(true);
    try {
      const res = await apiGet("employees", { business_id: bid });
      if (!res.success) throw new Error(res.message);
      setEmployees(res.data || []);
    } catch (e) {
      notify(e.message || "Could not load professionals.", "warn");
    } finally {
      setLoadingEmployees(false);
    }
  }

  async function loadProducts(bid) {
    if (!bid) return;
    setLoadingProducts(true);
    try {
      const res = await apiGet("products", { business_id: bid });
      if (!res.success) throw new Error(res.message);
      setProducts(res.data || []);
    } catch (e) {
      notify(e.message || "Could not load products.", "warn");
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadSales(bid) {
    if (!bid) return;
    setLoadingSales(true);
    try {
      const res = await apiGet("sales", { business_id: bid });
      if (!res.success) throw new Error(res.message);
      setSales(res.data || []);
    } catch (e) {
      notify(e.message || "Could not load sales.", "warn");
    } finally {
      setLoadingSales(false);
    }
  }

  async function loadExpenses(bid) {
    if (!bid) return;
    setLoadingExpenses(true);
    try {
      const res = await apiGet("expenses", { business_id: bid });
      if (!res.success) throw new Error(res.message);
      setExpenses(res.data || []);
    } catch (e) {
      notify(e.message || "Could not load expenses.", "warn");
    } finally {
      setLoadingExpenses(false);
    }
  }

  async function loadQuotations(bid) {
    if (!bid) return;
    setLoadingQuotations(true);
    try {
      const res = await apiGet("quotations", { business_id: bid });
      if (!res.success) throw new Error(res.message);
      setQuotations(res.data || []);
    } catch (e) {
      notify(e.message || "Could not load quotations.", "warn");
    } finally {
      setLoadingQuotations(false);
    }
  }

  async function loadRequests(bid) {
    if (!bid) return;
    setLoadingRequests(true);
    try {
      const res = await apiGet("requests", { business_id: bid });
      if (!res.success) throw new Error(res.message);
      setRequests(res.data || []);
    } catch (e) {
      notify(e.message || "Could not load requests.", "warn");
    } finally {
      setLoadingRequests(false);
    }
  }

  /* -------------------------------------------------------
     LOADERS — personal assets, marketplace, all customers
  ------------------------------------------------------- */

  async function loadAssets() {
    if (!authUser) return;
    setLoadingAssets(true);
    try {
      const res = await apiGet("assets", { user_id: authUser.user_id });
      if (!res.success) throw new Error(res.message);
      setAssets(res.data || []);
    } catch (e) {
      notify(e.message || "Could not load assets.", "warn");
    } finally {
      setLoadingAssets(false);
    }
  }

  async function loadMarketplace() {
  setLoadingMarketplace(true);
  try {
    const res = await apiGet("marketplace");
    if (!res.success) throw new Error(res.message);
    const data = res.data || {};

    // Supports old API (array of assets) and new API ({ assets, professionals, businesses })
    if (Array.isArray(data)) {
      setMarketplace({ assets: data, professionals: [], businesses: [] });
    } else {
      setMarketplace({
        assets: data.assets || [],
        professionals: data.professionals || [],
        businesses: data.businesses || [],
      });
    }
  } catch (e) {
    notify(e.message || "Could not load marketplace.", "warn");
  } finally {
    setLoadingMarketplace(false);
  }
}


  async function loadAllCustomers(list) {
    if (!list.length) {
      setAllCustomers([]);
      return;
    }
    setLoadingAllCustomers(true);
    try {
      const results = await Promise.all(
        list.map((businessItem) => apiGet("customers", { business_id: businessItem.business_id }))
      );
      const merged = results.flatMap((res, index) =>
        res.success
          ? (res.data || []).map((customer) => ({ ...customer, business_id: list[index].business_id }))
          : []
      );
      setAllCustomers(merged);
    } catch (e) {
      notify("Could not load customers across businesses.", "warn");
    } finally {
      setLoadingAllCustomers(false);
    }
  }

  /* -------------------------------------------------------
     LOADERS — Professional work / As customer
  ------------------------------------------------------- */

  async function loadRelatedBusinessInfo(bid) {
    if (!authUser || relatedBusinessInfo[bid]) return;
    try {
      const res = await apiGet("dashboard", { business_id: bid, user_id: authUser.user_id });
      if (res.success && res.data?.business) {
        setRelatedBusinessInfo((prev) => ({ ...prev, [bid]: res.data.business }));
      }
    } catch (e) {
      // Fall back to showing the raw id in the switcher.
    }
  }

  async function loadEmploymentJobs(bid) {
    if (!bid) return;
    setLoadingEmploymentJobs(true);
    try {
      const res = await apiGet("jobs", { business_id: bid });
      if (!res.success) throw new Error(res.message);
      setEmploymentJobs(res.data || []);
    } catch (e) {
      notify(e.message || "Could not load jobs.", "warn");
    } finally {
      setLoadingEmploymentJobs(false);
    }
  }

  async function loadEmploymentRequests(bid) {
    if (!bid || !authUser) return;
    setLoadingEmploymentRequests(true);
    try {
      const res = await apiGet("requests", { business_id: bid });
      if (!res.success) throw new Error(res.message);
      setEmploymentRequests(
        (res.data || []).filter((r) => String(r.user_id) === String(authUser.user_id))
      );
    } catch (e) {
      notify(e.message || "Could not load your requests.", "warn");
    } finally {
      setLoadingEmploymentRequests(false);
    }
  }

  async function loadCustomerContext(bid) {
    if (!bid || !authUser) return;
    setLoadingCustomerContext(true);
    try {
      let myCustomerId = customerRecordByBusiness[bid];

      if (myCustomerId === undefined) {
        const customersRes = await apiGet("customers", { business_id: bid });
        const match = customersRes.success
          ? (customersRes.data || []).find(
              (c) => String(c.email || "").toLowerCase() === String(authUser.email || "").toLowerCase()
            )
          : null;
        myCustomerId = match ? match.customer_id : null;
        setCustomerRecordByBusiness((prev) => ({ ...prev, [bid]: myCustomerId }));
      }

      const [salesRes, jobsRes, requestsRes] = await Promise.all([
        apiGet("sales", { business_id: bid }),
        apiGet("jobs", { business_id: bid }),
        apiGet("requests", { business_id: bid }),
      ]);

      setCustomerSales(
        salesRes.success && myCustomerId
          ? (salesRes.data || []).filter((s) => String(s.customer_id) === String(myCustomerId))
          : []
      );
      setCustomerJobs(
        jobsRes.success && myCustomerId
          ? (jobsRes.data || []).filter((j) => String(j.customer_id) === String(myCustomerId))
          : []
      );
      setCustomerRequestsMine(
        requestsRes.success
          ? (requestsRes.data || []).filter((r) => String(r.user_id) === String(authUser.user_id))
          : []
      );
    } catch (e) {
      notify("Could not load your activity with this business.", "warn");
    } finally {
      setLoadingCustomerContext(false);
    }
  }

  /* -------------------------------------------------------
     SESSION RESTORE (doesn't block browsing)
  ------------------------------------------------------- */

  useEffect(() => {
    (async () => {
      const storedId = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedId) {
        await restoreSession(storedId);
      }
      setInitializing(false);
    })();
  }, []);

  useEffect(() => {
    if (authUser) {
      loadBusinesses();
      loadAssets();
    }
  }, [authUser]);

  useEffect(() => {
    if (businesses.length && !businesses.some((b) => String(b.business_id) === String(businessId))) {
      setBusinessId(businesses[0].business_id);
    }
    if (!businesses.length) setBusinessId("");
  }, [businesses, businessId]);

  // Load everything for the currently selected owned business.
  useEffect(() => {
    if (!businessId) return;
    loadBusinessDashboard(businessId);
    loadCustomers(businessId);
    loadEmployees(businessId);
    loadProducts(businessId);
    loadSales(businessId);
    loadExpenses(businessId);
    loadQuotations(businessId);
    loadRequests(businessId);
  }, [businessId]);

  useEffect(() => {
    if ((page === "activity" || page === "home") && businesses.length) {
      loadAllCustomers(businesses);
    }
  }, [page, businesses]);

  // Relationship-derived context: who the user works for / buys from.
  const employeeRelationships = useMemo(
    () => (authUser?.relationships || []).filter((r) => String(r.relationship_type).toLowerCase() === "employee"),
    [authUser]
  );
  const customerRelationships = useMemo(
    () => (authUser?.relationships || []).filter((r) => String(r.relationship_type).toLowerCase() === "customer"),
    [authUser]
  );

  useEffect(() => {
    if (!authUser) return;
    const ids = new Set([
      ...employeeRelationships.map((r) => r.business_id),
      ...customerRelationships.map((r) => r.business_id),
    ]);
    ids.forEach((bid) => loadRelatedBusinessInfo(bid));
  }, [authUser, employeeRelationships, customerRelationships]);

  useEffect(() => {
    if (
      employeeRelationships.length &&
      !employeeRelationships.some((r) => String(r.business_id) === String(employmentBusinessId))
    ) {
      setEmploymentBusinessId(employeeRelationships[0].business_id);
    }
    if (!employeeRelationships.length) setEmploymentBusinessId("");
  }, [employeeRelationships, employmentBusinessId]);

  useEffect(() => {
    if (
      customerRelationships.length &&
      !customerRelationships.some((r) => String(r.business_id) === String(customerBusinessId))
    ) {
      setCustomerBusinessId(customerRelationships[0].business_id);
    }
    if (!customerRelationships.length) setCustomerBusinessId("");
  }, [customerRelationships, customerBusinessId]);

  useEffect(() => {
    if (page.startsWith("professional:") && employmentBusinessId) {
      loadEmploymentJobs(employmentBusinessId);
      loadEmploymentRequests(employmentBusinessId);
    }
  }, [page, employmentBusinessId]);

  useEffect(() => {
    if (page.startsWith("customer:") && customerBusinessId) {
      loadCustomerContext(customerBusinessId);
    }
  }, [page, customerBusinessId]);

    useEffect(() => {
    if (page === "home" || page === "marketplace" || page === "finance:assets") {
      loadMarketplace();
    }
  }, [page]);

  /* -------------------------------------------------------
     DERIVED NUMBERS (personal Home)
  ------------------------------------------------------- */

  const business = businesses.find((b) => String(b.business_id) === String(businessId));
  const employer = relatedBusinessInfo[employmentBusinessId];
  const customerOfBusiness = relatedBusinessInfo[customerBusinessId];

  const totalAssetValue = useMemo(
    () => assets.reduce((sum, asset) => sum + Number(asset.value || 0), 0),
    [assets]
  );

  const liabilities = 0;
  const netWorth = totalAssetValue - liabilities;

  const totalBusinessRevenue = businesses.reduce((sum, b) => sum + Number(b.revenue || 0), 0);
  const totalBusinessExpenses = businesses.reduce((sum, b) => sum + Number(b.expenses || 0), 0);
  const totalBusinessProfit = totalBusinessRevenue - totalBusinessExpenses;

  const totalOutstanding = allCustomers.reduce((sum, customer) => sum + Number(customer.amount || 0), 0);
  const totalOverdue = allCustomers
    .filter((c) => String(c.status).toLowerCase() === "overdue")
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  const netWorthTrend = useMemo(() => {
    if (netWorth <= 0) return [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
    return months.map((month, index) => ({ month, value: Math.round(netWorth * (0.85 + index * 0.02)) }));
  }, [netWorth]);

  /* -------------------------------------------------------
     ACTIONS — every one starts with requireAuth()
  ------------------------------------------------------- */
  
  async function addBusiness(form) {
    if (!requireAuth()) throw new Error("Please sign in to continue.");
    const res = await apiPost("add_business", {
      owner_user_id: authUser.user_id,
      business_name: form.name,
      business_type: form.type,
      phone: form.phone || "",
      email: form.email || "",
      region: form.region || "",
    });
    if (!res.success) throw new Error(res.message || "Could not add business.");

    if (form.listed && res.data?.business_id) {
      await apiPost("list_business", {
        owner_user_id: authUser.user_id,
        business_id: res.data.business_id,
        listed: true,
        tagline: form.tagline || "",
      });
      await loadMarketplace();
    }

    notify(`${form.name} added to your businesses.`, "success");
    await loadBusinesses();
    if (res.data?.business_id) setBusinessId(res.data.business_id);
  }

  async function addCustomer(form) {
    if (!requireAuth()) throw new Error("Please sign in to continue.");
    const res = await apiPost("add_customer", {
      business_id: businessId,
      name: form.name,
      phone: form.phone || "",
      email: form.email || "",
      amount: form.amount || 0,
      due: form.due || "",
      type: form.type || "individual",
      status: form.status || "Pending",
    });
    if (!res.success) throw new Error(res.message || "Could not add customer.");
    notify(`${form.name} added as a customer.`, "success");
    await loadCustomers(businessId);
  }

  async function addEmployee(form) {
    if (!requireAuth()) throw new Error("Please sign in to continue.");
    const res = await apiPost("add_employee", {
      business_id: businessId,
      name: form.name,
      phone: form.phone || "",
      email: form.email || "",
      role: form.role || "Employee",
      job_status: form.jobStatus || "Active",
      salary: form.salary || 0,
      status: form.status || "active",
    });
    if (!res.success) throw new Error(res.message || "Could not add professional.");

    if (form.listed && res.data?.employee_id) {
      await listProfessionalOnMarket({
        employee_id: res.data.employee_id,
        business_id: businessId,
        listed: true,
        location: form.location || "",
        phone: form.phone || "",
      });
    }

notify(`${form.name} added to the team.`, "success");
    await loadEmployees(businessId);
  }

  async function addProduct(form) {
    if (!requireAuth()) throw new Error("Please sign in to continue.");
    const res = await apiPost("add_product", {
      business_id: businessId,
      name: form.name,
      category: form.category || "",
      unit: form.unit || "unit",
      selling_price: form.sellingPrice || 0,
      cost_price: form.costPrice || 0,
      stock: form.stock || 0,
    });
    if (!res.success) throw new Error(res.message || "Could not add product.");
    notify(`${form.name} added to your products.`, "success");
    await loadProducts(businessId);
  }

  async function addSale(form) {
    if (!requireAuth()) throw new Error("Please sign in to continue.");
    const res = await apiPost("add_sale", {
      business_id: businessId,
      customer_id: form.customerId || "",
      customer: form.customer || "Walk-in",
      total: form.total || 0,
      status: form.status || "Completed",
    });
    if (!res.success) throw new Error(res.message || "Could not record sale.");
    notify("Sale recorded.", "success");
    await Promise.all([loadSales(businessId), loadBusinesses()]);
  }

  async function addExpense(form) {
    if (!requireAuth()) throw new Error("Please sign in to continue.");
    const res = await apiPost("add_expense", {
      business_id: businessId,
      category: form.category || "Other",
      description: form.description || "",
      amount: form.amount || 0,
    });
    if (!res.success) throw new Error(res.message || "Could not add expense.");
    notify("Expense recorded.", "success");
    await Promise.all([loadExpenses(businessId), loadBusinesses()]);
  }

  async function addEmploymentRequest(form) {
    if (!requireAuth()) throw new Error("Please sign in to continue.");
    const res = await apiPost("add_request", {
      business_id: employmentBusinessId,
      user_id: authUser.user_id,
      type: form.type,
      amount: form.amount,
      reason: form.reason,
    });
    if (!res.success) throw new Error(res.message || "Could not submit request.");
    notify("Request submitted for approval.", "success");
    await loadEmploymentRequests(employmentBusinessId);
  }

  async function addCustomerRequest(form) {
    if (!requireAuth()) throw new Error("Please sign in to continue.");
    const res = await apiPost("add_request", {
      business_id: customerBusinessId,
      user_id: authUser.user_id,
      type: form.type,
      amount: form.amount,
      reason: form.reason,
    });
    if (!res.success) throw new Error(res.message || "Could not submit request.");
    notify("Request submitted.", "success");
    await loadCustomerContext(customerBusinessId);
  }

  async function decideRequest(requestId, decision) {
    if (!requireAuth()) return;
    try {
      const res = await apiPost(decision === "Approved" ? "approve_request" : "reject_request", {
        request_id: requestId,
        approver_user_id: authUser.user_id,
      });
      if (!res.success) throw new Error(res.message);
      notify(
        decision === "Approved" ? "Request approved." : "Request rejected.",
        decision === "Approved" ? "success" : "warn"
      );
      await loadRequests(businessId);
    } catch (e) {
      notify(e.message || "Could not update request.", "warn");
    }
  }

  async function addAsset(form) {
    if (!requireAuth()) throw new Error("Please sign in to continue.");
    const res = await apiPost("add_asset", {
      user_id: authUser.user_id,
      ownership: form.ownership,
      business_id: form.ownership === "business" ? businessId : "",
      name: form.name,
      type: form.type,
      value: form.value,
      listed: Boolean(form.listed),
      location: form.location,
      phone: form.phone,
      image_url: form.image_url || "",
      video_url: form.video_url || "",
    });
    if (!res.success) throw new Error(res.message || "Could not add asset.");
    notify(
      form.listed ? `${form.name} added and listed on the Marketplace.` : `${form.name} added to your assets.`,
      "success"
    );
    await loadAssets();
    if (form.listed && page === "marketplace") await loadMarketplace();
  }

    async function listBusinessOnMarket(form) {
      if (!requireAuth()) throw new Error("Please sign in to continue.");
      const res = await apiPost("list_business", {
        owner_user_id: authUser.user_id,
        business_id: form.business_id || businessId,
        listed: Boolean(form.listed),
        tagline: form.tagline || "",
      });
      if (!res.success) throw new Error(res.message || "Could not update listing.");
      notify(
        form.listed ? "Business listed on the Marketplace." : "Business removed from Marketplace.",
        "success"
      );
      await loadBusinesses();
      await loadMarketplace();
    }

    async function listProfessionalOnMarket(form) {
      if (!requireAuth()) throw new Error("Please sign in to continue.");
      const res = await apiPost("list_professional", {
        business_id: form.business_id || businessId,
        employee_id: form.employee_id,
        listed: Boolean(form.listed),
        location: form.location || "",
        phone: form.phone || "",
      });
      if (!res.success) throw new Error(res.message || "Could not update listing.");
      notify(
        form.listed ? "Professional listed on the Marketplace." : "Professional removed from Marketplace.",
        "success"
      );
      await loadEmployees(businessId);
      await loadMarketplace();
    }

    async function contactListing(item, listingType) {
      try {
        await apiPost("contact_listing", {
          listing_type: listingType,
          asset_id: item.asset_id,
          employee_id: item.employee_id,
          business_id: item.business_id,
        });
      } catch (_) {
        // still open WhatsApp
      }

      const phone = item.phone || "";
      const digits = String(phone).replace(/[^0-9]/g, "");
      const number = digits.startsWith("0") ? `254${digits.slice(1)}` : digits;
      const label = item.name || item.business_name || "listing";
      const text = encodeURIComponent(
        `Hi, I saw your ${listingType} "${label}" on LifeBoost Marketplace.`
      );
      if (number) {
        window.open(`https://wa.me/${number}?text=${text}`, "_blank");
      }
      notify(`Opening WhatsApp for ${label}.`, "success");
    }

    function viewListingOnce(item, listingType) {
      const key =
        listingType === "asset"
          ? item.asset_id
          : listingType === "professional"
          ? item.employee_id
          : item.business_id;
      if (!key || viewedAssetIds.current.has(`${listingType}:${key}`)) return;
      viewedAssetIds.current.add(`${listingType}:${key}`);

      apiPost("view_listing", {
        listing_type: listingType,
        asset_id: item.asset_id,
        employee_id: item.employee_id,
        business_id: item.business_id,
      }).catch(() => {});
    }

  async function contactSeller(asset) {
    try {
      const res = await apiPost("contact_asset", { asset_id: asset.asset_id });
      if (res.success) {
        setMarketplace((prev) =>
          prev.map((item) =>
            item.asset_id === asset.asset_id ? { ...item, whatsapp_clicks: res.data.whatsapp_clicks } : item
          )
        );
        setAssets((prev) =>
          prev.map((item) =>
            item.asset_id === asset.asset_id ? { ...item, whatsapp_clicks: res.data.whatsapp_clicks } : item
          )
        );
      }
    } catch (e) {
      // WhatsApp still opens
    }
    const digits = (asset.phone || "").replace(/[^0-9]/g, "");
    const number = digits.startsWith("0") ? `254${digits.slice(1)}` : digits;
    const text = encodeURIComponent(
      `Hi, I'm interested in your listing "${asset.name}" (${money(asset.value)}) on LifeBoost Marketplace.`
    );
    if (number) window.open(`https://wa.me/${number}?text=${text}`, "_blank");
    notify(`Opening WhatsApp for ${asset.name}.`, "success");
  }

  function viewAssetOnce(assetId) {
    if (viewedAssetIds.current.has(assetId)) return;
    viewedAssetIds.current.add(assetId);
    apiPost("view_asset", { asset_id: assetId })
      .then((res) => {
        if (res.success) {
          setMarketplace((prev) =>
            prev.map((asset) => (asset.asset_id === assetId ? { ...asset, views: res.data.views } : asset))
          );
        }
      })
      .catch(() => {});
  }

  async function saveProfile(form) {
    if (!requireAuth()) throw new Error("Please sign in to continue.");
    const res = await apiPost("update_user", {
      user_id: authUser.user_id,
      name: form.name,
      email: form.email,
      phone: form.phone,
    });
    if (!res.success) throw new Error(res.message || "Could not save profile.");
    notify("Profile saved.", "success");
    await restoreSession(authUser.user_id);
  }

  function sendReminder(customer) {
    notify(
      `Reminder sent to ${customer.name} · ${money(customer.amount)} due ${formatDate(customer.due_date)}.`,
      "success"
    );
  }

  function askLifeBoost(question) {
    const q = (question ?? aiQuestion).toLowerCase();
    if (!q.trim()) return;

    let answer = "Your financial position is based on the assets and businesses currently registered in LifeBoost.";

    if (q.includes("business") && (q.includes("best") || q.includes("top"))) {
      if (businesses.length) {
        const best = [...businesses].sort(
          (a, b) => Number(b.revenue || 0) - Number(b.expenses || 0) - (Number(a.revenue || 0) - Number(a.expenses || 0))
        )[0];
        answer = `${best.business_name} is your strongest business right now, with ${money(
          best.revenue
        )} in revenue and roughly ${money(Number(best.revenue || 0) - Number(best.expenses || 0))} profit.`;
      } else {
        answer = "Add a business to start comparing performance.";
      }
    } else if (q.includes("owe") || q.includes("customer")) {
      answer = `Your customers currently owe ${money(totalOutstanding)} across all businesses. ${money(
        totalOverdue
      )} of that is overdue and worth chasing first.`;
    } else if (q.includes("net worth") || q.includes("assets")) {
      answer = `Your registered assets total ${money(totalAssetValue)}. Net worth will refine further once liabilities are tracked.`;
    } else if (q.includes("employee") || q.includes("staff") || q.includes("team")) {
      answer = `${business?.business_name || "Your current business"} has ${employees.length} people on the team.`;
    } else if (q.includes("request") || q.includes("pending")) {
      const pending = requests.filter((r) => String(r.status).toLowerCase() === "pending");
      answer = pending.length
        ? `There ${pending.length === 1 ? "is" : "are"} ${pending.length} pending money request${
            pending.length === 1 ? "" : "s"
          } for ${business?.business_name || "your business"} totalling ${money(
            pending.reduce((s, r) => s + Number(r.amount || 0), 0)
          )}.`
        : `No pending money requests for ${business?.business_name || "your business"} right now.`;
    } else if (q.includes("save") || q.includes("saving")) {
      answer =
        "Keep business cash flow separate from personal spending, review recurring costs monthly, and set aside a fixed savings percentage before it reaches your wallet.";
    }

    setAiAnswer(answer);
  }

  function go(id) {
    setPage(id);
    setMobileNav(false);
  }

  function toggleGroup(id) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  /* -------------------------------------------------------
     LOADING GATE — only guards the quick session restore
  ------------------------------------------------------- */

  if (initializing) {
    return (
      <div className="lb-app">
        <div className="lb-loading-screen">
          <div className="lb-spinner" />
          <h2>Connecting to LifeBoost…</h2>
          <p>Checking your session.</p>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------
     PAGE GATING
  ------------------------------------------------------- */

  let gate = null;
  if (page !== "marketplace") {
    if (!authUser) {
      gate = "auth";
    } else if (page.startsWith("business:") && page !== "business:list" && !business) {
      gate = "no-business";
    } else if (page.startsWith("professional:") && employeeRelationships.length === 0) {
      gate = "no-employment";
    } else if (page.startsWith("customer:") && customerRelationships.length === 0) {
      gate = "no-customer-link";
    }
  }

  /* -------------------------------------------------------
     SWITCHER for the top bar, based on the active section
  ------------------------------------------------------- */

  let switcher = null;
  if (page.startsWith("business:") && page !== "business:list" && businesses.length) {
    switcher = { value: businessId, onChange: setBusinessId, items: businesses };
  } else if (page.startsWith("professional:") && employeeRelationships.length) {
    switcher = {
      value: employmentBusinessId,
      onChange: setEmploymentBusinessId,
      items: employeeRelationships.map(
        (r) => relatedBusinessInfo[r.business_id] || { business_id: r.business_id, business_name: `Business ${r.business_id}` }
      ),
    };
  } else if (page.startsWith("customer:") && customerRelationships.length) {
    switcher = {
      value: customerBusinessId,
      onChange: setCustomerBusinessId,
      items: customerRelationships.map(
        (r) => relatedBusinessInfo[r.business_id] || { business_id: r.business_id, business_name: `Business ${r.business_id}` }
      ),
    };
  }

  /* -------------------------------------------------------
     APP UI
  ------------------------------------------------------- */

  return (
    <div className="lb-app">
      <ToastStack toasts={toasts} />

      <div className={`lb-shell ${mobileNav ? "lb-nav-open" : ""}`}>
        <Sidebar
          page={page}
          go={go}
          onClose={() => setMobileNav(false)}
          authUser={authUser}
          onSignIn={() => setShowLogin(true)}
          onRegister={() => setShowRegister(true)}
          onSignOut={logout}
          openGroups={openGroups}
          toggleGroup={toggleGroup}
          showProfessional={employeeRelationships.length > 0}
          showCustomer={customerRelationships.length > 0}
        />

        <div className="lb-main">
          <Topbar
            title={PAGE_TITLES[page] || "LifeBoost"}
            contextLabel={
              page.startsWith("business:") && page !== "business:list"
                ? business?.business_name
                : page.startsWith("professional:")
                ? employer?.business_name
                : page.startsWith("customer:")
                ? customerOfBusiness?.business_name
                : page === "business:list"
                ? "My Businesses"
                : "Personal workspace"
            }
            authUser={authUser}
            switcher={switcher}
            onMenu={() => setMobileNav((v) => !v)}
            onSignIn={() => setShowLogin(true)}
            onRegister={() => setShowRegister(true)}
            onSignOut={logout}
          />

          <div className="lb-content">
            {error && (
              <div className="lb-error-banner">
                <span>{error}</span>
                <button onClick={() => setError("")} aria-label="Dismiss">×</button>
              </div>
            )}

            {gate === "auth" && <GatePrompt icon={LogIn} title="Sign in to continue" text="This page shows your personal LifeBoost data — sign in to view and manage it." actionLabel="Sign in" onAction={() => setShowLogin(true)} />}
            {gate === "no-business" && <GatePrompt icon={Building2} title="No business selected" text="Add a business or choose one from the switcher above to continue." actionLabel="Go to My Businesses" onAction={() => go("business:list")} />}
            {gate === "no-employment" && <GatePrompt icon={Wrench} title="Not linked as an employee yet" text="Once a business owner adds you as a professional using your email, this section fills in automatically." />}
            {gate === "no-customer-link" && <GatePrompt icon={Users} title="Not linked as a customer yet" text="Once a business adds you as a customer using your email, this section fills in automatically." />}

            {!gate && (
              <>
                {page === "home" && (
                  <HomePage
                    netWorth={netWorth}
                    totalAssetValue={totalAssetValue}
                    trend={netWorthTrend}
                    assets={assets}
                    loadingAssets={loadingAssets}
                    businesses={businesses}
                    totalBusinessProfit={totalBusinessProfit}
                    userName={authUser?.name}
                    aiQuestion={aiQuestion}
                    setAiQuestion={setAiQuestion}
                    aiAnswer={aiAnswer}
                    ask={askLifeBoost}
                    marketplace={marketplace}
                    loadingMarketplace={loadingMarketplace}
                    go={go}
                  />
                )}

                {page === "business:list" && (
                  <BusinessesPage
                    businesses={businesses}
                    loading={loadingBusinesses}
                    onAdd={addBusiness}
                    onRefresh={loadBusinesses}
                    onOpen={(id) => {
                      setBusinessId(id);
                      go("business:overview");
                    }}
                  />
                )}

                {page === "business:overview" && (
                  <BusinessOverviewPage business={business} dashboard={businessDashboard} loading={loadingBusinessDashboard} onRefresh={() => loadBusinessDashboard(businessId)} />
                )}

                {page === "business:professionals" && (
                  <EmployeesPage business={business} employees={employees} loading={loadingEmployees} onAdd={addEmployee} onRefresh={() => loadEmployees(businessId)} />
                )}

                {page === "business:customers" && (
                  <CustomersPage business={business} customers={customers} loading={loadingCustomers} onAdd={addCustomer} onRemind={sendReminder} onRefresh={() => loadCustomers(businessId)} />
                )}

                {page === "business:products" && (
                  <ProductsPage business={business} products={products} loading={loadingProducts} onAdd={addProduct} onRefresh={() => loadProducts(businessId)} />
                )}

                {page === "business:sales" && (
                  <SalesPage business={business} sales={sales} loading={loadingSales} onAdd={addSale} onRefresh={() => loadSales(businessId)} />
                )}

                {page === "business:expenses" && (
                  <BusinessExpensesPage business={business} expenses={expenses} loading={loadingExpenses} onAdd={addExpense} onRefresh={() => loadExpenses(businessId)} />
                )}

                {page === "business:quotations" && (
                  <QuotationsPage business={business} quotations={quotations} loading={loadingQuotations} onRefresh={() => loadQuotations(businessId)} />
                )}

                {page === "business:requests" && (
                  <RequestsPage business={business} requests={requests} loading={loadingRequests} onDecide={decideRequest} onRefresh={() => loadRequests(businessId)} />
                )}

                {(page === "professional:jobs" || page === "professional:deadlines" || page === "professional:progress") && (
                  <JobsBoardPage
                    title={PAGE_TITLES[page]}
                    subtitle={`At ${employer?.business_name || "your employer"}`}
                    jobs={employmentJobs}
                    loading={loadingEmploymentJobs}
                    mode={page === "professional:deadlines" ? "deadlines" : page === "professional:progress" ? "progress" : "list"}
                    onRefresh={() => loadEmploymentJobs(employmentBusinessId)}
                  />
                )}

                {page === "professional:request" && (
                  <MyRequestsPage
                    subtitle={`Requests to ${employer?.business_name || "your employer"}`}
                    requests={employmentRequests}
                    loading={loadingEmploymentRequests}
                    onAdd={addEmploymentRequest}
                    onRefresh={() => loadEmploymentRequests(employmentBusinessId)}
                  />
                )}

                {(page === "customer:jobs" || page === "customer:progress") && (
                  <JobsBoardPage
                    title={PAGE_TITLES[page]}
                    subtitle={`With ${customerOfBusiness?.business_name || "this business"}`}
                    jobs={customerJobs}
                    loading={loadingCustomerContext}
                    mode={page === "customer:progress" ? "progress" : "list"}
                    onRefresh={() => loadCustomerContext(customerBusinessId)}
                  />
                )}

                {(page === "customer:orders" || page === "customer:payments") && (
                  <CustomerSalesPage
                    title={PAGE_TITLES[page]}
                    subtitle={`With ${customerOfBusiness?.business_name || "this business"}`}
                    sales={customerSales}
                    loading={loadingCustomerContext}
                    mode={page === "customer:payments" ? "payments" : "orders"}
                    onRefresh={() => loadCustomerContext(customerBusinessId)}
                  />
                )}

                {page === "customer:requests" && (
                  <MyRequestsPage
                    subtitle={`Requests to ${customerOfBusiness?.business_name || "this business"}`}
                    requests={customerRequestsMine}
                    loading={loadingCustomerContext}
                    onAdd={addCustomerRequest}
                    onRefresh={() => loadCustomerContext(customerBusinessId)}
                  />
                )}

                {page === "finance:assets" && (
                  <AssetsPage assets={assets} loading={loadingAssets} businesses={businesses} onAdd={addAsset} onRefresh={loadAssets} onViewMarketplace={() => go("marketplace")} />
                )}

                {page === "finance:income" && (
                  <ComingSoonPage icon={TrendingUp} title="Income" subtitle="Track income outside your registered businesses." note="Personal income tracking isn't wired up yet — this will summarise salary, side income and business draws once it's ready." />
                )}

                {page === "finance:expenses" && (
                  <ComingSoonPage icon={Receipt} title="Personal Expenses" subtitle="Separate from your business expenses." note="Personal (non-business) expense tracking isn't wired up yet. Business expenses already live under My Businesses → Expenses." />
                )}

                {page === "finance:sacco" && (
                  <ComingSoonPage icon={PiggyBank} title="Sacco" subtitle="Savings and credit co-operative tools." note="Sacco contributions and loans aren't connected yet — this is a placeholder for that integration." />
                )}

                {page === "finance:offers" && (
                  <ComingSoonPage icon={Gift} title="Offers" subtitle="Deals and financing offers picked for you." note="Personalised offers aren't wired up yet — this is a placeholder for that feature." />
                )}

                {page === "marketplace" && (
                  <MarketplacePage
                    marketplace={marketplace}
                    loading={loadingMarketplace}
                    onContact={contactListing}
                    onView={viewListingOnce}
                  />
                )}  

                {page === "notifications" && <NotificationsPage log={notificationLog} />}

                {page === "activity" && (
                  <ActivityPage business={business} sales={sales} requests={requests} loading={loadingSales || loadingRequests} />
                )}

                {page === "settings" && (
                  <SettingsPage user={authUser} businesses={businesses} onAddBusiness={addBusiness} onSaveProfile={saveProfile} />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showLogin && (
        <LoginModal close={() => setShowLogin(false)} submit={login} switchToRegister={() => { setShowLogin(false); setShowRegister(true); }} />
      )}
      {showRegister && (
        <RegisterModal close={() => setShowRegister(false)} submit={register} switchToLogin={() => { setShowRegister(false); setShowLogin(true); }} />
      )}
    </div>
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

function NavGroup({ id, label, icon: Icon, open, onToggle, children }) {
  return (
    <div className="lb-nav-group">
      <button className="lb-nav-group-head" onClick={onToggle}>
        <Icon size={18} />
        <span>{label}</span>
        <ChevronDown size={15} className={`lb-chevron ${open ? "is-open" : ""}`} />
      </button>
      {open && <div className="lb-nav-subgroup">{children}</div>}
    </div>
  );
}

function NavLeaf({ id, label, icon: Icon, page, go, sub }) {
  return (
    <button className={`lb-nav-item ${sub ? "lb-nav-item-sub" : ""} ${page === id ? "is-active" : ""}`} onClick={() => go(id)}>
      <Icon size={sub ? 15 : 18} />
      <span>{label}</span>
    </button>
  );
}

function Sidebar({ page, go, onClose, authUser, onSignIn, onRegister, onSignOut, openGroups, toggleGroup, showProfessional, showCustomer }) {
  return (
    <>
      <div className="lb-nav-scrim" onClick={onClose} />
      <aside className="lb-sidebar">
        <div className="lb-brand">
          <BoostMark />
          <div>
            <strong>LifeBoost</strong>
            <small>Financial life platform</small>
          </div>
          <button className="lb-nav-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <nav className="lb-nav">
          <NavLeaf id="home" label="Home" icon={Home} page={page} go={go} />

          <NavGroup id="businesses" label="My Businesses" icon={Building2} open={!!openGroups.businesses} onToggle={() => toggleGroup("businesses")}>
            <NavLeaf id="business:list" label="All businesses" icon={ClipboardList} page={page} go={go} sub />
            {BUSINESS_SUBNAV.map(([id, label, Icon]) => (
              <NavLeaf key={id} id={id} label={label} icon={Icon} page={page} go={go} sub />
            ))}
          </NavGroup>

          {showProfessional && (
            <NavGroup id="professional" label="Professional work" icon={Wrench} open={!!openGroups.professional} onToggle={() => toggleGroup("professional")}>
              {PROFESSIONAL_SUBNAV.map(([id, label, Icon]) => (
                <NavLeaf key={id} id={id} label={label} icon={Icon} page={page} go={go} sub />
              ))}
            </NavGroup>
          )}

          {showCustomer && (
            <NavGroup id="customer" label="As customer" icon={Users} open={!!openGroups.customer} onToggle={() => toggleGroup("customer")}>
              {CUSTOMER_SUBNAV.map(([id, label, Icon]) => (
                <NavLeaf key={id} id={id} label={label} icon={Icon} page={page} go={go} sub />
              ))}
            </NavGroup>
          )}

          <NavGroup id="finance" label="My Finances" icon={Wallet} open={!!openGroups.finance} onToggle={() => toggleGroup("finance")}>
            {FINANCE_SUBNAV.map(([id, label, Icon]) => (
              <NavLeaf key={id} id={id} label={label} icon={Icon} page={page} go={go} sub />
            ))}
          </NavGroup>

          <NavLeaf id="notifications" label="Notifications" icon={Bell} page={page} go={go} />
          <NavLeaf id="activity" label="My Activity" icon={Activity} page={page} go={go} />
          <NavLeaf id="settings" label="Settings" icon={Settings} page={page} go={go} />
        </nav>

        <div className="lb-nav-foot">
          {authUser ? (
            <>
              <button className="lb-nav-item">
                <UserRound size={18} />
                <span>{authUser.name || "Account"}</span>
              </button>
              <button className="lb-nav-item lb-signout" onClick={onSignOut}>
                <LogOut size={18} />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <>
              <button className="lb-nav-item" onClick={onSignIn}>
                <LogIn size={18} />
                <span>Sign in</span>
              </button>
              <button className="lb-nav-item" onClick={onRegister}>
                <UserPlus size={18} />
                <span>Create account</span>
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

/* =========================================================
   TOPBAR
========================================================= */

function Topbar({ title, contextLabel, authUser, switcher, onMenu, onSignIn, onRegister, onSignOut }) {
  return (
    <header className="lb-topbar">
      <button className="lb-icon-btn lb-only-mobile" onClick={onMenu}>
        <Menu size={20} />
      </button>

      <div className="lb-topbar-title">
        <small>{contextLabel || "LifeBoost"}</small>
        <h1>{title}</h1>
      </div>

      {switcher && switcher.items.length > 0 && (
        <div className="lb-switcher">
          <Building2 size={16} />
          <select value={switcher.value} onChange={(e) => switcher.onChange(e.target.value)}>
            {switcher.items.map((b) => (
              <option key={b.business_id} value={b.business_id}>
                {b.business_name}
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </div>
      )}

      <div className="lb-topbar-actions">
        {authUser ? (
          <>
            <button className="lb-icon-btn">
              <Bell size={19} />
              <span className="lb-dot" />
            </button>
            <div className="lb-avatar" title={authUser.name}>
              {(authUser.name || "L")[0].toUpperCase()}
            </div>
            <button className="lb-ghost-btn lb-only-desktop" onClick={onSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <div className="lb-auth-actions">
            <button className="lb-ghost-btn" onClick={onSignIn}>Sign in</button>
            <button className="lb-primary-btn" onClick={onRegister}>Register</button>
          </div>
        )}
      </div>
    </header>
  );
}

/* =========================================================
   BRAND MARK
========================================================= */

function BoostMark() {
  return (
    <svg className="lb-mark" width="34" height="34" viewBox="0 0 34 34" fill="none">
      <rect width="34" height="34" rx="10" fill="url(#lbGrad)" />
      <rect x="8" y="18" width="4" height="8" rx="1.4" fill="#14171F" opacity="0.92" />
      <rect x="15" y="13" width="4" height="13" rx="1.4" fill="#14171F" opacity="0.92" />
      <rect x="22" y="7" width="4" height="19" rx="1.4" fill="#14171F" opacity="0.92" />
      <defs>
        <linearGradient id="lbGrad" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7BC97F" />
          <stop offset="1" stopColor="#3E9A4C" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* =========================================================
   GATE PROMPT (auth / no-business / no-employment / no-customer)
========================================================= */

function GatePrompt({ icon: Icon, title, text, actionLabel, onAction }) {
  return (
    <div className="lb-card lb-prompt-card">
      <div className="lb-prompt-icon">
        <Icon size={22} />
      </div>
      <h2>{title}</h2>
      <p className="lb-muted">{text}</p>
      {actionLabel && (
        <button className="lb-primary-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function ComingSoonPage({ icon: Icon, title, subtitle, note }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="lb-card lb-prompt-card">
        <div className="lb-prompt-icon">
          <Icon size={22} />
        </div>
        <h2>Coming soon</h2>
        <p className="lb-muted">{note}</p>
      </div>
    </>
  );
}

/* =========================================================
   HOME (personal overview)
========================================================= */

 function HomePage({
  netWorth,
  totalAssetValue,
  trend,
  assets,
  loadingAssets,
  businesses,
  totalBusinessProfit,
  userName,
  aiQuestion,
  setAiQuestion,
  aiAnswer,
  ask,
  marketplace,
  loadingMarketplace,
  go,
}) {
  return (
    <>
      <PageHeader eyebrow="Good to see you" title={`Good to see you, ${userName ? userName.split(" ")[0] : "there"}`} subtitle="Here's your financial life at a glance." />

      <div className="lb-grid-overview">
        <section className="lb-card lb-card-growth">
          <div className="lb-card-head">
            <div>
              <span className="lb-eyebrow">Net worth</span>
              <h2 className="lb-figure">{money(netWorth)}</h2>
              <p className="lb-muted" style={{ marginTop: 6, fontSize: 13 }}>Based on registered assets</p>
            </div>
          </div>

          {trend.length > 0 ? (
            <div className="lb-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 10, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#E7E4DB" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8A8D80", fontSize: 12, fontFamily: "Inter" }} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 12, border: "1px solid #E7E4DB", fontFamily: "Inter", fontSize: 13 }} />
                  <Line type="monotone" dataKey="value" stroke="#3E9A4C" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: "#14171F" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="lb-muted" style={{ padding: "24px 0", textAlign: "center" }}>Add assets to see your net-worth trend.</p>
          )}
        </section>

        <section className="lb-card lb-card-ask">
          <div className="lb-ask-icon">
            <Bot size={22} />
          </div>
          <span className="lb-eyebrow">Ask LifeBoost</span>
          <h2>Your financial assistant</h2>
          <p>Ask about your money, businesses, assets or growth.</p>

          <div className="lb-ask-input">
            <input value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ask(); }} placeholder="Ask anything..." />
            <button onClick={() => ask()} aria-label="Ask">
              <Send size={17} />
            </button>
          </div>

          <div className="lb-ask-suggestions">
            <button onClick={() => ask("Which business is doing best?")}>Which business is best?</button>
            <button onClick={() => ask("What do my customers owe?")}>What do customers owe?</button>
            <button onClick={() => ask("Any pending requests?")}>Pending requests?</button>
          </div>

          {aiAnswer && (
            <div className="lb-ask-answer">
              <Sparkles size={16} />
              <span>{aiAnswer}</span>
            </div>
          )}
        </section>

        <section className="lb-card lb-card-market">
          <div className="lb-card-head">
            <div>
              <span className="lb-eyebrow">Assets & businesses</span>
              <h2 className="lb-figure">{money(totalAssetValue)}</h2>
              <p>Total registered assets</p>
            </div>
            <TrendingUp size={20} color="#8A8D80" />
          </div>

          {loadingAssets ? (
            <div className="lb-inline-loading"><div className="lb-spinner" />Loading assets…</div>
          ) : (
            <div className="lb-mini-list">
              {assets.slice(0, 4).map((asset) => {
                const Icon = assetIcon[asset.type] || Package;
                return (
                  <div className="lb-mini-row" key={asset.asset_id}>
                    <div className="lb-mini-icon"><Icon size={17} /></div>
                    <div className="lb-mini-info">
                      <strong>{asset.name}</strong>
                      <small>{asset.type}</small>
                    </div>
                    <strong>{money(asset.value)}</strong>
                  </div>
                );
              })}
              {assets.length === 0 && <EmptyState icon={Package} text="No assets yet." compact />}
            </div>
          )}

          <div className="lb-market-foot">
            <span>Business profit this period <strong>{money(totalBusinessProfit)}</strong></span>
            <span className="lb-market-foot-sub">across {businesses.length} businesses</span>
          </div>
        </section>
        <section className="lb-card">
          <div className="lb-section-head">
            <div>
              <h2>Marketplace</h2>
              <p className="lb-muted">Assets, professionals and businesses listed publicly.</p>
            </div>
            <button type="button" className="lb-ghost-btn" onClick={() => go("marketplace")}>
              View all <ChevronRight size={16} />
            </button>
          </div>

          {loadingMarketplace ? (
            <div className="lb-inline-loading">
              <div className="lb-spinner" /> Loading marketplace…
            </div>
          ) : (
            <div className="lb-market-preview-grid">
              {(marketplace?.assets || []).slice(0, 3).map((a) => (
                <div className="lb-market-chip" key={a.asset_id}>
                  <Package size={16} />
                  <div>
                    <strong>{a.name}</strong>
                    <small className="lb-muted">{money(a.value)} · Asset</small>
                  </div>
                </div>
              ))}
              {(marketplace?.professionals || []).slice(0, 3).map((p) => (
                <div className="lb-market-chip" key={p.employee_id}>
                  <BriefcaseBusiness size={16} />
                  <div>
                    <strong>{p.name}</strong>
                    <small className="lb-muted">{p.role || "Professional"}</small>
                  </div>
                </div>
              ))}
              {(marketplace?.businesses || []).slice(0, 3).map((b) => (
                <div className="lb-market-chip" key={b.business_id}>
                  <Building2 size={16} />
                  <div>
                    <strong>{b.business_name}</strong>
                    <small className="lb-muted">{b.business_type || "Business"}</small>
                  </div>
                </div>
              ))}
              {!marketplace?.assets?.length &&
                !marketplace?.professionals?.length &&
                !marketplace?.businesses?.length && (
                  <p className="lb-muted">No public listings yet.</p>
                )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/* =========================================================
   MY BUSINESSES — list + overview
========================================================= */

function BusinessesPage({ businesses, loading, onAdd, onOpen, onRefresh }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Toolbar title="My Businesses" subtitle="Manage every business from one LifeBoost account. Locations are visible to other users." buttonLabel="Add business" onButton={() => setOpen(true)} onRefresh={onRefresh} />

      {loading ? (
        <div className="lb-inline-loading"><div className="lb-spinner" />Loading businesses…</div>
      ) : (
        <div className="lb-card-grid lb-card-grid-wide">
          {businesses.map((b) => {
            const profit = Number(b.revenue || 0) - Number(b.expenses || 0);
            return (
              <div className="lb-card lb-business-card" key={b.business_id}>
                <div className="lb-business-top">
                  <div className="lb-business-icon"><Building2 size={20} /></div>
                  <Badge text={b.status} tone="teal" />
                </div>
                <span className="lb-tag">{b.business_type}</span>
                <h3>{b.business_name}</h3>
                <span className="lb-location" title="Visible to other LifeBoost users">
                  <MapPin size={12} />
                  {b.region || "Region not provided"}
                </span>
                <div className="lb-business-stats">
                  <div><small>Revenue</small><strong>{money(b.revenue)}</strong></div>
                  <div><small>Profit</small><strong>{money(profit)}</strong></div>
                </div>
                <button className="lb-text-btn" onClick={() => onOpen(b.business_id)}>
                  Manage business <ChevronRight size={15} />
                </button>
              </div>
            );
          })}

          <button className="lb-add-tile" onClick={() => setOpen(true)}>
            <Plus size={24} />
            <strong>Add another business</strong>
            <span>Restaurant, construction, farm or something new</span>
          </button>
        </div>
      )}

      {open && <BusinessModal close={() => setOpen(false)} submit={onAdd} />}
    </>
  );
}

function BusinessOverviewPage({ business, dashboard, loading, onRefresh }) {
  if (!business) return null;

  return (
    <>
      <Toolbar title={business.business_name} subtitle={`${business.business_type} · ${business.region || "Region not set"}`} onRefresh={onRefresh} />

      {loading ? (
        <div className="lb-inline-loading"><div className="lb-spinner" />Loading overview…</div>
      ) : (
        <div className="lb-metric-row">
          <Metric title="Customers" value={dashboard?.customerCount ?? "—"} icon={Users} />
          <Metric title="Today's sales" value={money(dashboard?.todaySales)} icon={Wallet} />
          <Metric title="Today's expenses" value={money(dashboard?.todayExpenses)} icon={Receipt} tone="red" />
          <Metric title="Today's profit" value={money(dashboard?.todayProfit)} icon={TrendingUp} />
          <Metric title="Pending requests" value={dashboard?.pendingRequests ?? 0} icon={CreditCard} />
          <Metric title="Listed assets" value={dashboard?.listedAssetCount ?? 0} icon={Store} />
        </div>
      )}
    </>
  );
}

/* =========================================================
   PROFESSIONALS (Employees)
========================================================= */

function EmployeesPage({ business, employees, loading, onAdd, onRefresh }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = employees.filter((e) => `${e.name || ""} ${e.role || ""} ${e.phone || ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <Toolbar title="Professionals" subtitle={`Team members at ${business?.business_name || ""}`} buttonLabel="Add professional" onButton={() => setOpen(true)} search={q} setSearch={setQ} onRefresh={onRefresh} />

      <div className="lb-card lb-table-card">
        <div className="lb-table-head">
          <span>Name</span><span>Role</span><span>Job status</span><span>Status</span>
        </div>
        {loading ? (
          <div className="lb-inline-loading"><div className="lb-spinner" />Loading professionals…</div>
        ) : (
          filtered.map((employee) => (
            <div className="lb-table-row" key={employee.employee_id}>
              <div className="lb-table-cell-stack"><strong>{employee.name}</strong><small className="lb-muted">{employee.phone}</small></div>
              <span>{employee.role}</span>
              <span className="lb-muted">{employee.job_status}</span>
              <Badge text={employee.status} tone="teal" />
            </div>
          ))
        )}
        {!loading && filtered.length === 0 && <EmptyState icon={BriefcaseBusiness} text="No professionals yet for this business." compact />}
      </div>

      {open && <EmployeeModal close={() => setOpen(false)} submit={onAdd} />}
    </>
  );
}

/* =========================================================
   CUSTOMERS
========================================================= */

function CustomersPage({ business, customers, loading, onAdd, onRemind, onRefresh }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = customers.filter((c) => `${c.name || ""} ${c.phone || ""} ${c.email || ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <Toolbar title="Customers" subtitle={`Customers for ${business?.business_name || ""}`} buttonLabel="Add customer" onButton={() => setOpen(true)} search={q} setSearch={setQ} onRefresh={onRefresh} />

      <div className="lb-card lb-table-card">
        <div className="lb-table-head lb-table-head-5">
          <span>Customer</span><span>Amount</span><span>Due</span><span>Status</span><span>Action</span>
        </div>
        {loading ? (
          <div className="lb-inline-loading"><div className="lb-spinner" />Loading customers…</div>
        ) : (
          filtered.map((customer) => (
            <div className="lb-table-row lb-table-row-5" key={customer.customer_id}>
              <div className="lb-table-cell-stack"><strong>{customer.name}</strong><small className="lb-muted">{customer.phone}</small></div>
              <strong className="lb-mono">{money(customer.amount)}</strong>
              <span className="lb-muted">{formatDate(customer.due_date)}</span>
              <Badge text={customer.status} tone={String(customer.status).toLowerCase() === "overdue" ? "red" : String(customer.status).toLowerCase() === "due soon" ? "amber" : "neutral"} />
              <button className="lb-small-btn" onClick={() => onRemind(customer)}><Bell size={14} /> Remind</button>
            </div>
          ))
        )}
        {!loading && filtered.length === 0 && <EmptyState icon={Users} text="No customers yet for this business." compact />}
      </div>

      {open && <CustomerModal close={() => setOpen(false)} submit={onAdd} />}
    </>
  );
}

/* =========================================================
   PRODUCTS
========================================================= */

function ProductsPage({ business, products, loading, onAdd, onRefresh }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = products.filter((p) => `${p.name || ""} ${p.category || ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <Toolbar title="Products" subtitle={`What ${business?.business_name || "this business"} sells`} buttonLabel="Add product" onButton={() => setOpen(true)} search={q} setSearch={setQ} onRefresh={onRefresh} />

      <div className="lb-card lb-table-card">
        <div className="lb-table-head">
          <span>Product</span><span>Category</span><span>Price</span><span>Stock</span>
        </div>
        {loading ? (
          <div className="lb-inline-loading"><div className="lb-spinner" />Loading products…</div>
        ) : (
          filtered.map((p) => (
            <div className="lb-table-row" key={p.product_id}>
              <div className="lb-table-cell-stack"><strong>{p.name}</strong><small className="lb-muted">{p.unit}</small></div>
              <span className="lb-muted">{p.category || "—"}</span>
              <strong className="lb-mono">{money(p.selling_price)}</strong>
              <span>{p.stock ?? 0}</span>
            </div>
          ))
        )}
        {!loading && filtered.length === 0 && <EmptyState icon={Boxes} text="No products yet for this business." compact />}
      </div>

      {open && <ProductModal close={() => setOpen(false)} submit={onAdd} />}
    </>
  );
}

/* =========================================================
   SALES
========================================================= */

function SalesPage({ business, sales, loading, onAdd, onRefresh }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = sales.filter((s) => `${s.sale_id || ""} ${s.customer_name || ""} ${s.status || ""}`.toLowerCase().includes(q.toLowerCase()));
  const total = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);

  return (
    <>
      <Toolbar title="Sales" subtitle={`Recorded sales for ${business?.business_name || ""}`} buttonLabel="Record sale" onButton={() => setOpen(true)} search={q} setSearch={setQ} onRefresh={onRefresh} />

      <div className="lb-metric-row">
        <Metric title="Sales on record" value={money(total)} icon={Wallet} />
        <Metric title="Transactions" value={sales.length} icon={CreditCard} />
      </div>

      <div className="lb-card lb-table-card">
        <div className="lb-table-head">
          <span>Sale</span><span>Customer</span><span>Date</span><span>Total</span><span>Status</span>
        </div>
        {loading ? (
          <div className="lb-inline-loading"><div className="lb-spinner" />Loading sales…</div>
        ) : (
          filtered.map((sale) => (
            <div className="lb-table-row" key={sale.sale_id}>
              <span className="lb-mono">{sale.sale_id}</span>
              <span>{sale.customer_name || "Walk-in"}</span>
              <span className="lb-muted">{formatDateTime(sale.date)}</span>
              <strong className="lb-mono">{money(sale.total)}</strong>
              <Badge text={sale.status} tone={String(sale.status).toLowerCase() === "completed" ? "teal" : "amber"} />
            </div>
          ))
        )}
        {!loading && filtered.length === 0 && <EmptyState icon={Wallet} text="No sales match your search." compact />}
      </div>

      {open && <SaleModal close={() => setOpen(false)} submit={onAdd} />}
    </>
  );
}

/* =========================================================
   BUSINESS EXPENSES
========================================================= */

function BusinessExpensesPage({ business, expenses, loading, onAdd, onRefresh }) {
  const [open, setOpen] = useState(false);
  const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <>
      <Toolbar title="Expenses" subtitle={`Recorded expenses for ${business?.business_name || ""}`} buttonLabel="Add expense" onButton={() => setOpen(true)} onRefresh={onRefresh} />

      <div className="lb-metric-row">
        <Metric title="Total expenses" value={money(total)} icon={Receipt} tone="red" />
        <Metric title="Entries" value={expenses.length} icon={ClipboardList} />
      </div>

      <div className="lb-card lb-table-card">
        <div className="lb-table-head">
          <span>Category</span><span>Description</span><span>Date</span><span>Amount</span>
        </div>
        {loading ? (
          <div className="lb-inline-loading"><div className="lb-spinner" />Loading expenses…</div>
        ) : (
          expenses.map((e) => (
            <div className="lb-table-row" key={e.expense_id}>
              <Badge text={e.category} tone="neutral" />
              <span className="lb-muted">{e.description || "—"}</span>
              <span className="lb-muted">{formatDate(e.date)}</span>
              <strong className="lb-mono">{money(e.amount)}</strong>
            </div>
          ))
        )}
        {!loading && expenses.length === 0 && <EmptyState icon={Receipt} text="No expenses recorded yet." compact />}
      </div>

      {open && <ExpenseModal close={() => setOpen(false)} submit={onAdd} />}
    </>
  );
}

/* =========================================================
   QUOTATIONS (read-only — no backend write action yet)
========================================================= */

function QuotationsPage({ business, quotations, loading, onRefresh }) {
  return (
    <>
      <Toolbar title="Quotations" subtitle={`Quotations for ${business?.business_name || ""}`} onRefresh={onRefresh} />

      {loading ? (
        <div className="lb-inline-loading"><div className="lb-spinner" />Loading quotations…</div>
      ) : quotations.length === 0 ? (
        <EmptyState icon={ListChecks} text="No quotations yet. Creating quotations from LifeBoost isn't wired up yet — this list will populate once that's connected." />
      ) : (
        <div className="lb-card lb-table-card">
          <div className="lb-table-head">
            <span>Quotation</span><span>Date</span><span>Valid until</span><span>Total</span><span>Status</span>
          </div>
          {quotations.map((q) => (
            <div className="lb-table-row" key={q.quotation_id}>
              <span className="lb-mono">{q.quotation_id}</span>
              <span className="lb-muted">{formatDate(q.date)}</span>
              <span className="lb-muted">{formatDate(q.valid_until)}</span>
              <strong className="lb-mono">{money(q.total)}</strong>
              <Badge text={q.status} tone="amber" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* =========================================================
   REQUESTS (owner view — approve / reject)
========================================================= */

function RequestsPage({ business, requests, loading, onDecide, onRefresh }) {
  return (
    <>
      <Toolbar title="Requests" subtitle={`Requests from professionals employed at ${business?.business_name || ""}`} onRefresh={onRefresh} />

      {loading ? (
        <div className="lb-inline-loading"><div className="lb-spinner" />Loading requests…</div>
      ) : requests.length === 0 ? (
        <EmptyState icon={CreditCard} text="No requests yet. Requests sent by your professionals will appear here." />
      ) : (
        <div className="lb-card-grid">
          {requests.map((request) => (
            <div className="lb-card lb-request-card" key={request.request_id}>
              <div className="lb-request-top">
                <strong>{request.type}</strong>
                <Badge text={request.status} tone={String(request.status).toLowerCase() === "pending" ? "amber" : String(request.status).toLowerCase() === "approved" ? "teal" : "red"} />
              </div>
              <h2 className="lb-figure-sm">{money(request.amount)}</h2>
              <p className="lb-muted">{request.reason}</p>
              <small className="lb-muted">Requested by {request.user_id}</small>
              {String(request.status).toLowerCase() === "pending" && (
                <div className="lb-request-actions">
                  <button className="lb-approve" onClick={() => onDecide(request.request_id, "Approved")}><Check size={15} /> Approve</button>
                  <button className="lb-reject" onClick={() => onDecide(request.request_id, "Rejected")}><X size={15} /> Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* =========================================================
   JOBS BOARD (shared: professional + customer contexts)
========================================================= */

function JobsBoardPage({ title, subtitle, jobs, loading, mode, onRefresh }) {
  const sorted = useMemo(() => {
    if (mode === "deadlines") {
      return [...jobs].sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0));
    }
    return jobs;
  }, [jobs, mode]);

  const grouped = useMemo(() => {
    if (mode !== "progress") return null;
    const groups = {};
    jobs.forEach((j) => {
      const key = j.status || "Unspecified";
      groups[key] = groups[key] || [];
      groups[key].push(j);
    });
    return groups;
  }, [jobs, mode]);

  return (
    <>
      <Toolbar title={title} subtitle={subtitle} onRefresh={onRefresh} />

      {loading ? (
        <div className="lb-inline-loading"><div className="lb-spinner" />Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <EmptyState icon={ClipboardList} text="No jobs found." />
      ) : mode === "progress" ? (
        <div className="lb-metric-row">
          {Object.entries(grouped).map(([status, list]) => (
            <Metric key={status} title={status} value={list.length} icon={ListChecks} />
          ))}
        </div>
      ) : (
        <div className="lb-card lb-table-card">
          <div className="lb-table-head">
            <span>Job</span><span>Start</span><span>Due</span><span>Est. cost</span><span>Status</span>
          </div>
          {sorted.map((j) => (
            <div className="lb-table-row" key={j.job_id}>
              <span>{j.title || j.job_id}</span>
              <span className="lb-muted">{formatDate(j.start_date)}</span>
              <span className="lb-muted">{formatDate(j.due_date)}</span>
              <strong className="lb-mono">{money(j.estimated_cost)}</strong>
              <Badge text={j.status} tone={String(j.status).toLowerCase() === "completed" ? "teal" : "amber"} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* =========================================================
   CUSTOMER SALES (My Orders / Payments — shared)
========================================================= */

function CustomerSalesPage({ title, subtitle, sales, loading, mode, onRefresh }) {
  const total = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);

  return (
    <>
      <Toolbar title={title} subtitle={subtitle} onRefresh={onRefresh} />

      <div className="lb-metric-row">
        <Metric title={mode === "payments" ? "Total paid or due" : "Total spent"} value={money(total)} icon={Wallet} />
        <Metric title={mode === "payments" ? "Payments" : "Orders"} value={sales.length} icon={CreditCard} />
      </div>

      <div className="lb-card lb-table-card">
        <div className="lb-table-head">
          <span>Sale</span><span>Date</span><span>Total</span><span>Status</span>
        </div>
        {loading ? (
          <div className="lb-inline-loading"><div className="lb-spinner" />Loading…</div>
        ) : (
          sales.map((s) => (
            <div className="lb-table-row" key={s.sale_id}>
              <span className="lb-mono">{s.sale_id}</span>
              <span className="lb-muted">{formatDateTime(s.date)}</span>
              <strong className="lb-mono">{money(s.total)}</strong>
              <Badge text={s.status} tone={String(s.status).toLowerCase() === "completed" ? "teal" : "amber"} />
            </div>
          ))
        )}
        {!loading && sales.length === 0 && <EmptyState icon={ShoppingCart} text="Nothing found yet." compact />}
      </div>
    </>
  );
}

/* =========================================================
   MY REQUESTS (submit-only — professional + customer contexts)
========================================================= */

function MyRequestsPage({ subtitle, requests, loading, onAdd, onRefresh }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Toolbar title="Requests" subtitle={subtitle} buttonLabel="New request" onButton={() => setOpen(true)} onRefresh={onRefresh} />

      {loading ? (
        <div className="lb-inline-loading"><div className="lb-spinner" />Loading requests…</div>
      ) : requests.length === 0 ? (
        <EmptyState icon={Send} text="You haven't sent any requests here yet." />
      ) : (
        <div className="lb-card-grid">
          {requests.map((request) => (
            <div className="lb-card lb-request-card" key={request.request_id}>
              <div className="lb-request-top">
                <strong>{request.type}</strong>
                <Badge text={request.status} tone={String(request.status).toLowerCase() === "pending" ? "amber" : String(request.status).toLowerCase() === "approved" ? "teal" : "red"} />
              </div>
              <h2 className="lb-figure-sm">{money(request.amount)}</h2>
              <p className="lb-muted">{request.reason}</p>
            </div>
          ))}
        </div>
      )}

      {open && <RequestModal close={() => setOpen(false)} submit={onAdd} />}
    </>
  );
}

/* =========================================================
   ASSETS (My Finances → Assets)
========================================================= */

function AssetsPage({ assets, loading, businesses, onAdd, onRefresh, onViewMarketplace }) {
  const [open, setOpen] = useState(false);
  const total = assets.reduce((sum, a) => sum + Number(a.value || 0), 0);
  const listedCount = assets.filter((a) => a.listed).length;

  const nameOf = (ownership) => {
    if (ownership === "personal") return "Personal";
    return businesses.find((b) => String(b.business_id) === String(ownership))?.business_name || "Business";
  };

  return (
    <>
      <div className="lb-summary-card lb-card">
        <div>
          <span className="lb-eyebrow">Total asset value</span>
          <h1 className="lb-figure">{money(total)}</h1>
          {listedCount > 0 && (
            <p className="lb-muted lb-summary-sub">
              {listedCount} {listedCount === 1 ? "asset is" : "assets are"} visible to other users on the{" "}
              <button className="lb-link-btn" onClick={onViewMarketplace}>Marketplace</button>
            </p>
          )}
        </div>
        <Landmark size={38} color="#3E9A4C" />
      </div>

      <Toolbar title="My Assets" subtitle="What you and your businesses own." buttonLabel="Add asset" onButton={() => setOpen(true)} onRefresh={onRefresh} />

      {loading ? (
        <div className="lb-inline-loading"><div className="lb-spinner" />Loading assets…</div>
      ) : assets.length === 0 ? (
        <EmptyState icon={Package} text="No assets added yet." />
      ) : (
        <div className="lb-card-grid">
          {assets.map((asset) => {
            const Icon = assetIcon[asset.type] || Package;
            return (
              <div className="lb-card lb-asset-card" key={asset.asset_id}>
                <div className="lb-asset-card-top">
                  <div className="lb-asset-icon"><Icon size={20} /></div>
                  {asset.listed && <span className="lb-listed-pill"><Store size={11} /> Listed</span>}
                </div>
                <span className="lb-tag">{asset.type}</span>
                <h3>{asset.name}</h3>
                <strong className="lb-figure-sm">{money(asset.value)}</strong>
                <div className="lb-asset-meta">
                  <Badge text={nameOf(asset.ownership)} tone={asset.ownership === "personal" ? "neutral" : "teal"} />
                  {asset.location && <span className="lb-location"><MapPin size={12} /> {asset.location}</span>}
                </div>
                {asset.listed && (
                  <div className="lb-asset-stats">
                    <span title="Viewers on the marketplace"><Eye size={13} /> {asset.views || 0}</span>
                    <span className="lb-muted"><MessageCircle size={13} /> {asset.whatsapp_clicks || 0} contacted</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {open && <AssetModal close={() => setOpen(false)} submit={onAdd} />}
    </>
  );
}



/* =========================================================
   NOTIFICATIONS (built from the app's own event log)
========================================================= */

function NotificationsPage({ log }) {
  return (
    <>
      <PageHeader title="Notifications" subtitle="Recent activity from your LifeBoost account." />
      {log.length === 0 ? (
        <EmptyState icon={Bell} text="No notifications yet — actions you take will show up here." />
      ) : (
        <div className="lb-card lb-table-card">
          {log.map((n) => (
            <div className="lb-notification-row" key={n.id}>
              {n.tone === "success" ? <Check size={16} /> : n.tone === "warn" ? <AlertTriangle size={16} /> : <Bell size={16} />}
              <span>{n.message}</span>
              <small className="lb-muted">{formatDateTime(n.at)}</small>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* =========================================================
   MY ACTIVITY (sales + requests for the selected business)
========================================================= */

function ActivityPage({ business, sales, requests, loading }) {
  const items = useMemo(() => {
    const s = sales.map((x) => ({ id: `s-${x.sale_id}`, at: x.date, text: `Sale ${x.sale_id} recorded — ${money(x.total)}`, icon: Wallet }));
    const r = requests.map((x) => ({ id: `r-${x.request_id}`, at: x.request_date, text: `${x.type} request for ${money(x.amount)} — ${x.status}`, icon: CreditCard }));
    return [...s, ...r].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)).slice(0, 25);
  }, [sales, requests]);

  return (
    <>
      <PageHeader title="My Activity" subtitle={business ? `Recent activity for ${business.business_name}` : "Select a business under My Businesses to see activity."} />

      {loading ? (
        <div className="lb-inline-loading"><div className="lb-spinner" />Loading activity…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Activity} text="No recent activity yet." />
      ) : (
        <div className="lb-card lb-table-card">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div className="lb-notification-row" key={item.id}>
                <Icon size={16} />
                <span>{item.text}</span>
                <small className="lb-muted">{formatDateTime(item.at)}</small>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* =========================================================
   SETTINGS
========================================================= */

function SettingsPage({ user, businesses, onAddBusiness, onSaveProfile }) {
  const [tab, setTab] = useState("profile");
  const [open, setOpen] = useState(false);

  const tabs = [
    ["profile", "My Profile", UserRound],
    ["businesses", "My Businesses", Building2],
    ["security", "Security", ShieldCheck],
  ];

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your LifeBoost account." />

      <div className="lb-tabs">
        {tabs.map(([id, label, Icon]) => (
          <button key={id} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileForm user={user} onSave={onSaveProfile} />}

      {tab === "businesses" && (
        <div className="lb-card lb-form-card">
          <div className="lb-section-head">
            <div>
              <h2>My Businesses</h2>
              <p className="lb-muted">Businesses connected to your account.</p>
            </div>
            <button className="lb-primary-btn" onClick={() => setOpen(true)}><Plus size={16} /> Add business</button>
          </div>

          {businesses.map((b) => (
            <div className="lb-list-row" key={b.business_id}>
              <Building2 size={20} color="#8A8D80" />
              <div><strong>{b.business_name}</strong><small className="lb-muted"> · {b.business_type}</small></div>
              <Badge text={b.status} tone="teal" />
            </div>
          ))}
          {businesses.length === 0 && <EmptyState icon={Building2} text="No businesses yet." compact />}
        </div>
      )}

      {tab === "security" && (
        <div className="lb-card lb-form-card">
          <h2>Security</h2>
          <p className="lb-muted">Your password is stored with your LifeBoost account. Contact support to reset it, or add 2FA and device-session management here later.</p>
        </div>
      )}

      {open && <BusinessModal close={() => setOpen(false)} submit={onAddBusiness} />}
    </>
  );
}

function ProfileForm({ user, onSave }) {
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "" });
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setForm({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "" });
  }, [user]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setLocalError("");
    try {
      await onSave(form);
    } catch (err) {
      setLocalError(err.message || "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lb-card lb-form-card">
      <h2>My Profile</h2>
      <p className="lb-muted">Your personal LifeBoost account details.</p>
      <form onSubmit={submit}>
        <label>Full name<input className="lb-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Email<input className="lb-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Phone<input className="lb-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        {localError && <p className="lb-form-error">{localError}</p>}
        <button className="lb-primary-btn" type="submit" disabled={busy}><Save size={16} />{busy ? "Saving…" : "Save profile"}</button>
      </form>
    </div>
  );
}

/* =========================================================
   SHARED UI
========================================================= */

function PageHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="lb-page-header">
      {eyebrow && <span className="lb-eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

function Toolbar({ title, subtitle, buttonLabel, onButton, search, setSearch, onRefresh }) {
  return (
    <div className="lb-toolbar">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="lb-toolbar-actions">
        {setSearch && (
          <div className="lb-search">
            <Search size={15} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
          </div>
        )}
        {onRefresh && <button className="lb-refresh-btn" onClick={onRefresh} aria-label="Refresh"><RefreshCw size={15} /></button>}
        {buttonLabel && <button className="lb-primary-btn" onClick={onButton}><Plus size={16} /> {buttonLabel}</button>}
      </div>
    </div>
  );
}

function Metric({ title, value, icon: Icon, tone }) {
  return (
    <div className="lb-card lb-metric">
      <div className={`lb-metric-icon ${tone ? `is-${tone}` : ""}`}><Icon size={18} /></div>
      <span className="lb-muted">{title}</span>
      <h2 className="lb-figure-sm">{value}</h2>
    </div>
  );
}

function Badge({ text, tone = "neutral" }) {
  return <span className={`lb-badge lb-badge-${tone}`}>{text || "—"}</span>;
}

function EmptyState({ icon: Icon, text, compact }) {
  return (
    <div className={`lb-empty ${compact ? "lb-empty-compact" : "lb-card"}`}>
      <Icon size={compact ? 22 : 30} color="#B9B6AA" />
      <p>{text}</p>
    </div>
  );
}

function ToastStack({ toasts }) {
  return (
    <div className="lb-toast-stack">
      {toasts.map((toast) => (
        <div className={`lb-toast lb-toast-${toast.tone}`} key={toast.id}>
          {toast.tone === "success" ? <Check size={16} /> : toast.tone === "warn" ? <AlertTriangle size={16} /> : <Bell size={16} />}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   MODALS
========================================================= */

function Modal({ title, close, children }) {
  return (
    <div className="lb-modal-backdrop" onClick={close}>
      <div className="lb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lb-modal-head">
          <h2>{title}</h2>
          <button onClick={close} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="lb-modal-body">{children}</div>
      </div>
    </div>
  );
}

function useModalSubmit(submit, close, isValid) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event, form) {
    event.preventDefault();
    if (!isValid(form)) return;
    setBusy(true);
    setError("");
    try {
      await submit(form);
      close();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, handleSubmit };
}

function FormActions({ close, busy, label = "Save" }) {
  return (
    <div className="lb-form-actions">
      <button type="button" className="lb-ghost-btn" onClick={close} disabled={busy}>Cancel</button>
      <button type="submit" className="lb-primary-btn" disabled={busy}>{busy ? "Saving…" : label}</button>
    </div>
  );
}

/* ---------- LOGIN ---------- */

function LoginModal({ close, submit, switchToRegister }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const { busy, error, handleSubmit } = useModalSubmit(submit, close, (f) => !!f.email && !!f.password);

  return (
    <Modal title="Sign in to LifeBoost" close={close}>
      <form onSubmit={(e) => handleSubmit(e, form)}>
        <label>Email *<input className="lb-input" required type="email" autoFocus value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
        <label>Password *<input className="lb-input" required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></label>
        {error && <p className="lb-form-error">{error}</p>}
        <FormActions close={close} busy={busy} label="Sign in" />
        <p className="lb-modal-switch">Don't have an account? <button type="button" className="lb-link-btn" onClick={switchToRegister}>Create one</button></p>
      </form>
    </Modal>
  );
}

/* ---------- REGISTER ---------- */

function RegisterModal({ close, submit, switchToLogin }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const { busy, error, handleSubmit } = useModalSubmit(submit, close, (f) => !!f.name && !!f.email && !!f.password && f.password === f.confirmPassword);
  const passwordsMismatch = form.password && form.confirmPassword && form.password !== form.confirmPassword;

  return (
    <Modal title="Create your LifeBoost account" close={close}>
      <form onSubmit={(e) => handleSubmit(e, form)}>
        <label>Full name *<input className="lb-input" required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Felix Chege" /></label>
        <label>Email *<input className="lb-input" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
        <label>Phone<input className="lb-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0700 000 000" /></label>
        <label>Password *<input className="lb-input" required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" /></label>
        <label>Confirm password *<input className="lb-input" required type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></label>
        {passwordsMismatch && <p className="lb-form-error">Passwords don't match.</p>}
        {error && <p className="lb-form-error">{error}</p>}
        <FormActions close={close} busy={busy} label="Create account" />
        <p className="lb-modal-switch">Already have an account? <button type="button" className="lb-link-btn" onClick={switchToLogin}>Sign in</button></p>
      </form>
    </Modal>
  );
}

/* ---------- BUSINESS ---------- */

function BusinessModal({ close, submit }) {
  const [form, setForm] = useState({
    name: "",
    type: "Restaurant",
    phone: "",
    email: "",
    region: "",
    listed: false,
    tagline: "",
  });
  const { busy, error, handleSubmit } = useModalSubmit(submit, close, (f) => !!f.name);

  return (
    <Modal title="Add business" close={close}>
      <form onSubmit={(e) => handleSubmit(e, form)}>
        <label>
          Business name *
          <input
            className="lb-input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Felix Hardware"
          />
        </label>
        <label>
          Business type
          <select
            className="lb-input"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {[
              "Restaurant",
              "Construction",
              "Agriculture",
              "Retail",
              "Manufacturing",
              "Transport",
              "Professional Services",
              "Other",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Phone
          <input
            className="lb-input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="0700 000 000"
          />
        </label>
        <label>
          Email
          <input
            className="lb-input"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="info@business.com"
          />
        </label>
        <label>
          Region / city
          <input
            className="lb-input"
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            placeholder="Nairobi"
          />
        </label>

        <label className="lb-checkbox-row">
          <input
            type="checkbox"
            checked={form.listed}
            onChange={(e) => setForm({ ...form, listed: e.target.checked })}
          />
          List this business on the Marketplace
        </label>
        {form.listed && (
          <label>
            Tagline
            <input
              className="lb-input"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="e.g. Quality construction across Nairobi"
            />
          </label>
        )}

        {error && <p className="lb-form-error">{error}</p>}
        <FormActions close={close} busy={busy} label="Add business" />
      </form>
    </Modal>
  );
}

/* ---------- CUSTOMER ---------- */

function CustomerModal({ close, submit }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", amount: "", due: "", type: "individual", status: "Pending" });
  const { busy, error, handleSubmit } = useModalSubmit(submit, close, (f) => !!f.name && !!f.amount && !!f.due);

  return (
    <Modal title="Add customer" close={close}>
      <form onSubmit={(e) => handleSubmit(e, form)}>
        <label>Customer name *<input className="lb-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ABC Company" /></label>
        <label>Phone<input className="lb-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0712 000 000" /></label>
        <label>Email<input className="lb-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="accounts@company.com" /></label>
        <label>Amount owed (KSh) *<input className="lb-input" required type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="85000" /></label>
        <label>Due date *<input className="lb-input" required type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></label>
        <label>
          Type
          <select className="lb-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="individual">Individual</option><option value="company">Company</option>
          </select>
        </label>
        <label>
          Status
          <select className="lb-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>Pending</option><option>Due soon</option><option>Overdue</option><option>Paid</option>
          </select>
        </label>
        {error && <p className="lb-form-error">{error}</p>}
        <FormActions close={close} busy={busy} label="Add customer" />
      </form>
    </Modal>
  );
}
/* ---------- EMPLOYEE (Professional) ---------- */
function EmployeeModal({ close, submit }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    role: "",
    jobStatus: "Active",
    salary: "",
    status: "active",
    listed: false,
    location: "",
  });
  const { busy, error, handleSubmit } = useModalSubmit(
    submit,
    close,
    (f) => !!f.name && !!f.role
  );

  return (
    <Modal title="Add professional" close={close}>
      <form onSubmit={(e) => handleSubmit(e, form)}>
        <label>
          Name *
          <input
            className="lb-input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label>
          Role *
          <input
            className="lb-input"
            required
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="Chef / Engineer / Manager"
          />
        </label>
        <label>
          Phone
          <input
            className="lb-input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="0712 000 000"
          />
        </label>
        <label>
          Email <small className="lb-muted">(creates their LifeBoost login)</small>
          <input
            className="lb-input"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          Job status
          <select
            className="lb-input"
            value={form.jobStatus}
            onChange={(e) => setForm({ ...form, jobStatus: e.target.value })}
          >
            {["Active", "Not started", "On leave", "Completed"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Salary (KSh)
          <input
            className="lb-input"
            type="number"
            min="0"
            value={form.salary}
            onChange={(e) => setForm({ ...form, salary: e.target.value })}
            placeholder="45000"
          />
        </label>
        <label>
          Status
          <select
            className="lb-input"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </label>

        <label className="lb-checkbox-row">
          <input
            type="checkbox"
            checked={form.listed}
            onChange={(e) => setForm({ ...form, listed: e.target.checked })}
          />
          List this professional on the Marketplace
        </label>
        {form.listed && (
          <label>
            Service location
            <input
              className="lb-input"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Nairobi / Westlands"
            />
          </label>
        )}

        {error && <p className="lb-form-error">{error}</p>}
        <FormActions close={close} busy={busy} label="Add professional" />
      </form>
    </Modal>
  );
}

/* ---------- PRODUCT ---------- */

function ProductModal({ close, submit }) {
  const [form, setForm] = useState({ name: "", category: "", unit: "unit", sellingPrice: "", costPrice: "", stock: "" });
  const { busy, error, handleSubmit } = useModalSubmit(submit, close, (f) => !!f.name && !!f.sellingPrice);

  return (
    <Modal title="Add product" close={close}>
      <form onSubmit={(e) => handleSubmit(e, form)}>
        <label>Product name *<input className="lb-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Category<input className="lb-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Beverages" /></label>
        <label>Unit<input className="lb-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="unit / kg / bag" /></label>
        <label>Selling price (KSh) *<input className="lb-input" required type="number" min="0" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} /></label>
        <label>Cost price (KSh)<input className="lb-input" type="number" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} /></label>
        <label>Stock<input className="lb-input" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
        {error && <p className="lb-form-error">{error}</p>}
        <FormActions close={close} busy={busy} label="Add product" />
      </form>
    </Modal>
  );
}

/* ---------- EXPENSE ---------- */

function ExpenseModal({ close, submit }) {
  const [form, setForm] = useState({ category: "Other", description: "", amount: "" });
  const { busy, error, handleSubmit } = useModalSubmit(submit, close, (f) => !!f.amount);

  return (
    <Modal title="Add expense" close={close}>
      <form onSubmit={(e) => handleSubmit(e, form)}>
        <label>
          Category
          <select className="lb-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {["Rent", "Utilities", "Salaries", "Supplies", "Transport", "Marketing", "Other"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Description<input className="lb-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was this for?" /></label>
        <label>Amount (KSh) *<input className="lb-input" required type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
        {error && <p className="lb-form-error">{error}</p>}
        <FormActions close={close} busy={busy} label="Add expense" />
      </form>
    </Modal>
  );
}

/* ---------- SALE ---------- */

function SaleModal({ close, submit }) {
  const [form, setForm] = useState({ customer: "", customerId: "", total: "", status: "Completed" });
  const { busy, error, handleSubmit } = useModalSubmit(submit, close, (f) => !!f.total);

  return (
    <Modal title="Record sale" close={close}>
      <form onSubmit={(e) => handleSubmit(e, form)}>
        <label>Customer name<input className="lb-input" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} placeholder="Walk-in or customer name" /></label>
        <label>Customer ID <small className="lb-muted">(optional)</small><input className="lb-input" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} placeholder="CUS-XXXXXXXX" /></label>
        <label>Total (KSh) *<input className="lb-input" required type="number" min="0" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} placeholder="6400" /></label>
        <label>
          Status
          <select className="lb-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>Completed</option><option>Invoiced</option><option>Pending</option><option>Cancelled</option>
          </select>
        </label>
        {error && <p className="lb-form-error">{error}</p>}
        <FormActions close={close} busy={busy} label="Record sale" />
      </form>
    </Modal>
  );
}

/* ---------- ASSET ---------- */

function AssetModal({ close, submit }) {
    const [form, setForm] = useState({
    name: "",
    type: "Property",
    value: "",
    ownership: "personal",
    listed: false,
    location: "",
    phone: "",
    image_url: "",
    video_url: "",
  });
  const { busy, error, handleSubmit } = useModalSubmit(submit, close, (f) => !!f.name && !!f.value);

  return (
    <Modal title="Add asset" close={close}>
      <form onSubmit={(e) => handleSubmit(e, form)}>
        <label>Asset name *<input className="lb-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Toyota Prado" /></label>
        <label>
          Asset type
          <select className="lb-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {["Property", "Vehicle", "Land", "Equipment", "Investment", "Other"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label>
          Ownership
          <select className="lb-input" value={form.ownership} onChange={(e) => setForm({ ...form, ownership: e.target.value })}>
            <option value="personal">Personal</option><option value="business">Current business</option>
          </select>
        </label>
        <label>Estimated value (KSh) *<input className="lb-input" required type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="500000" /></label>
        <label className="lb-checkbox-row">
          <input type="checkbox" checked={form.listed} onChange={(e) => setForm({ ...form, listed: e.target.checked })} />
          List this asset on the LifeBoost Marketplace
        </label>
        {form.listed && (
          <>
            <p className="lb-hint">Listed assets show their location, viewer count and WhatsApp contacts to other LifeBoost users.</p>
            <label>Location<input className="lb-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Westlands, Nairobi" /></label>
            <label>WhatsApp number<input className="lb-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0700 000 000" /></label>
                        <label>
              Image URL
              <input
                className="lb-input"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
              />
            </label>
            <label>
              Video URL <small className="lb-muted">(optional YouTube/Drive link)</small>
              <input
                className="lb-input"
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="https://..."
              />
            </label>
          </>
        )}
        {error && <p className="lb-form-error">{error}</p>}
        <FormActions close={close} busy={busy} label="Add asset" />
      </form>
    </Modal>
  );
}

/* ---------- REQUEST ---------- */

function RequestModal({ close, submit }) {
  const [form, setForm] = useState({ type: "Transport", amount: "", reason: "" });
  const { busy, error, handleSubmit } = useModalSubmit(submit, close, (f) => !!f.amount && !!f.reason);

  return (
    <Modal title="New money request" close={close}>
      <form onSubmit={(e) => handleSubmit(e, form)}>
        <label>
          Request type
          <select className="lb-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {["Transport", "Materials", "Allowance", "Reimbursement", "Refund", "Other"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label>Amount (KSh) *<input className="lb-input" required type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
        <label>Reason *<textarea className="lb-input" required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></label>
        {error && <p className="lb-form-error">{error}</p>}
        <FormActions close={close} busy={busy} label="Submit request" />
      </form>
    </Modal>
  );
}
/* =========================================================
   MARKETPLACE (reachable from My Assets, no login required)
========================================================= */


function MarketplacePage({ marketplace, loading, onContact, onView }) {
  const [tab, setTab] = useState("assets");

  const assets = marketplace.assets || [];
  const professionals = marketplace.professionals || [];
  const businesses = marketplace.businesses || [];

  return (
    <>
      <PageHeader
        title="Marketplace"
        subtitle="Assets, professionals and businesses listed by LifeBoost users."
      />

      <div className="lb-tabs">
        <button
          type="button"
          className={tab === "assets" ? "is-active" : ""}
          onClick={() => setTab("assets")}
        >
          Assets ({assets.length})
        </button>
        <button
          type="button"
          className={tab === "professionals" ? "is-active" : ""}
          onClick={() => setTab("professionals")}
        >
          Professionals ({professionals.length})
        </button>
        <button
          type="button"
          className={tab === "businesses" ? "is-active" : ""}
          onClick={() => setTab("businesses")}
        >
          Businesses ({businesses.length})
        </button>
      </div>

      {loading ? (
        <div className="lb-inline-loading">
          <div className="lb-spinner" /> Loading…
        </div>
      ) : tab === "assets" ? (
        assets.length === 0 ? (
          <EmptyState icon={Store} text="No assets listed yet." />
        ) : (
          <div className="lb-card-grid">
            {assets.map((a) => {
              const Icon = assetIcon[a.type] || Package;
              return (
                <div
                  className="lb-card lb-market-card"
                  key={a.asset_id}
                  onMouseEnter={() => onView?.(a, "asset")}
                >
                                    {a.image_url ? (
                    <img
                      className="lb-market-thumb"
                      src={a.image_url}
                      alt={a.name}
                    />
                  ) : (
                    <div className="lb-market-card-top">
                      <Icon size={20} />
                      <Badge text="Asset" tone="teal" />
                    </div>
                  )}
                  <strong>{a.name}</strong>
                                    {a.video_url && (
                    <a
                      className="lb-text-btn"
                      href={a.video_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Watch video
                    </a>
                  )}
                  <p className="lb-muted">{a.type}</p>
                  <h3 className="lb-figure-sm">{money(a.value)}</h3>
                  {a.location && (
                    <small className="lb-muted">
                      <MapPin size={12} /> {a.location}
                    </small>
                  )}
                  <div className="lb-market-meta">
                    <span>
                      <Eye size={14} /> {a.views || 0}
                    </span>
                    <span>
                      <MessageCircle size={14} /> {a.whatsapp_clicks || 0}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="lb-primary-btn"
                    onClick={() => onContact(a, "asset")}
                  >
                    <MessageCircle size={16} /> Contact
                  </button>
                </div>
              );
            })}
          </div>
        )
      ) : tab === "professionals" ? (
        professionals.length === 0 ? (
          <EmptyState icon={BriefcaseBusiness} text="No professionals listed yet." />
        ) : (
          <div className="lb-card-grid">
            {professionals.map((p) => (
              <div
                className="lb-card lb-market-card"
                key={p.employee_id}
                onMouseEnter={() => onView?.(p, "professional")}
              >
                <div className="lb-market-card-top">
                  <BriefcaseBusiness size={20} />
                  <Badge text="Professional" tone="amber" />
                </div>
                <strong>{p.name}</strong>
                <p className="lb-muted">
                  {p.role} {p.business_name ? `· ${p.business_name}` : ""}
                </p>
                {(p.location || p.region) && (
                  <small className="lb-muted">
                    <MapPin size={12} /> {p.location || p.region}
                  </small>
                )}
                <div className="lb-market-meta">
                  <span>
                    <Eye size={14} /> {p.views || 0}
                  </span>
                  <span>
                    <MessageCircle size={14} /> {p.whatsapp_clicks || 0}
                  </span>
                </div>
                <button
                  type="button"
                  className="lb-primary-btn"
                  onClick={() => onContact(p, "professional")}
                >
                  <MessageCircle size={16} /> Contact
                </button>
              </div>
            ))}
          </div>
        )
      ) : businesses.length === 0 ? (
        <EmptyState icon={Building2} text="No businesses listed yet." />
      ) : (
        <div className="lb-card-grid">
          {businesses.map((b) => (
            <div
              className="lb-card lb-market-card"
              key={b.business_id}
              onMouseEnter={() => onView?.(b, "business")}
            >
              <div className="lb-market-card-top">
                <Building2 size={20} />
                <Badge text="Business" tone="teal" />
              </div>
              <strong>{b.business_name}</strong>
              <p className="lb-muted">{b.tagline || b.business_type}</p>
              {b.region && (
                <small className="lb-muted">
                  <MapPin size={12} /> {b.region}
                </small>
              )}
              <div className="lb-market-meta">
                <span>
                  <Eye size={14} /> {b.views || 0}
                </span>
                <span>
                  <MessageCircle size={14} /> {b.whatsapp_clicks || 0}
                </span>
              </div>
              <button
                type="button"
                className="lb-primary-btn"
                onClick={() => onContact(b, "business")}
              >
                <MessageCircle size={16} /> Contact
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}


/* =========================================================
   START APP
========================================================= */

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error(
    'Could not find the root element. Make sure index.html contains <div id="root"></div>.'
  );
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
