/**
 * Quick API sanity check (backend running). Bao gồm các kịch bản giày dép:
 *   - login + users/me
 *   - catalog list (lọc size + sort)
 *   - oversell scenario phải bị chặn
 *   - đặt đơn thực + admin chuyển trạng thái + huỷ đơn (rollback stock)
 *
 * Usage (PowerShell):
 *   $env:API_URL='http://127.0.0.1:8000/api/v1'
 *   $env:SMOKE_STORE_ID='2'
 *   $env:SMOKE_EMAIL='demo.shoes@gmail.com'
 *   $env:SMOKE_PASSWORD='demo123456'
 *   node scripts/smoke-api-check.mjs
 */
const BASE = (process.env.API_URL ?? 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');
const STORE_ID = process.env.SMOKE_STORE_ID ?? '2';
const EMAIL = process.env.SMOKE_EMAIL ?? 'demo.shoes@gmail.com';
const PASS = process.env.SMOKE_PASSWORD ?? 'demo123456';

async function req(path, { method = 'GET', token, body, expectError = false } = {}) {
  const headers = { 'X-Store-Id': STORE_ID };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body != null) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}/${path.replace(/^\//, '')}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok && !expectError) {
    const msg =
      json && typeof json === 'object' && json.error?.message
        ? json.error.message
        : `${res.status} ${text?.slice(0, 160)}`;
    throw new Error(`${method} ${path} -> ${msg}`);
  }
  return { ok: res.ok, status: res.status, body: json };
}

function expect(cond, msg) {
  if (!cond) throw new Error(`Expectation failed: ${msg}`);
}

/** Catalog GET /products trả về { items, total } hoặc mảng (legacy). */
function productListItems(body) {
  if (Array.isArray(body)) return body;
  if (body && Array.isArray(body.items)) return body.items;
  return [];
}

async function main() {
  console.log(`Smoke API → ${BASE} (store ${STORE_ID})`);

  const login = await req('auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASS },
  });
  const token = login.body?.access_token;
  expect(typeof token === 'string' && token.length > 50, 'login returns access_token');

  const me = await req('users/me', { token });
  expect(me.body?.email, 'users/me missing email');
  console.log(`✓ login as ${me.body.email} (role=${me.body.role})`);

  const filtered = await req('products?size=42&sort=price_asc');
  const filteredItems = productListItems(filtered.body);
  expect(filteredItems.length > 0, 'products page has items');
  expect(filteredItems.every((p) => p.variants.some((v) => v.size === '42')), 'every product has size 42');
  console.log(`✓ catalog filter size=42 → ${filteredItems.length} products (page)`);

  // Tìm sản phẩm có variant đủ stock để đặt
  const all = await req('products?in_stock=true&sort=newest&limit=200');
  const allItems = productListItems(all.body);
  const target = allItems.find((p) => p.variants.some((v) => v.stock > 0));
  expect(target, 'có sản phẩm còn tồn kho');
  const targetVariant = target.variants.find((v) => v.stock > 0);

  const addrs = await req('addresses/', { token });
  expect(Array.isArray(addrs.body), 'addresses response not array');
  expect(addrs.body.length > 0, 'tài khoản demo có sẵn 1 địa chỉ');
  const addressId = addrs.body[0].id;

  const oversell = await req('orders/', {
    method: 'POST',
    token,
    body: {
      items: [{ productId: target.id, variantId: targetVariant.id, quantity: 9999 }],
      shippingAddressId: addressId,
      paymentMethod: 'cod',
    },
    expectError: true,
  });
  expect(oversell.status === 409, `oversell expected 409, got ${oversell.status}`);
  expect(oversell.body?.error?.code === 'out_of_stock', 'oversell error code');
  console.log('✓ oversell bị chặn đúng (409 out_of_stock)');

  const placed = await req('orders/', {
    method: 'POST',
    token,
    body: {
      items: [{ productId: target.id, variantId: targetVariant.id, quantity: 1 }],
      shippingAddressId: addressId,
      paymentMethod: 'cod',
    },
  });
  expect(placed.body?.id, 'order created with id');
  console.log(`✓ đặt đơn thành công ${placed.body.code} total=${placed.body.total}`);

  if (me.body.role === 'admin') {
    const promoCode = `SMK${Date.now().toString().slice(-6)}`;
    const promoCreated = await req('admin/promos', {
      method: 'POST',
      token,
      body: {
        code: promoCode,
        discountType: 'fixed',
        discountValue: 10000,
        minOrderTotal: 100000,
        usageLimit: 20,
        isActive: true,
      },
    });
    expect(promoCreated.body?.id, 'create promo');

    const withPromo = await req('orders/', {
      method: 'POST',
      token,
      body: {
        items: [{ productId: target.id, variantId: targetVariant.id, quantity: 1 }],
        shippingAddressId: addressId,
        paymentMethod: 'cod',
        promoCode,
      },
    });
    expect(withPromo.body?.discountTotal > 0, 'promo applied to order');

    const users = await req('admin/users?limit=5', { token });
    expect(Array.isArray(users.body), 'admin users list');
    expect(users.body.length > 0, 'admin users has rows');

    await req(`admin/users/${me.body.id}/status`, {
      method: 'PATCH',
      token,
      body: { is_active: true },
    });

    const dashboard = await req('admin/dashboard/summary', { token });
    expect(typeof dashboard.body?.totalOrders === 'number', 'dashboard summary shape');

    const beforeStock = Number(targetVariant.stock);
    const bulk = await req('admin/variants/bulk-stock', {
      method: 'POST',
      token,
      body: {
        items: [{ variantId: targetVariant.id, stock: beforeStock, reason: 'smoke_check' }],
      },
    });
    expect(bulk.body?.updatedCount >= 0, 'bulk stock endpoint');

    const proc = await req(`admin/orders/${placed.body.id}/status`, {
      method: 'PATCH',
      token,
      body: { status: 'processing', note: 'Đã pick hàng' },
    });
    expect(proc.body?.status === 'processing', 'transition pending->processing');

    const cancelled = await req(`admin/orders/${placed.body.id}/status`, {
      method: 'PATCH',
      token,
      body: { status: 'cancelled', note: 'Khách đổi ý' },
    });
    expect(cancelled.body?.status === 'cancelled', 'transition processing->cancelled');
    console.log('✓ admin transition, users/promo/dashboard/bulk-stock hoàn thành');
  } else {
    const cancelled = await req(`orders/${placed.body.id}/cancel`, {
      method: 'POST',
      token,
      body: {},
    });
    expect(cancelled.body?.status === 'cancelled', 'user cancel khi pending');
    console.log('✓ user huỷ đơn pending thành công');
  }

  await req('auth/logout', { method: 'POST', token, body: {} });
  console.log('✓ logout OK');
  console.log('SMOKE PASS');
}

main().catch((e) => {
  console.error('FAIL:', e.message || e);
  process.exit(1);
});
