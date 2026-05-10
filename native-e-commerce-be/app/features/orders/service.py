from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.db.models import (
    Address,
    Order,
    OrderItem,
    OrderTimeline,
    PaymentMethod,
    PromoCode,
    PromoRedemption,
    Product,
    ProductVariant,
)
from app.features.orders.schemas import OrderCreateIn

# Quy tắc transition status hợp lệ — chuẩn hóa lifecycle.
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"processing", "cancelled"},
    "processing": {"shipped", "cancelled"},
    # Đang giao thì KHÔNG cho hủy, chỉ có thể hoàn tất giao.
    "shipped": {"delivered"},
    "delivered": set(),
    "cancelled": set(),
}

STATUS_LABELS: dict[str, str] = {
    "pending": "Order Placed",
    "processing": "Processing",
    "shipped": "Shipped",
    "delivered": "Delivered",
    "cancelled": "Cancelled",
}


def _payment_title(db: Session, store_id: int, code: str) -> str:
    pm = db.execute(
        select(PaymentMethod.title).where(
            PaymentMethod.store_id == store_id,
            PaymentMethod.code == code,
        )
    ).scalar_one_or_none()
    return pm or code


def list_order_summaries(
    db: Session, store_id: int, user_id: str, *, status: str | None
) -> list[dict]:
    q = (
        select(Order)
        .where(Order.store_id == store_id, Order.user_id == user_id)
        .order_by(Order.placed_at.desc())
    )
    if status:
        q = q.where(Order.status == status)  # type: ignore[comparison-overlap]
    orders = db.execute(q).scalars().all()
    ids = [o.id for o in orders]
    if not ids:
        return []
    count_rows = db.execute(
        select(OrderItem.order_id, func.coalesce(func.sum(OrderItem.quantity), 0)).where(
            OrderItem.order_id.in_(ids)
        ).group_by(OrderItem.order_id)
    ).all()
    counts = {oid: int(c) for oid, c in count_rows}
    return [
        {
            "id": o.id,
            "code": o.code,
            "date": o.placed_at.replace(tzinfo=timezone.utc).isoformat(),
            "status": str(o.status),
            "total": float(o.total),
            "itemCount": counts.get(o.id, 0),
        }
        for o in orders
    ]


def get_order_detail(db: Session, store_id: int, user_id: str | None, order_id: str) -> dict | None:
    cond = [Order.id == order_id, Order.store_id == store_id]
    if user_id is not None:
        cond.append(Order.user_id == user_id)
    o = db.execute(select(Order).where(*cond)).scalar_one_or_none()
    if o is None:
        return None

    lines = db.execute(
        select(OrderItem).where(OrderItem.order_id == o.id).order_by(OrderItem.created_at)
    ).scalars().all()
    timelines = db.execute(
        select(OrderTimeline)
        .where(OrderTimeline.order_id == o.id)
        .order_by(OrderTimeline.position, OrderTimeline.happened_at)
    ).scalars().all()

    pm_label = _payment_title(db, store_id, o.payment_method_code)
    estimated = ""
    if o.estimated_delivery_at:
        estimated = o.estimated_delivery_at.replace(tzinfo=timezone.utc).isoformat()

    return {
        "id": o.id,
        "code": o.code,
        "date": o.placed_at.replace(tzinfo=timezone.utc).isoformat(),
        "status": str(o.status),
        "subtotal": float(o.subtotal),
        "shippingFee": float(o.shipping_fee),
        "discountTotal": float(o.discount_total),
        "total": float(o.total),
        "paymentStatus": str(o.payment_status),
        "items": [
            {
                "id": li.id,
                "productId": li.product_id,
                "variantId": li.variant_id,
                "name": li.name_snapshot,
                "price": float(li.unit_price),
                "quantity": li.quantity,
                "image": li.image_snapshot,
                "size": (li.variant_attrs_snapshot or {}).get("size"),
                "color": (li.variant_attrs_snapshot or {}).get("color"),
                "sku": li.sku_snapshot,
            }
            for li in lines
        ],
        "shippingAddress": {
            "name": o.ship_name,
            "phone": o.ship_phone,
            "address": o.ship_address,
            "city": o.ship_city,
        },
        "paymentMethod": pm_label,
        "paymentMethodCode": o.payment_method_code,
        "tracking": o.tracking_number or "",
        "estimatedDelivery": estimated,
        "timeline": [
            {
                "status": t.status_label,
                "code": str(t.status_code) if t.status_code is not None else None,
                "date": t.happened_at.replace(tzinfo=timezone.utc).isoformat(),
                "completed": t.completed,
            }
            for t in timelines
        ],
    }


