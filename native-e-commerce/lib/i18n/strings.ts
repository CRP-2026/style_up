import type { AppLocale } from './locale';

type Sheet = {
  common: {
    ok: string;
    cancel: string;
    delete: string;
    success: string;
    retry: string;
    login: string;
    error: string;
    loading: string;
  };
  errors: {
    generic: string;
    loginFailed: string;
    signupFailed: string;
    missingFields: string;
    enterEmailPassword: string;
    accountInactive: string;
    unauthorizedLogin: string;
    validationLogin: string;
    validationSignup: string;
    conflictEmail: string;
    orderFailed: string;
    addressSaveFailed: string;
    productLoadFailed: string;
    orderLoadFailed: string;
    homeLoadFailed: string;
    orderNeedLoginTitle: string;
    orderNeedLoginBody: string;
    checkoutNeedLoginTitle: string;
    checkoutNeedLoginBody: string;
    checkoutNeedAddressTitle: string;
    checkoutNeedAddressBody: string;
    addressMissingTitle: string;
    addressMissingBody: string;
    signupMissingName: string;
    signupMissingEmail: string;
    signupBadPassword: string;
    signupPasswordMismatch: string;
    logoutFailedTitle: string;
    logoutFailedBody: string;
    signupSuccessTitle: string;
    signupSuccessBody: string;
    checkoutConfirmTitle: string;
    checkoutConfirmPlace: string;
  };
  empty: {
    cartTitle: string;
    cartHint: string;
    cartContinue: string;
    checkoutCart: string;
    checkoutBackShop: string;
    ordersTitle: string;
    ordersHint: string;
    ordersBackShop: string;
  };
  orders: {
    loginBanner: string;
    loginCta: string;
    filterAll: string;
    filterPending: string;
    filterProcessing: string;
    filterShipped: string;
    filterDelivered: string;
    filterCancelled: string;
    detailNotFoundTitle: string;
    detailNotFoundHint: string;
    detailGoBack: string;
  };
  cart: {
    addressLoginPrompt: string;
    addressBookPrompt: string;
    addSuccess: string;
    removeConfirmTitle: string;
    removeConfirmBody: string;
    removeSuccess: string;
  };
  checkout: {
    successTitle: string;
    successMessage: string;
    orderId: string;
    nextSteps: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    viewOrder: string;
    continueShopping: string;
    failureTitle: string;
    failureMessage: string;
    troubleshoot: string;
    troubleshoot1: string;
    troubleshoot2: string;
    troubleshoot3: string;
    retryCheckout: string;
    backToCart: string;
  };
  account: {
    screenTitle: string;
    bioFallback: string;
    setupPrompt: string;
    inactiveBanner: string;
    profileSection: string;
    rowName: string;
    rowEmail: string;
    rowPhone: string;
    rowBio: string;
    rowRole: string;
    rowStatus: string;
    statusActive: string;
    statusInactive: string;
    loginTitle: string;
    loginSubtitle: string;
    loginCta: string;
    loadError: string;
    logout: string;
    logoutConfirmTitle: string;
    logoutConfirmBody: string;
    editProfile: string;
  };
  roles: Record<'user' | 'staff' | 'admin', string>;
};

