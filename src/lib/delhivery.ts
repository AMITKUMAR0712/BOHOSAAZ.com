import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const DELHIVERY_API_BASE = "https://track.delhivery.com/api";
const DELHIVERY_LOGIN_BASE = env.DELHIVERY_LOGIN_BASE?.trim() || "https://btob.api.delhivery.com";
const DEFAULT_COUNTRY = "India";

let delhiveryJwtCache: { token: string; expiresAt: number } | null = null;

function nonEmpty(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildAddress(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).map((value) => value?.trim()).filter(Boolean).join(", ");
}

function extractTrackingNumber(payload: unknown): string | null {
  const record = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : null;
  if (!record) return null;

  return (
    normalizeString(record["tracking_number"]) ||
    normalizeString(record["waybill"]) ||
    normalizeString(record["awb"]) ||
    normalizeString(record["awb_number"]) ||
    normalizeString(record["consignment_id"]) ||
    normalizeString(record["trackingNumber"])
  );
}

function hasDelhiveryCredentials() {
  return nonEmpty(env.DELHIVERY_API_USERNAME) && nonEmpty(env.DELHIVERY_API_PASSWORD);
}

function getLegacyDelhiveryToken(): string {
  const token = env.DELHIVERY_AUTH_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Delhivery is not configured. Set DELHIVERY_AUTH_TOKEN or DELHIVERY_API_USERNAME and DELHIVERY_API_PASSWORD."
    );
  }
  return token;
}