def _calc_shipping_fee(subtotal: Decimal) -> Decimal:
    """Phí ship đơn giản, chuẩn hóa server-side để FE không thể giả mạo.

    - Free ship khi subtotal >= 1.500.000 VND.
    - Mặc định 30.000 VND.
    """
    if subtotal >= Decimal("1500000"):
        return Decimal("0")
    return Decimal("30000")


def create_order(db: Session, store_id: int, user_id: str, payload: OrderCreateIn) -> dict:
    addr = db.execute(
        select(Address).where(
            Address.id == payload.shipping_address_id,
            Address.store_id == store_id,
            Address.user_id == user_id,
            Address.deleted_at.is_(None),
        )
    ).scalar_one_or_none()
    if addr is None:
        raise AppError("bad_request", "Invalid shipping address", status_code=400)

    pm = db.execute(
        select(PaymentMethod).where(
            PaymentMethod.store_id == store_id,
            PaymentMethod.code == payload.payment_method_code,
            PaymentMethod.enabled.is_(True),
        )
    ).scalar_one_or_none()
    if pm is None:
        raise AppError("bad_request", "Invalid payment method for this store", status_code=400)

    lines: list[dict] = []
    subtotal = Decimal("0")
    now = datetime.now(timezone.utc)

    try:
        for ln in payload.items:
            prod = db.execute(
                select(Product)
                .where(
                    Product.store_id == store_id,
                    Product.id == ln.product_id,
                    Product.deleted_at.is_(None),
                    Product.is_active.is_(True),
                )
                .with_for_update()
            ).scalar_one_or_none()
            if prod is None:
                raise AppError("bad_request", f"Unknown product {ln.product_id}", status_code=400)

            variant: ProductVariant | None = None
            if ln.variant_id:
                variant = db.execute(
                    select(ProductVariant)
                    .where(
                        ProductVariant.store_id == store_id,
                        ProductVariant.product_id == ln.product_id,
                        ProductVariant.id == ln.variant_id,
                        ProductVariant.deleted_at.is_(None),
                    )
                    .with_for_update()
                ).scalar_one_or_none()
                if variant is None:
                    raise AppError(
                        "bad_request",
                        f"Unknown variant {ln.variant_id} for product {ln.product_id}",
                        status_code=400,
                    )

            qty_int = ln.quantity
            if qty_int <= 0:
                raise AppError("bad_request", "Quantity must be positive", status_code=400)

            if variant is not None:
                if variant.stock < qty_int:
                    raise AppError(
                        "out_of_stock",
                        f"Hết size/biến thể cho sản phẩm {prod.name}.",
                        status_code=409,
                        details={
                            "productId": prod.id,
                            "variantId": variant.id,
                            "availableStock": variant.stock,
                            "requestedQuantity": qty_int,
                        },
                    )
            else:
                if prod.total_stock < qty_int:
                    raise AppError(
                        "out_of_stock",
                        f"Hết hàng cho sản phẩm {prod.name}.",
                        status_code=409,
                        details={
                            "productId": prod.id,
                            "availableStock": prod.total_stock,
                            "requestedQuantity": qty_int,
                        },
                    )

            master = prod.sale_price if prod.sale_price is not None else prod.base_price
            master_f = Decimal(str(master))
            if variant is not None:
                unit = Decimal(str(variant.price)) if variant.price is not None else master_f
                sku = variant.sku
                image = variant.image or prod.default_image
                attrs = {"color": variant.color, "size": variant.size}
            else:
                unit = master_f
                sku = prod.id
                image = prod.default_image
                attrs = {}

            if unit <= 0:
                raise AppError("bad_request", "Invalid unit price", status_code=400)

            qty = Decimal(qty_int)
            line_total = (unit * qty).quantize(Decimal("0.01"))
            subtotal += line_total

            # Trừ tồn kho ngay khi đã lock — DB CHECK chặn âm.
            if variant is not None:
                variant.stock = variant.stock - qty_int
            prod.total_stock = max(0, prod.total_stock - qty_int)

            lines.append(
                {
                    "product_id": prod.id,
                    "variant_id": variant.id if variant else None,
                    "name": prod.name,
                    "image": image,
                    "sku": sku,
                    "attrs": attrs or None,
                    "unit": unit,
                    "qty": qty_int,
                    "line_total": line_total,
                }
            )

        ship = _calc_shipping_fee(subtotal)
        disc = Decimal("0")
        promo_id: str | None = None
        if payload.promo_code:
            promo = db.execute(
                select(PromoCode)
                .where(
                    PromoCode.store_id == store_id,
                    PromoCode.code == payload.promo_code.strip().upper(),
                    PromoCode.is_active.is_(True),
                )
                .with_for_update()
            ).scalar_one_or_none()
            if promo is None:
                raise AppError("bad_request", "Promo code không hợp lệ", status_code=400)
            now_ts = now
            if promo.starts_at and promo.starts_at > now_ts:
                raise AppError("bad_request", "Promo code chưa bắt đầu", status_code=400)
            if promo.ends_at and promo.ends_at < now_ts:
                raise AppError("bad_request", "Promo code đã hết hạn", status_code=400)
            if promo.usage_limit is not None and promo.used_count >= promo.usage_limit:
                raise AppError("bad_request", "Promo code đã hết lượt sử dụng", status_code=400)
            if subtotal < Decimal(str(promo.min_order_total)):
                raise AppError("bad_request", "Đơn chưa đạt giá trị tối thiểu để áp mã", status_code=400)
            if str(promo.discount_type) == "percent":
                disc = (subtotal * Decimal(str(promo.discount_value)) / Decimal("100")).quantize(Decimal("0.01"))
            else:
                disc = Decimal(str(promo.discount_value))
            if promo.max_discount is not None:
                disc = min(disc, Decimal(str(promo.max_discount)))
            disc = max(Decimal("0"), min(disc, subtotal + ship))
            promo.used_count = promo.used_count + 1
            promo_id = promo.id
        total = subtotal + ship - disc
        if total < 0:
            raise AppError("bad_request", "Negative order total", status_code=400)

        oid = str(uuid.uuid4())
        code = f"ORD-{now.strftime('%Y%m%d%H%M%S')}-{oid.split('-')[0].upper()}"

        order = Order(
            id=oid,
            store_id=store_id,
            user_id=user_id,
            code=code,
            status="pending",
            placed_at=now,
            subtotal=subtotal,
            shipping_fee=ship,
            discount_total=disc,
            total=total,
            currency="VND",
            payment_method_code=payload.payment_method_code,
            payment_status="unpaid",
            ship_name=addr.name,
            ship_phone=addr.phone,
            ship_address=addr.address,
            ship_city=addr.city,
            ship_address_id=addr.id,
            tracking_number=None,
            estimated_delivery_at=now + timedelta(days=7),
            notes=None,
        )
        db.add(order)
        db.flush()

        for li in lines:
            item = OrderItem(
                id=str(uuid.uuid4()),
                store_id=store_id,
                order_id=oid,
                product_id=li["product_id"],
                variant_id=li["variant_id"],
                name_snapshot=li["name"],
                image_snapshot=li["image"],
                sku_snapshot=li["sku"],
                variant_attrs_snapshot=li["attrs"],
                unit_price=li["unit"],
                quantity=li["qty"],
                line_total=li["line_total"],
            )
            db.add(item)

        t1 = OrderTimeline(
            id=str(uuid.uuid4()),
            store_id=store_id,
            order_id=oid,
            status_label=STATUS_LABELS["pending"],
            status_code="pending",
            happened_at=now,
            completed=True,
            position=0,
        )
        db.add(t1)
        if promo_id is not None:
            db.add(
                PromoRedemption(
                    id=str(uuid.uuid4()),
                    store_id=store_id,
                    promo_id=promo_id,
                    order_id=oid,
                    discount_applied=disc,
                )
            )
        db.commit()
    except AppError:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

    detail = get_order_detail(db, store_id, user_id, oid)
    assert detail is not None
    return detail

