const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.warn(
    "VITE_API_URL is not configured. Create a .env file with your Apps Script URL."
  );
}

/* =========================================================
   RESPONSE PARSER
========================================================= */

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return {
      success: false,
      message: "Empty response from server"
    };
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      success: false,
      message: text || "Invalid response from server"
    };
  }
}


/* =========================================================
   GET
========================================================= */

export async function apiGet(action, params = {}) {
  if (!API_URL) {
    throw new Error("VITE_API_URL is not configured.");
  }

  const url = new URL(API_URL);

  url.searchParams.set("action", action);

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    method: "GET"
  });

  const data = await parseResponse(response);

  return data;   // return the full { success, data, message }
}


/* =========================================================
   POST
========================================================= */

export async function apiPost(action, payload = {}) {
  if (!API_URL) {
    throw new Error("VITE_API_URL is not configured.");
  }

  const response = await fetch(API_URL, {
    method: "POST",

    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },

    body: JSON.stringify({
      action,
      ...payload
    })
  });

  const data = await parseResponse(response);

  return data;   // return the full { success, data, message }
}



/* =========================================================
   CONVENIENCE API FUNCTIONS
   These make main.jsx much cleaner.
========================================================= */


/* USER */

export function getUser(userId) {
  return apiGet("user", {
    user_id: userId
  });
}


/* DASHBOARD */

export function getDashboard({
  userId,
  businessId
} = {}) {
  return apiGet("dashboard", {
    user_id: userId,
    business_id: businessId
  });
}


/* BUSINESSES */

export function getBusinesses(userId) {
  return apiGet("businesses", {
    user_id: userId
  });
}


/* CUSTOMERS */

export function getCustomers(businessId) {
  return apiGet("customers", {
    business_id: businessId
  });
}


/* EMPLOYEES */

export function getEmployees(businessId) {
  return apiGet("employees", {
    business_id: businessId
  });
}


/* PRODUCTS */

export function getProducts(businessId) {
  return apiGet("products", {
    business_id: businessId
  });
}


/* SALES */

export function getSales(businessId) {
  return apiGet("sales", {
    business_id: businessId
  });
}


/* EXPENSES */

export function getExpenses(businessId) {
  return apiGet("expenses", {
    business_id: businessId
  });
}


/* QUOTATIONS */

export function getQuotations(businessId) {
  return apiGet("quotations", {
    business_id: businessId
  });
}


/* JOBS */

export function getJobs(businessId) {
  return apiGet("jobs", {
    business_id: businessId
  });
}


/* REQUESTS */

export function getRequests(businessId) {
  return apiGet("requests", {
    business_id: businessId
  });
}


/* MY REQUESTS */

export function getMyRequests(userId) {
  return apiGet("my_requests", {
    user_id: userId
  });
}


/* ASSETS */

export function getAssets(userId) {
  return apiGet("assets", {
    user_id: userId
  });
}


/* MARKETPLACE */

export function getMarketplace() {
  return apiGet("marketplace");
}


/* =========================================================
   POST FUNCTIONS
========================================================= */


/* BUSINESS */

export function addBusiness(payload) {
  return apiPost("add_business", payload);
}


/* CUSTOMER */

export function addCustomer(payload) {
  return apiPost("add_customer", payload);
}


/* PRODUCT */

export function addProduct(payload) {
  return apiPost("add_product", payload);
}


/* SALE */

export function addSale(payload) {
  return apiPost("add_sale", payload);
}


/* EXPENSE */

export function addExpense(payload) {
  return apiPost("add_expense", payload);
}


/* EMPLOYEE */

export function addEmployee(payload) {
  return apiPost("add_employee", payload);
}


/* ASSET */

export function addAsset(payload) {
  return apiPost("add_asset", payload);
}


/* REQUEST */

export function addRequest(payload) {
  return apiPost("add_request", payload);
}


/* APPROVE REQUEST */

export function approveRequest(payload) {
  return apiPost("approve_request", payload);
}


/* REJECT REQUEST */

export function rejectRequest(payload) {
  return apiPost("reject_request", payload);
}


/* PROFILE */

export function updateUser(payload) {
  return apiPost("update_user", payload);
}


/* MARKETPLACE VIEW */

export function viewAsset(assetId) {
  return apiPost("view_asset", {
    asset_id: assetId
  });
}


/* MARKETPLACE WHATSAPP CONTACT */

export function contactAsset(assetId) {
  return apiPost("contact_asset", {
    asset_id: assetId
  });
}


/* =========================================================
   HEALTH CHECK
========================================================= */

export function healthCheck() {
  return apiGet("health");
}