const VI: Sheet = {
  common: {
    ok: 'OK',
    cancel: 'Hủy',
    delete: 'Xoá',
    success: 'Thành công',
    retry: 'Thử lại',
    login: 'Đăng nhập',
    error: 'Lỗi',
    loading: 'Đang tải…',
  },
  errors: {
    generic: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    loginFailed: 'Đăng nhập thất bại.',
    signupFailed: 'Đăng ký thất bại.',
    missingFields: 'Thiếu thông tin',
    enterEmailPassword: 'Nhập email và mật khẩu.',
    accountInactive: 'Tài khoản đã bị dừng hoạt động.',
    unauthorizedLogin: 'Email hoặc mật khẩu không đúng.',
    validationLogin: 'Dữ liệu đăng nhập không hợp lệ. Kiểm tra lại email và mật khẩu.',
    validationSignup: 'Thông tin đăng ký không hợp lệ. Kiểm tra lại các trường.',
    conflictEmail: 'Email này đã được đăng ký.',
    orderFailed: 'Đặt hàng thất bại.',
    addressSaveFailed: 'Không lưu được địa chỉ.',
    productLoadFailed: 'Không tải được sản phẩm.',
    orderLoadFailed: 'Không tải được đơn hàng.',
    homeLoadFailed: 'Không tải được danh mục hoặc sản phẩm. Kiểm tra API.',
    orderNeedLoginTitle: 'Cần đăng nhập',
    orderNeedLoginBody: 'Đăng nhập để xem đơn hàng của bạn.',
    checkoutNeedLoginTitle: 'Cần đăng nhập',
    checkoutNeedLoginBody: 'Đăng nhập để đặt hàng và quản lý địa chỉ.',
    checkoutNeedAddressTitle: 'Địa chỉ',
    checkoutNeedAddressBody: 'Thêm địa chỉ giao hàng trước.',
    addressMissingTitle: 'Thiếu thông tin',
    addressMissingBody: 'Điền đầy đủ các trường bắt buộc.',
    signupMissingName: 'Nhập họ tên.',
    signupMissingEmail: 'Nhập email.',
    signupBadPassword: 'Mật khẩu tối thiểu 6 ký tự.',
    signupPasswordMismatch: 'Mật khẩu xác nhận không khớp.',
    logoutFailedTitle: 'Đăng xuất',
    logoutFailedBody: 'Không gọi được máy chủ; phiên trên máy vẫn đã được xóa.',
    signupSuccessTitle: 'Đăng ký thành công',
    signupSuccessBody: 'Tài khoản đã được tạo. Bạn đã được đăng nhập.',
    checkoutConfirmTitle: 'Xác nhận đơn hàng',
    checkoutConfirmPlace: 'Đặt hàng',
  },
  empty: {
    cartTitle: 'Giỏ hàng của bạn đang trống.',
    cartHint: 'Thêm sản phẩm từ cửa hàng.',
    cartContinue: 'Tiếp tục mua sắm',
    checkoutCart: 'Giỏ hàng trống — không thể thanh toán.',
    checkoutBackShop: 'Về cửa hàng',
    ordersTitle: 'Chưa có đơn hàng',
    ordersHint: 'Chưa có đơn trong trạng thái này.',
    ordersBackShop: 'Về cửa hàng',
  },
  orders: {
    loginBanner: 'Đăng nhập để xem đơn hàng của bạn.',
    loginCta: 'Đăng nhập',
    filterAll: 'Tất cả',
    filterPending: 'Chờ xử lý',
    filterProcessing: 'Đang xử lý',
    filterShipped: 'Đang giao',
    filterDelivered: 'Đã giao',
    filterCancelled: 'Đã hủy',
    detailNotFoundTitle: 'Không tìm thấy đơn',
    detailNotFoundHint: 'Kiểm tra mã đơn và thử lại.',
    detailGoBack: 'Quay lại',
  },
  cart: {
    addressLoginPrompt: 'Đăng nhập để tải địa chỉ.',
    addressBookPrompt: 'Thêm địa chỉ — Sổ địa chỉ hoặc thanh toán.',
    addSuccess: 'Thêm vào giỏ thành công',
    removeConfirmTitle: 'Xoá sản phẩm?',
    removeConfirmBody: 'Bạn có chắc chắn muốn xoá sản phẩm này khỏi giỏ hàng?',
    removeSuccess: 'Đã xoá khỏi giỏ hàng',
  },
  checkout: {
    successTitle: 'Đơn hàng đã được tạo!',
    successMessage: 'Cảm ơn bạn. Chúng tôi sẽ xử lý đơn hàng của bạn sớm.',
    orderId: 'Mã đơn hàng',
    nextSteps: 'Các bước tiếp theo',
    step1Title: 'Đơn hàng xác nhận',
    step1Desc: 'Chúng tôi đang chuẩn bị đơn hàng của bạn.',
    step2Title: 'Đang giao',
    step2Desc: 'Chúng tôi sẽ thông báo khi đơn hàng được gửi đi.',
    step3Title: 'Đã giao',
    step3Desc: 'Theo dõi đơn hàng của bạn bất cứ lúc nào.',
    viewOrder: 'Xem chi tiết đơn hàng',
    continueShopping: 'Tiếp tục mua sắm',
    failureTitle: 'Đơn hàng thất bại',
    failureMessage: 'Có lỗi khi xử lý đơn hàng của bạn. Vui lòng thử lại.',
    troubleshoot: 'Hướng dẫn khắc phục',
    troubleshoot1: 'Kiểm tra lại thông tin thanh toán của bạn',
    troubleshoot2: 'Đảm bảo tài khoản có đủ tiền',
    troubleshoot3: 'Liên hệ hỗ trợ nếu vấn đề vẫn tiếp diễn',
    retryCheckout: 'Thử lại',
    backToCart: 'Quay lại giỏ hàng',
  },
  account: {
    screenTitle: 'Tài khoản',
    bioFallback: 'Chưa có tiểu sử',
    setupPrompt: 'Cập nhật hồ sơ',
    inactiveBanner: 'Tài khoản đang bị dừng hoạt động.',
    profileSection: 'Thông tin',
    rowName: 'Tên',
    rowEmail: 'Email',
    rowPhone: 'Số điện thoại',
    rowBio: 'Tiểu sử',
    rowRole: 'Vai trò',
    rowStatus: 'Trạng thái',
    statusActive: 'Đang hoạt động',
    statusInactive: 'Đã dừng',
    loginTitle: 'Chưa đăng nhập',
    loginSubtitle: 'Đăng nhập để xem hồ sơ và đồng bộ địa chỉ.',
    loginCta: 'Đăng nhập',
    loadError: 'Không tải được hồ sơ.',
    logout: 'Đăng xuất',
    logoutConfirmTitle: 'Đăng xuất?',
    logoutConfirmBody: 'Bạn sẽ cần đăng nhập lại để dùng địa chỉ và đơn hàng.',
    editProfile: 'Sửa hồ sơ',
  },
  roles: {
    user: 'Khách hàng',
    staff: 'Nhân viên',
    admin: 'Quản trị',
  },
};