def _finalize_paid_wallet_order(
    db: Session,
    store_id: int,
    order: Order,
    *,
    vnp_response_code: str = "00",
) -> dict:
    """Chuyển đơn wallet sang paid + pending→processing + timeline (idempotent nếu đã paid)."""
    now = datetime.now(timezone.utc)
    order_id = order.id
    if str(order.payment_status) == "paid":
        db.rollback()
        detail = get_order_detail(db, store_id, None, order_id)
        assert detail is not None
        return {
            "status": "success",
            "message": "Thanh toán thành công",
            "orderId": order_id,
            "vnpResponseCode": vnp_response_code,
            "paymentStatus": "paid",
            "orderCode": detail["code"],
        }

    order.payment_status = "paid"
    new_timeline_status = str(order.status)
    if new_timeline_status == "pending":
        order.status = "processing"
        new_timeline_status = "processing"

    next_pos = db.execute(
        select(func.coalesce(func.max(OrderTimeline.position), -1) + 1).where(
            OrderTimeline.order_id == order.id
        )
    ).scalar_one()
    timeline = OrderTimeline(
        id=str(uuid.uuid4()),
        store_id=store_id,
        order_id=order.id,
        status_label=STATUS_LABELS.get(new_timeline_status, new_timeline_status),
        status_code=new_timeline_status,
        happened_at=now,
        completed=True,
        position=int(next_pos or 0),
    )
    db.add(timeline)
    db.commit()

    detail = get_order_detail(db, store_id, None, order_id)
    assert detail is not None
    return {
        "status": "success",
        "message": "Thanh toán thành công",
        "orderId": order_id,
        "vnpResponseCode": vnp_response_code,
        "paymentStatus": str(order.payment_status),
        "orderCode": detail["code"],
    }


