from decimal import Decimal

from pydantic import BaseModel, Field


class OrderLineIn(BaseModel):
    product_id: str = Field(alias="productId")
    variant_id: str | None = Field(default=None, alias="variantId")
    quantity: int = Field(ge=1)

    model_config = {"populate_by_name": True}


class OrderCreateIn(BaseModel):
    items: list[OrderLineIn] = Field(min_length=1)
    shipping_address_id: str = Field(alias="shippingAddressId")
    payment_method_code: str = Field(alias="paymentMethod")
    promo_code: str | None = Field(default=None, alias="promoCode")
    shipping_fee: Decimal = Field(default=Decimal("0"), alias="shippingFee")
    discount_total: Decimal = Field(default=Decimal("0"), alias="discountTotal")
    note: str | None = Field(default=None, max_length=500)

    model_config = {"populate_by_name": True}


class OrderStatusUpdateIn(BaseModel):
    status: str = Field(description="processing | shipped | delivered | cancelled")
    note: str | None = Field(default=None, max_length=200)
    tracking_number: str | None = Field(default=None, alias="trackingNumber", max_length=120)

    model_config = {"populate_by_name": True}


class OrderCancelIn(BaseModel):
    """Body tùy chọn cho khách huỷ đơn (không cần gửi ``status`` — server luôn huỷ)."""

    note: str | None = Field(default=None, max_length=200)

    model_config = {"populate_by_name": True}


class CreatePaymentUrlIn(BaseModel):
    """Tạo URL thanh toán VNPay Sandbox — số tiền luôn lấy từ đơn hàng trên server."""

    order_id: str = Field(alias="orderId")
    return_url: str = Field(alias="returnUrl")

    model_config = {"populate_by_name": True}