const EN: Sheet = {
  common: {
    ok: 'OK',
    cancel: 'Cancel',    delete: 'Delete',
    success: 'Success',    retry: 'Retry',
    login: 'Log in',
    error: 'Error',
    loading: 'Loading…',
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
    loginFailed: 'Sign-in failed.',
    signupFailed: 'Sign-up failed.',
    missingFields: 'Missing information',
    enterEmailPassword: 'Enter email and password.',
    accountInactive: 'This account has been suspended.',
    unauthorizedLogin: 'Invalid email or password.',
    validationLogin: 'Invalid sign-in data. Check email and password.',
    validationSignup: 'Invalid sign-up data. Check all fields.',
    conflictEmail: 'This email is already registered.',
    orderFailed: 'Could not place order.',
    addressSaveFailed: 'Could not save address.',
    productLoadFailed: 'Could not load product.',
    orderLoadFailed: 'Could not load order.',
    homeLoadFailed: 'Could not load catalog or products. Check API.',
    orderNeedLoginTitle: 'Sign in required',
    orderNeedLoginBody: 'Sign in to view your orders.',
    checkoutNeedLoginTitle: 'Sign in required',
    checkoutNeedLoginBody: 'Sign in to place orders and manage addresses.',
    checkoutNeedAddressTitle: 'Address',
    checkoutNeedAddressBody: 'Add a shipping address first.',
    addressMissingTitle: 'Missing information',
    addressMissingBody: 'Please fill all required fields.',
    signupMissingName: 'Enter your name.',
    signupMissingEmail: 'Enter your email.',
    signupBadPassword: 'Password must be at least 6 characters.',
    signupPasswordMismatch: 'Passwords do not match.',
    logoutFailedTitle: 'Sign out',
    logoutFailedBody: 'Server request failed; local session was still cleared.',
    signupSuccessTitle: 'Welcome!',
    signupSuccessBody: 'Your account was created and you are signed in.',
    checkoutConfirmTitle: 'Confirm order',
    checkoutConfirmPlace: 'Place order',
  },
  empty: {
    cartTitle: 'Your cart is empty.',
    cartHint: 'Add items from the shop.',
    cartContinue: 'Continue shopping',
    checkoutCart: 'Your cart is empty — checkout is unavailable.',
    checkoutBackShop: 'Back to shop',
    ordersTitle: 'No orders yet',
    ordersHint: 'No orders in this status yet.',
    ordersBackShop: 'Back to shop',
  },
  orders: {
    loginBanner: 'Sign in to view your orders.',
    loginCta: 'Log in',
    filterAll: 'All',
    filterPending: 'Pending',
    filterProcessing: 'Processing',
    filterShipped: 'Shipped',
    filterDelivered: 'Delivered',
    filterCancelled: 'Cancelled',
    detailNotFoundTitle: 'Order not found',
    detailNotFoundHint: 'Check the order id and try again.',
    detailGoBack: 'Go back',
  },
  cart: {
    addressLoginPrompt: 'Sign in to load your addresses.',
    addressBookPrompt: 'Add an address — Address book or checkout.',
    addSuccess: 'Added to cart',
    removeConfirmTitle: 'Remove item?',
    removeConfirmBody: 'Are you sure you want to remove this item from your cart?',
    removeSuccess: 'Removed from cart',
  },
  checkout: {
    successTitle: 'Order Placed!',
    successMessage: 'Thank you. We will process your order soon.',
    orderId: 'Order ID',
    nextSteps: 'What Happens Next',
    step1Title: 'Order Confirmed',
    step1Desc: 'We are preparing your order.',
    step2Title: 'Shipped',
    step2Desc: 'We will notify you when it ships.',
    step3Title: 'Delivered',
    step3Desc: 'Track your order at any time.',
    viewOrder: 'View Order Details',
    continueShopping: 'Continue Shopping',
    failureTitle: 'Order Failed',
    failureMessage: 'There was an error processing your order. Please try again.',
    troubleshoot: 'Troubleshooting',
    troubleshoot1: 'Check your payment details and try again',
    troubleshoot2: 'Ensure sufficient funds are available',
    troubleshoot3: 'Contact support if the issue persists',
    retryCheckout: 'Try Again',
    backToCart: 'Back to Cart',
  },
  account: {
    screenTitle: 'Account',
    bioFallback: 'No bio yet',
    setupPrompt: 'Complete your profile',
    inactiveBanner: 'This account is suspended.',
    profileSection: 'Profile',
    rowName: 'Name',
    rowEmail: 'Email',
    rowPhone: 'Phone',
    rowBio: 'Bio',
    rowRole: 'Role',
    rowStatus: 'Status',
    statusActive: 'Active',
    statusInactive: 'Suspended',
    loginTitle: 'Not signed in',
    loginSubtitle: 'Sign in to view your profile and sync addresses.',
    loginCta: 'Log in',
    loadError: 'Could not load profile.',
    logout: 'Log out',
    logoutConfirmTitle: 'Log out?',
    logoutConfirmBody: 'You will need to sign in again to use addresses and orders.',
    editProfile: 'Edit profile',
  },
  roles: {
    user: 'Customer',
    staff: 'Staff',
    admin: 'Admin',
  },
};

export function strings(locale: AppLocale): Sheet {
  return locale === 'en' ? EN : VI;
}

export function roleLabel(locale: AppLocale, role: string): string {
  const sheet = strings(locale).roles;
  if (role === 'staff') return sheet.staff;
  if (role === 'admin') return sheet.admin;
  return sheet.user;
}