def mark_order_paid_mock(db: Session, store_id: int, user_id: str, order_id: str) -> dict:
    """Ghi nhận thanh toán mô phỏng cho flow VietQR.

    - Idempotent: nếu đơn đã paid thì trả lại detail hiện tại.
    - Nếu đơn vẫn pending, đưa sang processing để phản ánh trạng thái hậu thanh toán.
    """
    order = db.execute(
        select(Order).where(
            Order.id == order_id,
            Order.store_id == store_id,
            Order.user_id == user_id,
        ).with_for_update()
    ).scalar_one_or_none()
    if order is None:
        raise AppError("not_found", "Order not found", status_code=404)
    if str(order.status) == "cancelled":
        db.rollback()
        raise AppError("bad_request", "Order was cancelled", status_code=409)

    now = datetime.now(timezone.utc)
    if str(order.payment_status) != "paid":
        order.payment_status = "paid"
        if str(order.status) == "pending":
            order.status = "processing"

            next_pos = db.execute(
                select(func.coalesce(func.max(OrderTimeline.position), -1) + 1).where(
                    OrderTimeline.order_id == order.id
                )
            ).scalar_one()
            db.add(
                OrderTimeline(
                    id=str(uuid.uuid4()),
                    store_id=store_id,
                    order_id=order.id,
                    status_label=STATUS_LABELS["processing"],
                    status_code="processing",
                    happened_at=now,
                    completed=True,
                    position=int(next_pos or 0),
                )
            )

        db.commit()

    detail = get_order_detail(db, store_id, user_id, order_id)
    assert detail is not None
    return {
        "status": "success",
        "message": "Thanh toán đã được ghi nhận",
        "orderId": order.id,
        "orderCode": detail["code"],
        "statusCode": str(order.status),
        "paymentStatus": str(order.payment_status),
    }


def mock_vnpay_success_demo(db: Session, store_id: int, user_id: str, order_id: str) -> dict:
    """Đồ án / demo: ghi nhận paid không xác thực callback VNPAY (chỉ gọi khi API bật VNPAY_ALLOW_MOCK)."""
    out = mark_order_paid_mock(db, store_id, user_id, order_id)
    out["demo"] = True
    out["message"] = "Demo: đã ghi nhận thanh toán (không xác thực VNPAY)"
    return out