async function loginDelhiveryJwt() {
  if (delhiveryJwtCache && delhiveryJwtCache.expiresAt > Date.now() + 60_000) {
    return delhiveryJwtCache.token;
  }

  const username = env.DELHIVERY_API_USERNAME?.trim() ?? "";
  const password = env.DELHIVERY_API_PASSWORD?.trim() ?? "";
  if (!username || !password) {
    throw new Error("DELHIVERY_API_USERNAME and DELHIVERY_API_PASSWORD are required for Delhivery login.");
  }

  const response = await fetch(`${DELHIVERY_LOGIN_BASE}/ums/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error || payload?.message || response.statusText;
    throw new Error(`Delhivery login failed: ${response.status} ${response.statusText} ${message ?? ""}`);
  }

  if (!payload || typeof payload.jwt !== "string") {
    throw new Error("Delhivery login returned an unexpected response.");
  }

  delhiveryJwtCache = {
    token: payload.jwt.trim(),
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
  };

  return delhiveryJwtCache.token;
}

async function getDelhiveryAuthToken() {
  if (hasDelhiveryCredentials()) {
    return loginDelhiveryJwt();
  }
  return getLegacyDelhiveryToken();
}

function getPaymentMode(orderPaymentMethod: string | null | undefined) {
  return orderPaymentMethod === "COD" ? "COD" : "Prepaid";
}

function getWeightGrams(weight: number | null | undefined) {
  if (!weight || weight <= 0) return 1000;
  if (weight <= 50) return Math.round(weight * 1000);
  return Math.round(weight);
}

export async function createDelhiveryShipmentForOrderItem(itemId: string) {
  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: {
      order: true,
      product: true,
      vendorOrder: { include: { vendor: true } },
    },
  });

  if (!item) {
    throw new Error("Order item not found.");
  }
  if (!item.order) {
    throw new Error("Order data is missing for this item.");
  }
  if (!item.product) {
    throw new Error("Product data is missing for this item.");
  }

  const vendor =
    item.vendorOrder?.vendor ||
    (item.product.vendorId ? await prisma.vendor.findUnique({ where: { id: item.product.vendorId } }) : null);

  if (!vendor) {
    throw new Error("Vendor information is missing for this item.");
  }

  if (!vendor.pickupAddress1 || !vendor.pickupCity || !vendor.pickupState || !vendor.pickupPincode) {
    throw new Error("Vendor pickup address is incomplete. Please configure pickup address in vendor settings.");
  }
  if (!item.order.fullName || !item.order.address1 || !item.order.city || !item.order.state || !item.order.pincode) {
    throw new Error("Customer delivery address is incomplete.");
  }

  const pickupName = vendor.pickupName || vendor.shopName || vendor.contactEmail || "Seller";
  const pickupPhone = vendor.pickupPhone || vendor.contactPhone || "";
  const pickupAddress = buildAddress([vendor.pickupAddress1, vendor.pickupAddress2]);
  const deliveryName = item.order.fullName || "Customer";
  const deliveryPhone = item.order.phone || "";
  const deliveryAddress = buildAddress([item.order.address1, item.order.address2]);

  const token = await getDelhiveryAuthToken();
  const payloadData = {
    shipments: [
      {
        name: deliveryName,
        add: deliveryAddress,
        pin: item.order.pincode,
        city: item.order.city,
        state: item.order.state,
        country: DEFAULT_COUNTRY,
        phone: deliveryPhone,
        order: item.orderId,
        payment_mode: getPaymentMode(item.order.paymentMethod),
        return_pin: vendor.pickupPincode,
        return_city: vendor.pickupCity,
        return_phone: pickupPhone,
        return_add: pickupAddress,
        return_state: vendor.pickupState,
        return_country: DEFAULT_COUNTRY,
        products_desc: item.product.title || "Product",
        cod_amount: getPaymentMode(item.order.paymentMethod) === "COD" ? Number((item.price * item.quantity).toFixed(2)) : 0,
        order_date: new Date().toISOString(),
        total_amount: Number((item.price * item.quantity).toFixed(2)),
        seller_add: pickupAddress,
        seller_name: pickupName,
        quantity: item.quantity,
        weight: getWeightGrams(item.product.weight),
      }
    ],
    pickup_location: {
      name: pickupName,
      add: pickupAddress,
      city: vendor.pickupCity,
      pin: vendor.pickupPincode,
      country: DEFAULT_COUNTRY,
      phone: pickupPhone,
    }
  };

  const formData = new URLSearchParams();
  formData.append("format", "json");
  formData.append("data", JSON.stringify(payloadData));

  // Ensure warehouse exists for multi-vendor support
  const warehousePayload = {
    name: pickupName,
    registered_name: pickupName,
    email: vendor.contactEmail || "admin@bohosaaz.com",
    phone: pickupPhone,
    address: pickupAddress,
    city: vendor.pickupCity,
    country: DEFAULT_COUNTRY,
    pin: vendor.pickupPincode,
    return_address: pickupAddress,
    return_pin: vendor.pickupPincode,
    return_city: vendor.pickupCity,
    return_state: vendor.pickupState,
    return_country: DEFAULT_COUNTRY,
  };

  try {
    const warehouseRes = await fetch(`${DELHIVERY_API_BASE}/backend/clientwarehouse/create/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify(warehousePayload),
    });
    // Log for debugging just in case
    const warehouseText = await warehouseRes.text();
    console.log("Delhivery Warehouse Create:", warehouseText);
  } catch (err) {
    console.warn("Failed to create warehouse (might already exist):", err);
  }

  const response = await fetch(`${DELHIVERY_API_BASE}/cmu/create.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Token ${token}`,
    },
    body: formData.toString(),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    const details = payload ? JSON.stringify(payload) : await response.text();
    throw new Error(`Delhivery create shipment failed: ${response.status} ${response.statusText} ${details}`);
  }

  if (typeof payload !== "object") {
    throw new Error("Delhivery create shipment returned invalid response.");
  }

  const trackingNumber = extractTrackingNumber(payload) || extractTrackingNumber(payload?.data) || extractTrackingNumber(payload?.response);
  if (!trackingNumber) {
    const errorMessage =
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : JSON.stringify(payload);
    throw new Error(`Delhivery did not return a tracking number. ${errorMessage}`);
  }

  return {
    trackingNumber,
    rawResponse: payload,
  };
}