def update_order_status(
    db: Session,
    store_id: int,
    order_id: str,
    *,
    new_status: str,
    actor_user_id: str,
    user_id_filter: str | None = None,
    note: str | None = None,
    tracking_number: str | None = None,
) -> dict:
    """Đổi trạng thái đơn hàng theo state machine + ghi timeline.

    - Nếu cancel sau khi đã trừ kho thì hoàn kho.
    - `user_id_filter` để route customer chỉ cancel đơn của chính mình.
    """
    if new_status not in ALLOWED_TRANSITIONS:
        raise AppError("bad_request", f"Unknown status {new_status}", status_code=400)

    cond = [Order.id == order_id, Order.store_id == store_id]
    if user_id_filter is not None:
        cond.append(Order.user_id == user_id_filter)

    order = db.execute(select(Order).where(*cond).with_for_update()).scalar_one_or_none()
    if order is None:
        raise AppError("not_found", "Order not found", status_code=404)

    current = str(order.status)
    if current == new_status:
        return get_order_detail(db, store_id, None, order_id)  # type: ignore[return-value]

    if new_status not in ALLOWED_TRANSITIONS.get(current, set()):
        raise AppError(
            "bad_transition",
            f"Cannot transition from {current} to {new_status}",
            status_code=409,
            details={"from": current, "to": new_status},
        )

    now = datetime.now(timezone.utc)

    try:
        # Chỉ hoàn kho khi hủy từ pending/processing.
        if new_status == "cancelled" and current in {"pending", "processing"}:
            items = db.execute(
                select(OrderItem).where(
                    OrderItem.order_id == order.id,
                    OrderItem.store_id == store_id,
                )
            ).scalars().all()
            for it in items:
                if it.variant_id:
                    v = db.execute(
                        select(ProductVariant)
                        .where(
                            ProductVariant.store_id == store_id,
                            ProductVariant.id == it.variant_id,
                        )
                        .with_for_update()
                    ).scalar_one_or_none()
                    if v is not None:
                        v.stock = v.stock + it.quantity
                if it.product_id:
                    p = db.execute(
                        select(Product)
                        .where(Product.store_id == store_id, Product.id == it.product_id)
                        .with_for_update()
                    ).scalar_one_or_none()
                    if p is not None:
                        p.total_stock = p.total_stock + it.quantity

        order.status = new_status
        if new_status == "cancelled":
            order.cancelled_at = now
        if new_status == "shipped" and tracking_number:
            order.tracking_number = tracking_number
        if new_status == "delivered":
            order.payment_status = "paid"

        next_pos = db.execute(
            select(func.coalesce(func.max(OrderTimeline.position), -1) + 1).where(
                OrderTimeline.order_id == order.id
            )
        ).scalar_one()
        timeline = OrderTimeline(
            id=str(uuid.uuid4()),
            store_id=store_id,
            order_id=order.id,
            status_label=note or STATUS_LABELS.get(new_status, new_status),
            status_code=new_status,
            happened_at=now,
            completed=True,
            position=int(next_pos or 0),
        )
        db.add(timeline)
        db.commit()
    except Exception:
        db.rollback()
        raise

    detail = get_order_detail(db, store_id, None, order_id)
    assert detail is not None
    detail["_actor"] = actor_user_id  # type: ignore[index]
    detail.pop("_actor", None)
    return detail


def list_orders_admin(
    db: Session,
    store_id: int,
    *,
    status: str | None,
    payment_status: str | None,
    code: str | None,
    receiver: str | None,
    from_date: datetime | None,
    to_date: datetime | None,
    limit: int,
    offset: int,
) -> list[dict]:
    q = (
        select(Order)
        .where(Order.store_id == store_id)
        .order_by(Order.placed_at.desc())
        .offset(offset)
        .limit(limit)
    )
    if status:
        q = q.where(Order.status == status)  # type: ignore[comparison-overlap]
    if payment_status:
        q = q.where(Order.payment_status == payment_status)  # type: ignore[comparison-overlap]
    if code:
        q = q.where(Order.code.ilike(f"%{code}%"))
    if receiver:
        q = q.where(Order.ship_name.ilike(f"%{receiver}%"))
    if from_date:
        q = q.where(Order.placed_at >= from_date)
    if to_date:
        q = q.where(Order.placed_at <= to_date)
    rows = db.execute(q).scalars().all()
    if not rows:
        return []
    ids = [o.id for o in rows]
    count_rows = db.execute(
        select(OrderItem.order_id, func.coalesce(func.sum(OrderItem.quantity), 0))
        .where(OrderItem.order_id.in_(ids))
        .group_by(OrderItem.order_id)
    ).all()
    counts = {oid: int(c) for oid, c in count_rows}
    return [
        {
            "id": o.id,
            "code": o.code,
            "userId": o.user_id,
            "shipName": o.ship_name,
            "date": o.placed_at.replace(tzinfo=timezone.utc).isoformat(),
            "status": str(o.status),
            "paymentStatus": str(o.payment_status),
            "total": float(o.total),
            "itemCount": counts.get(o.id, 0),
        }
        for o in rows
    ]
