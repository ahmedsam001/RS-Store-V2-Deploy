import { useEffect, useRef } from "react";
import type { Language } from "@/shared/i18n";

/**
 * Arabic copy used by the admin-only DOM localization bridge.
 *
 * The storefront already uses keyed i18n. Some older admin pages still render
 * literal English copy, so this bridge translates those literals without
 * changing API values, product/customer content, or business logic.
 */
export const ADMIN_ARABIC_TRANSLATIONS: Readonly<Record<string, string>> = {
  Dashboard: "لوحة التحكم",
  "Admin navigation": "تنقل الإدارة",
  Overview: "نظرة عامة",
  Products: "المنتجات",
  Product: "المنتج",
  "Add Product": "إضافة منتج",
  "Edit Product": "تعديل المنتج",
  "Create Product": "إنشاء منتج",
  "Update Product": "تحديث المنتج",
  "Delete Product": "حذف المنتج",
  "Product details": "تفاصيل المنتج",
  "Product name": "اسم المنتج",
  "Product name English": "اسم المنتج بالإنجليزية",
  "Product name Arabic": "اسم المنتج بالعربية",
  Description: "الوصف",
  "English description": "الوصف بالإنجليزية",
  "Arabic description": "الوصف بالعربية",
  Price: "السعر",
  "Original price": "السعر الأصلي",
  "Sale price": "سعر العرض",
  Cost: "التكلفة",
  Stock: "المخزون",
  "In stock": "متوفر",
  "Out of stock": "غير متوفر",
  "Low stock": "مخزون منخفض",
  SKU: "SKU",
  Slug: "الرابط المختصر",
  Status: "الحالة",
  Active: "نشط",
  Inactive: "غير نشط",
  Featured: "مميز",
  Visible: "ظاهر",
  Hidden: "مخفي",
  Published: "منشور",
  Draft: "مسودة",
  Categories: "الأقسام",
  Category: "القسم",
  Subcategory: "القسم الفرعي",
  "All categories": "كل الأقسام",
  "Add Category": "إضافة قسم",
  "Edit Category": "تعديل القسم",
  "Create Category": "إنشاء قسم",
  "Delete Category": "حذف القسم",
  Orders: "الطلبات",
  Order: "الطلب",
  "Order details": "تفاصيل الطلب",
  "Order number": "رقم الطلب",
  "Custom Orders": "الطلبات الخاصة",
  "Custom Order": "طلب خاص",
  "Payments Review": "مراجعة المدفوعات",
  Payment: "الدفع",
  "Payment method": "طريقة الدفع",
  "Payment proof": "إثبات الدفع",
  "Review Payment": "مراجعة الدفعة",
  Approve: "موافقة",
  Approved: "تمت الموافقة",
  Reject: "رفض",
  Rejected: "مرفوض",
  Pending: "قيد الانتظار",
  Processing: "قيد التجهيز",
  Confirmed: "مؤكد",
  Shipped: "تم الشحن",
  Delivered: "تم التسليم",
  Cancelled: "ملغي",
  Refunded: "تم الاسترداد",
  Paid: "مدفوع",
  Unpaid: "غير مدفوع",
  Customer: "العميل",
  "Customer name": "اسم العميل",
  Phone: "الهاتف",
  Email: "البريد الإلكتروني",
  Address: "العنوان",
  City: "المدينة",
  Notes: "ملاحظات",
  Quantity: "الكمية",
  Total: "الإجمالي",
  Subtotal: "الإجمالي الفرعي",
  Discount: "الخصم",
  Shipping: "الشحن",
  "Shipping fee": "رسوم الشحن",
  Reports: "التقارير",
  Sales: "المبيعات",
  Revenue: "الإيرادات",
  Profit: "الربح",
  Analytics: "التحليلات",
  "Flash Sales": "العروض السريعة",
  Marketing: "التسويق",
  "Flash Sale": "عرض سريع",
  "Add Flash Sale": "إضافة عرض سريع",
  "Create Flash Sale": "إنشاء عرض سريع",
  "Edit Flash Sale": "تعديل العرض السريع",
  "Delete Flash Sale": "حذف العرض السريع",
  "Start date": "تاريخ البدء",
  "End date": "تاريخ الانتهاء",
  "Starts at": "يبدأ في",
  "Ends at": "ينتهي في",
  "SHEIN Import": "استيراد شي إن",
  "SHEIN Batches": "دفعات شي إن",
  "Create New SHEIN Batch": "إنشاء دفعة شي إن جديدة",
  Import: "استيراد",
  "Start import": "بدء الاستيراد",
  "Import history": "سجل الاستيراد",
  Marketplace: "السوق",
  Country: "الدولة",
  Language: "اللغة",
  Arabic: "العربية",
  English: "الإنجليزية",
  Currency: "العملة",
  Review: "مراجعة",
  Ready: "جاهز",
  New: "جديد",
  Track: "تتبع",
  Batch: "الدفعة",
  Batches: "الدفعات",
  Uploads: "الملفات المرفوعة",
  Upload: "رفع",
  "Upload image": "رفع صورة",
  "Upload images": "رفع الصور",
  "Choose files": "اختيار الملفات",
  "Remove image": "إزالة الصورة",
  "Primary image": "الصورة الرئيسية",
  Settings: "الإعدادات",
  System: "النظام",
  "Store settings": "إعدادات المتجر",
  "General settings": "الإعدادات العامة",
  "Store name": "اسم المتجر",
  "Store announcement": "إعلان المتجر",
  "Save settings": "حفظ الإعدادات",
  "Audit Logs": "سجل النشاط",
  "Audit log": "سجل النشاط",
  Action: "الإجراء",
  Resource: "المورد",
  Date: "التاريخ",
  Time: "الوقت",
  "Created at": "تاريخ الإنشاء",
  "Updated at": "تاريخ التحديث",
  Search: "بحث",
  "Search...": "بحث...",
  Filter: "تصفية",
  Filters: "عوامل التصفية",
  "Clear filters": "مسح عوامل التصفية",
  All: "الكل",
  Apply: "تطبيق",
  Reset: "إعادة تعيين",
  Refresh: "تحديث",
  Reload: "إعادة تحميل",
  Save: "حفظ",
  "Saving...": "جارٍ الحفظ...",
  Saved: "تم الحفظ",
  Cancel: "إلغاء",
  Close: "إغلاق",
  Create: "إنشاء",
  "Creating...": "جارٍ الإنشاء...",
  Update: "تحديث",
  "Updating...": "جارٍ التحديث...",
  Edit: "تعديل",
  Delete: "حذف",
  "Deleting...": "جارٍ الحذف...",
  Remove: "إزالة",
  Add: "إضافة",
  View: "عرض",
  "View details": "عرض التفاصيل",
  Open: "فتح",
  Back: "رجوع",
  Next: "التالي",
  Previous: "السابق",
  Continue: "متابعة",
  Confirm: "تأكيد",
  Submit: "إرسال",
  Retry: "إعادة المحاولة",
  Done: "تم",
  Yes: "نعم",
  No: "لا",
  None: "لا يوجد",
  Unknown: "غير معروف",
  Optional: "اختياري",
  Required: "مطلوب",
  "Loading...": "جارٍ التحميل...",
  "No results": "لا توجد نتائج",
  "No data": "لا توجد بيانات",
  "No products found": "لم يتم العثور على منتجات",
  "No orders found": "لم يتم العثور على طلبات",
  "Something went wrong": "حدث خطأ ما",
  "An error occurred": "حدث خطأ",
  "Try again": "حاول مرة أخرى",
  "Are you sure?": "هل أنت متأكد؟",
  "This action cannot be undone.": "لا يمكن التراجع عن هذا الإجراء.",
  "Select an option": "اختر خيارًا",
  "Select category": "اختر القسم",
  "Select status": "اختر الحالة",
  "Items per page": "عناصر في الصفحة",
  Page: "صفحة",
  of: "من",
  Showing: "عرض",
  results: "نتائج",
  Name: "الاسم",
  Title: "العنوان",
  Type: "النوع",
  Image: "الصورة",
  Images: "الصور",
  Options: "الخيارات",
  Variants: "المتغيرات",
  Variant: "المتغير",
  "Variant Arabic name": "اسم المتغير بالعربية",
  Color: "اللون",
  Size: "المقاس",
  Value: "القيمة",
  Actions: "الإجراءات",
  Details: "التفاصيل",
  Accept: "قبول",
  Accepted: "مقبول",
  Activate: "تفعيل",
  "Active categories": "الأقسام النشطة",
  "Active Orders": "الطلبات النشطة",
  "Active Pieces": "القطع النشطة",
  "Activity Log": "سجل النشاط",
  "Activity Log Filters": "عوامل تصفية سجل النشاط",
  "Admin Login": "تسجيل دخول الإدارة",
  "Admin login required": "يلزم تسجيل دخول الإدارة",
  "Admin panel error": "خطأ في لوحة الإدارة",
  "Admin Product Settings": "إعدادات المنتج الإدارية",
  "Admin cycle": "دورة عمل الإدارة",
  "Admin image": "صورة الإدارة",
  "Admin note": "ملاحظة الإدارة",
  "Admin notifications from orders and SHEIN imports":
    "إشعارات الإدارة من الطلبات وعمليات استيراد شي إن",
  "All statuses": "كل الحالات",
  "All systems are stable": "جميع الأنظمة مستقرة",
  "An unexpected error occurred": "حدث خطأ غير متوقع",
  Archived: "مؤرشف",
  Availability: "التوفر",
  "Back to Batches": "العودة إلى الدفعات",
  "Back to list": "العودة إلى القائمة",
  "Basic Information": "المعلومات الأساسية",
  By: "بواسطة",
  Clear: "مسح",
  "Clear and Quick Store Management": "إدارة واضحة وسريعة للمتجر",
  "Clear Form": "مسح النموذج",
  "Clear Selection": "إلغاء التحديد",
  "Close filter drawer": "إغلاق لوحة التصفية",
  "Close New Sale": "إغلاق العرض الجديد",
  Count: "العدد",
  Created: "تم الإنشاء",
  "Created by": "أنشأه",
  "Created from": "تاريخ الإنشاء من",
  "Created to": "تاريخ الإنشاء إلى",
  "Current stage": "المرحلة الحالية",
  "Current Status": "الحالة الحالية",
  "Daily Operations Center": "مركز العمليات اليومية",
  "Date Filters": "عوامل تصفية التاريخ",
  Healthy: "سليم",
  Hide: "إخفاء",
  "Hide Dates": "إخفاء التواريخ",
  Loading: "جارٍ التحميل",
  "Needs attention": "يحتاج إلى متابعة",
  Notifications: "الإشعارات",
  "Operation failed": "فشلت العملية",
  "Operations clear": "العمليات مستقرة",
  "Refresh data": "تحديث البيانات",
  Refreshing: "جارٍ التحديث",
  Results: "النتائج",
  Scope: "النطاق",
  "Settings areas": "أقسام الإعدادات",
  "System Status": "حالة النظام",
  Updated: "تم التحديث",
  "Updated by": "حدّثه",
  Uploaded: "تم الرفع",
  "Uploading image...": "جارٍ رفع الصورة...",
  "Uploading...": "جارٍ الرفع...",
  "Unread notifications": "إشعارات غير مقروءة",
  User: "المستخدم",
  "View all": "عرض الكل",
  Visibility: "الظهور",
  Read: "مقروء",
  "Mark as Read": "تحديد كمقروء",
  Primary: "رئيسي",
  Timeline: "الخط الزمني",
  Carrier: "شركة الشحن",
  Reason: "السبب",
  Remaining: "المتبقي",
  Scheduled: "مجدول",
  Paused: "متوقف مؤقتًا",
  Expired: "منتهي",
  Collected: "تم التحصيل",
  Collecting: "جارٍ التجميع",
  Completed: "مكتمل",
  Ordered: "تم الطلب",
  Tracking: "التتبع",
  Delivery: "التسليم",
  Items: "العناصر",
  Pieces: "القطع",
  Qty: "الكمية",
  Rate: "السعر",
  Rating: "التقييم",
  Store: "المتجر",
  Payments: "المدفوعات",
  "Add and edit main categories and subcategories":
    "إضافة وتعديل الأقسام الرئيسية والفرعية",
  "Add New Category": "إضافة قسم جديد",
  "Add Subcategory": "إضافة قسم فرعي",
  "Categories List": "قائمة الأقسام",
  "Category activated": "تم تفعيل القسم",
  "Category hidden": "تم إخفاء القسم",
  "Category image": "صورة القسم",
  "Category name": "اسم القسم",
  "Category not found in database": "القسم غير موجود في قاعدة البيانات",
  "Manage Categories": "إدارة الأقسام",
  "Main Category": "القسم الرئيسي",
  "No categories found": "لم يتم العثور على أقسام",
  "No subcategories yet": "لا توجد أقسام فرعية بعد",
  "Select main category": "اختر القسم الرئيسي",
  "Select sub category": "اختر القسم الفرعي",
  "Select subcategory": "اختر القسم الفرعي",
  "Sub Category": "القسم الفرعي",
  "Subcategory activated": "تم تفعيل القسم الفرعي",
  "Subcategory hidden": "تم إخفاء القسم الفرعي",
  "Subcategory image": "صورة القسم الفرعي",
  "Subcategory name": "اسم القسم الفرعي",
  "Delete category? Products will be hidden from store until moved to another category":
    "حذف القسم؟ ستُخفى المنتجات من المتجر حتى تُنقل إلى قسم آخر",
  "Delete subcategory?": "حذف القسم الفرعي؟",
  "Any active category saved here will appear in the main menu and categories page for customers":
    "أي قسم نشط يُحفظ هنا سيظهر للعملاء في القائمة الرئيسية وصفحة الأقسام",
  "An active category with slug": "قسم نشط برابط مختصر",
  "must exist before publishing to link the product to the store":
    "يجب أن يكون موجودًا قبل النشر لربط المنتج بالمتجر",
  "Add Color": "إضافة لون",
  "Add Size": "إضافة مقاس",
  "Add variant": "إضافة متغير",
  "Apply discount to all products": "تطبيق الخصم على كل المنتجات",
  "Apply filters": "تطبيق عوامل التصفية",
  "Apply to all": "تطبيق على الكل",
  "Any stock": "أي حالة مخزون",
  "Available Sizes": "المقاسات المتاحة",
  "Calculated Store Price": "سعر المتجر المحسوب",
  "Color name": "اسم اللون",
  Colors: "الألوان",
  "Create New Product": "إنشاء منتج جديد",
  "Create, edit, and organize products with full control over pricing and inventory":
    "إنشاء المنتجات وتعديلها وتنظيمها مع تحكم كامل في الأسعار والمخزون",
  "Drag & Drop images here": "اسحب الصور وأفلتها هنا",
  "Drag & drop or tap to choose": "اسحب وأفلت أو اضغط للاختيار",
  "Click to upload": "اضغط للرفع",
  "Choose a JPG, PNG, WEBP, GIF, or other image file":
    "اختر ملف صورة بصيغة JPG أو PNG أو WEBP أو GIF أو صيغة أخرى",
  "Delete image": "حذف الصورة",
  "Delete this product?": "حذف هذا المنتج؟",
  "Delete this variant?": "حذف هذا المتغير؟",
  "Edit size, color, stock, SKU, status, and optional variant pricing.":
    "عدّل المقاس واللون والمخزون ورمز SKU والحالة وسعر المتغير الاختياري.",
  "English name": "الاسم بالإنجليزية",
  "English name optional": "الاسم بالإنجليزية اختياري",
  "Images gallery": "معرض الصور",
  "Images saved here are used directly on the customer store":
    "الصور المحفوظة هنا تُستخدم مباشرة في متجر العملاء",
  "Images uploaded and added to gallery": "تم رفع الصور وإضافتها إلى المعرض",
  "In Stock": "متوفر",
  "Low Stock": "مخزون منخفض",
  "Low Stock Variants": "متغيرات منخفضة المخزون",
  "Manage Images": "إدارة الصور",
  "Manage Products": "إدارة المنتجات",
  "No images in gallery. Add at least one image before publishing.":
    "لا توجد صور في المعرض. أضف صورة واحدة على الأقل قبل النشر.",
  "No product images yet. Upload at least one image so the product appears correctly in the storefront.":
    "لا توجد صور للمنتج بعد. ارفع صورة واحدة على الأقل ليظهر المنتج بصورة صحيحة في المتجر.",
  "No variants yet. Add a size or color option below.":
    "لا توجد متغيرات بعد. أضف خيار مقاس أو لون أدناه.",
  "Out of Stock": "غير متوفر",
  "Price must be a non-negative number": "يجب ألا يكون السعر رقمًا سالبًا",
  Pricing: "التسعير",
  "Product created successfully": "تم إنشاء المنتج بنجاح",
  "Product created": "تم إنشاء المنتج",
  "Product description": "وصف المنتج",
  "Product images": "صور المنتج",
  "Product Name": "اسم المنتج",
  "Product published successfully": "تم نشر المنتج بنجاح",
  "Product updated successfully": "تم تحديث المنتج بنجاح",
  "Product variants": "متغيرات المنتج",
  "Products Without Images": "منتجات بلا صور",
  "Publish Product": "نشر المنتج",
  Publishing: "جارٍ النشر",
  "Publishing product...": "جارٍ نشر المنتج...",
  "Rating 0 - 5": "التقييم من 0 إلى 5",
  "Rating must be between 0 and 5": "يجب أن يكون التقييم بين 0 و5",
  "Reset changes": "إعادة تعيين التغييرات",
  "Save variant": "حفظ المتغير",
  "Search products by name or SKU": "ابحث باسم المنتج أو رمز SKU",
  "Search products...": "البحث في المنتجات...",
  "Set as primary": "تعيين كرئيسية",
  "Set primary": "تعيين كرئيسية",
  "Slug leave empty to auto generate":
    "اترك الرابط المختصر فارغًا ليُنشأ تلقائيًا",
  "Stock Availability": "توفر المخزون",
  "Store Price": "سعر المتجر",
  "Variant English name": "اسم المتغير بالإنجليزية",
  "Variant price": "سعر المتغير",
  "Variant stock must be a non-negative number":
    "يجب ألا يكون مخزون المتغير رقمًا سالبًا",
  "You can delete, reorder images, select the primary image, or upload additional images":
    "يمكنك حذف الصور أو إعادة ترتيبها أو اختيار الصورة الرئيسية أو رفع صور إضافية",
  "Arabic product name is required": "اسم المنتج بالعربية مطلوب",
  "Product extracted automatically. SHEIN tab was closed and the review form is ready.":
    "تم استخراج المنتج تلقائيًا. أُغلقت علامة تبويب شي إن ونموذج المراجعة جاهز.",
  "Active non-cancelled order value": "قيمة الطلبات النشطة غير الملغاة",
  "Already grouped and being tracked": "تم تجميعه ويجري تتبعه بالفعل",
  "Added to customer cart": "تمت الإضافة إلى سلة العميل",
  "Add to SHEIN Batch": "إضافة إلى دفعة شي إن",
  "Arrived and ready for customer delivery": "وصل وجاهز للتسليم للعميل",
  "Arrived Shop": "وصل إلى المتجر",
  "Cancelled customer orders": "طلبات العملاء الملغاة",
  "Cancelled order": "طلب ملغي",
  "Closed customer orders": "طلبات العملاء المغلقة",
  "Completed order": "طلب مكتمل",
  "Converted to order": "تم تحويله إلى طلب",
  "Custom order accepted and added to the customer cart":
    "تم قبول الطلب الخاص وإضافته إلى سلة العميل",
  "Custom order rejected": "تم رفض الطلب الخاص",
  "Customer and order details": "تفاصيل العميل والطلب",
  "Customer Orders": "طلبات العملاء",
  "Customer paid": "ما دفعه العميل",
  "Customer remaining": "المتبقي على العميل",
  "Customer state": "حالة العميل",
  "Deliver customer orders after the batch reaches the shop and final payment is completed":
    "سلّم طلبات العملاء بعد وصول الدفعة إلى المتجر واكتمال الدفعة النهائية",
  "Deliver ready customer orders": "تسليم طلبات العملاء الجاهزة",
  "Delivery starts when the batch reaches the shop":
    "يبدأ التسليم عند وصول الدفعة إلى المتجر",
  "Final payment stage is open": "مرحلة الدفعة النهائية مفتوحة",
  "Fully paid and ready for handover": "مدفوع بالكامل وجاهز للتسليم",
  "Fully paid orders ready for handover": "طلبات مدفوعة بالكامل وجاهزة للتسليم",
  "In Batch": "ضمن دفعة",
  "In SHEIN Batch": "ضمن دفعة شي إن",
  "In Shipping": "قيد الشحن",
  "Mark Delivered": "تحديد كمُسلَّم",
  "Mark Ready To Deliver": "تحديد كجاهز للتسليم",
  "Mark this order as delivered?": "تحديد هذا الطلب كمُسلَّم؟",
  "Mark this order ready to deliver?": "تحديد هذا الطلب كجاهز للتسليم؟",
  "New requests": "طلبات جديدة",
  "No actions available for this order status":
    "لا توجد إجراءات متاحة لحالة الطلب هذه",
  "No custom order requests found": "لم يتم العثور على طلبات خاصة",
  "No orders found in this step": "لا توجد طلبات في هذه الخطوة",
  "No orders yet": "لا توجد طلبات بعد",
  "No phone": "لا يوجد هاتف",
  "No products in order": "لا توجد منتجات في الطلب",
  "Not added to a batch yet": "لم يُضف إلى دفعة بعد",
  "Order number customer name or phone": "رقم الطلب أو اسم العميل أو الهاتف",
  "Order Status": "حالة الطلب",
  "Order total": "إجمالي الطلب",
  "Order Workflow": "مسار الطلب",
  "Orders attached to active SHEIN batches": "طلبات مرتبطة بدفعات شي إن نشطة",
  "Orders By Payment Status": "الطلبات حسب حالة الدفع",
  "Orders By Status": "الطلبات حسب الحالة",
  "Orders ready for batching": "طلبات جاهزة للتجميع",
  "Orders Summary": "ملخص الطلبات",
  "Orders total": "إجمالي الطلبات",
  "Quick tracking of orders and payment status":
    "تتبع سريع للطلبات وحالة الدفع",
  "Ready For Batch": "جاهز للدفعة",
  "Ready For SHEIN Batch": "جاهز لدفعة شي إن",
  "Ready To Deliver": "جاهز للتسليم",
  "Ready to deliver": "جاهز للتسليم",
  "Review customer product-link requests and prepare private accepted offers.":
    "راجع طلبات روابط المنتجات من العملاء وجهّز العروض الخاصة المقبولة.",
  "Review Orders": "مراجعة الطلبات",
  "Search by order number customer or phone":
    "ابحث برقم الطلب أو العميل أو الهاتف",
  "Search customer, phone, URL, or note":
    "ابحث بالعميل أو الهاتف أو الرابط أو الملاحظة",
  "Search order number, customer name, phone, or email":
    "ابحث برقم الطلب أو اسم العميل أو الهاتف أو البريد الإلكتروني",
  "Simple customer order summary, products, tracking, and payment totals":
    "ملخص بسيط لطلب العميل والمنتجات والتتبع وإجماليات الدفع",
  "The customer order is fully closed.": "تم إغلاق طلب العميل بالكامل.",
  "This order is already inside a SHEIN batch. Track shipment progress from SHEIN Batches.":
    "هذا الطلب موجود بالفعل داخل دفعة شي إن. تتبّع تقدم الشحنة من دفعات شي إن.",
  "This order is closed and should not move through batching or delivery.":
    "هذا الطلب مغلق ولا ينبغي نقله عبر مراحل التجميع أو التسليم.",
  "This will close the customer order as completed after handover.":
    "سيؤدي ذلك إلى إغلاق طلب العميل كمكتمل بعد التسليم.",
  "This will move the customer order to the delivery stage.":
    "سينقل هذا طلب العميل إلى مرحلة التسليم.",
  "Unable to load custom orders": "تعذر تحميل الطلبات الخاصة",
  "Unable to review custom order": "تعذرت مراجعة الطلب الخاص",
  "Use status links and search to find requests quickly":
    "استخدم روابط الحالات والبحث للعثور على الطلبات بسرعة",
  "Amount to collect": "المبلغ المطلوب تحصيله",
  "Amount to review": "المبلغ المطلوب مراجعته",
  "Approve Cash Payment": "اعتماد الدفع النقدي",
  "Approve cash-at-store final payments after customer handover":
    "اعتمد الدفعات النهائية النقدية في المتجر بعد تسليم العميل",
  "Approve Payment": "اعتماد الدفعة",
  "Approve the deposit to move the order into Orders":
    "اعتمد العربون لنقل الطلب إلى قائمة الطلبات",
  "Approve uploaded final payment proof before delivery":
    "اعتمد إثبات الدفعة النهائية المرفوع قبل التسليم",
  Approving: "جارٍ الاعتماد",
  "Cash at store final payment was rejected. The customer needs to choose a final payment method again before delivery can continue.":
    "رُفضت الدفعة النهائية النقدية في المتجر. يجب على العميل اختيار طريقة دفع نهائية مرة أخرى قبل متابعة التسليم.",
  "Cash Final Payment": "الدفعة النهائية النقدية",
  "Cash Final Review": "مراجعة الدفعة النقدية النهائية",
  "Confirm Rejection": "تأكيد الرفض",
  "Customer orders payments and balances": "مدفوعات وأرصدة طلبات العملاء",
  "Customers Paid": "ما دفعه العملاء",
  "Customers Remaining": "المتبقي على العملاء",
  "Default deposit": "العربون الافتراضي",
  "Default deposit percent": "نسبة العربون الافتراضية",
  "Delivery cannot continue until a valid final payment is approved.":
    "لا يمكن متابعة التسليم حتى اعتماد دفعة نهائية صحيحة.",
  Deposit: "العربون",
  "Deposit and final payment Vodafone Cash number":
    "رقم فودافون كاش للعربون والدفعة النهائية",
  "Deposit approved and not attached to an active batch":
    "العربون معتمد وغير مرتبط بدفعة نشطة",
  "Deposit approved and ready to be grouped": "العربون معتمد وجاهز للتجميع",
  "Deposit approved. Order moved to Orders.":
    "تم اعتماد العربون ونقل الطلب إلى قائمة الطلبات.",
  "Deposit is approved. Add this order or its products to the next SHEIN batch.":
    "تم اعتماد العربون. أضف هذا الطلب أو منتجاته إلى دفعة شي إن التالية.",
  "Deposit paid": "العربون المدفوع",
  "Deposit percent and customer payment accounts":
    "نسبة العربون وحسابات دفع العملاء",
  "Deposit required": "العربون المطلوب",
  "Deposit Review": "مراجعة العربون",
  "Deposits and final payments stay here until approved so Orders remains focused on operations":
    "تبقى العربونات والدفعات النهائية هنا حتى اعتمادها لتظل صفحة الطلبات مركزة على العمليات",
  "Fee added only when the customer pays with Vodafone Cash":
    "تُضاف الرسوم فقط عند دفع العميل عبر فودافون كاش",
  "Final due": "المبلغ النهائي المستحق",
  "Final method": "طريقة الدفع النهائية",
  "Final paid": "الدفعة النهائية المدفوعة",
  "Final payment approved. Order is ready to deliver.":
    "تم اعتماد الدفعة النهائية. الطلب جاهز للتسليم.",
  "Final payment is pending submitted or rejected":
    "الدفعة النهائية قيد الانتظار أو مرفوعة أو مرفوضة",
  "Final Payment Review": "مراجعة الدفعة النهائية",
  "Final payment will not be opened by this step.":
    "لن تُفتح مرحلة الدفعة النهائية بهذه الخطوة.",
  "Internal note or rejection reason": "ملاحظة داخلية أو سبب الرفض",
  "No payments found in this queue": "لا توجد مدفوعات في هذه القائمة",
  "No proof found for this payment type":
    "لم يتم العثور على إثبات لهذا النوع من الدفع",
  "No transfer proof is attached because this was a rejected cash-at-store final payment.":
    "لا يوجد إثبات تحويل مرفق لأن هذه دفعة نهائية نقدية في المتجر تم رفضها.",
  "Only orders with approved deposit appear here":
    "تظهر هنا فقط الطلبات ذات العربون المعتمد",
  "Payment account shown to customers": "حساب الدفع الظاهر للعملاء",
  "Payment completed": "اكتمل الدفع",
  "Payment details": "تفاصيل الدفع",
  "Payment Proof": "إثبات الدفع",
  "Payment proof actions stay in Payments Review. This page only shows totals and the next order step.":
    "تبقى إجراءات إثبات الدفع في مراجعة المدفوعات. تعرض هذه الصفحة الإجماليات وخطوة الطلب التالية فقط.",
  "Payment settings": "إعدادات الدفع",
  "Payment Summary": "ملخص الدفع",
  "Payments need review": "مدفوعات تحتاج إلى مراجعة",
  "Payments Queue": "قائمة المدفوعات",
  "Pending Payment Proofs": "إثباتات دفع قيد الانتظار",
  "Pick one queue and handle the next payment decision":
    "اختر قائمة واحدة وتعامل مع قرار الدفع التالي",
  "Queue Filters": "عوامل تصفية القائمة",
  "Reject cash final payment?": "رفض الدفعة النهائية النقدية؟",
  "Reject Cash Payment": "رفض الدفع النقدي",
  "Reject deposit proof?": "رفض إثبات العربون؟",
  "Reject final payment proof?": "رفض إثبات الدفعة النهائية؟",
  "Reject Payment": "رفض الدفعة",
  "Rejected deposit proofs waiting for the customer to upload again":
    "إثباتات عربون مرفوضة تنتظر إعادة الرفع من العميل",
  "Rejected Deposits": "عربونات مرفوضة",
  "Rejected final payment proofs waiting for correction":
    "إثباتات دفعة نهائية مرفوضة تنتظر التصحيح",
  "Rejected Final Payments": "دفعات نهائية مرفوضة",
  "Rejecting a payment is a sensitive action. Confirm only after reviewing the proof and writing a clear reason.":
    "رفض الدفعة إجراء حساس. أكّد فقط بعد مراجعة الإثبات وكتابة سبب واضح.",
  "Rejection reason": "سبب الرفض",
  "Review cash final payment": "مراجعة الدفعة النهائية النقدية",
  "Review Customer Payments": "مراجعة مدفوعات العملاء",
  "Review final payment": "مراجعة الدفعة النهائية",
  "Review queues": "مراجعة القوائم",
  "Review queues and payment status totals":
    "مراجعة القوائم وإجماليات حالات الدفع",
  "Search this queue": "البحث في هذه القائمة",
  "The customer selected cash at store. Confirm the received amount from Payments Review.":
    "اختار العميل الدفع نقدًا في المتجر. أكّد المبلغ المستلم من مراجعة المدفوعات.",
  "The customer selected cash at store. Confirm the received remaining amount before delivery.":
    "اختار العميل الدفع نقدًا في المتجر. أكّد استلام المبلغ المتبقي قبل التسليم.",
  "The customer should pay the remaining amount before delivery.":
    "يجب على العميل دفع المبلغ المتبقي قبل التسليم.",
  "The customer uploaded final payment proof. Review it from Payments Review.":
    "رفع العميل إثبات الدفعة النهائية. راجعه من صفحة مراجعة المدفوعات.",
  "The order is fully paid. Mark it completed after handover.":
    "الطلب مدفوع بالكامل. حدده كمكتمل بعد التسليم.",
  "The order will stay out of the active Orders workflow until a valid deposit is approved.":
    "سيبقى الطلب خارج مسار الطلبات النشطة حتى اعتماد عربون صحيح.",
  "This order has no submitted proof left in this queue. Refresh or open another payment.":
    "لم يعد لهذا الطلب إثبات مرفوع في هذه القائمة. حدّث الصفحة أو افتح دفعة أخرى.",
  "Vodafone Cash fee percent": "نسبة رسوم فودافون كاش",
  "Vodafone fee": "رسوم فودافون",
  "Waiting final payment": "بانتظار الدفعة النهائية",
  "Add products to sale": "إضافة منتجات إلى العرض",
  "Already added": "مضاف بالفعل",
  "Create flash sales linked to published products with discount and clear timing for customers":
    "أنشئ عروضًا سريعة مرتبطة بالمنتجات المنشورة مع خصم ومدة واضحة للعملاء",
  "Delete Sale": "حذف العرض",
  "Delete sale completely?": "حذف العرض نهائيًا؟",
  "Discount %": "نسبة الخصم",
  "Discount must be between 0 and 100": "يجب أن تكون نسبة الخصم بين 0 و100",
  "Discount percent": "نسبة الخصم",
  "Edit sale settings": "تعديل إعدادات العرض",
  "Ends before": "ينتهي قبل",
  "Find flash sales": "البحث في العروض السريعة",
  "Flash Sale keeps priority over normal product discount. Linked products will show this sale price while the sale is active.":
    "للعرض السريع أولوية على خصم المنتج العادي. ستعرض المنتجات المرتبطة سعر العرض طوال فترة نشاطه.",
  "New Flash Sale": "عرض سريع جديد",
  "No sales found": "لم يتم العثور على عروض",
  Pause: "إيقاف مؤقت",
  "Sale name": "اسم العرض",
  "Search sale product or SKU": "ابحث عن منتج العرض أو رمز SKU",
  "Selected Sale": "العرض المحدد",
  "Starts from": "يبدأ من",
  "Step 1: create the sale. Step 2: choose products from the selected sale panel.":
    "الخطوة 1: أنشئ العرض. الخطوة 2: اختر المنتجات من لوحة العرض المحدد.",
  "This updates every product discount shown on the customer store":
    "سيؤدي ذلك إلى تحديث خصم كل منتج ظاهر في متجر العملاء",
  "Update Sale": "تحديث العرض",
  "Weekend flash sale": "عرض سريع لنهاية الأسبوع",
  "Adding...": "جارٍ الإضافة...",
  "Auto-filled from SHEIN import": "معبأ تلقائيًا من استيراد شي إن",
  "Automatic import started. SHEIN will open with the selected country, SAR currency, and selected language. Keep the tab open; it will close automatically when extraction succeeds.":
    "بدأ الاستيراد التلقائي. سيفتح شي إن بالدولة المحددة وعملة الريال السعودي واللغة المختارة. اترك علامة التبويب مفتوحة؛ ستُغلق تلقائيًا عند نجاح الاستخراج.",
  "Click Start automatic import to open Chrome with V1 mode, or use Open link as backup":
    "اضغط بدء الاستيراد التلقائي لفتح Chrome بوضع V1، أو استخدم فتح الرابط كخيار احتياطي",
  "Colors extracted automatically and can be added, edited, deleted, or reordered":
    "تُستخرج الألوان تلقائيًا ويمكن إضافتها أو تعديلها أو حذفها أو إعادة ترتيبها",
  "Default from SHEIN import": "القيمة الافتراضية من استيراد شي إن",
  "Failed to continue SHEIN extraction": "تعذرت متابعة استخراج بيانات شي إن",
  "Failed to follow import steps": "تعذر تنفيذ خطوات الاستيراد",
  "Failed to publish product": "تعذر نشر المنتج",
  "Failed to save SHEIN settings": "تعذر حفظ إعدادات شي إن",
  "Failed to start import": "تعذر بدء الاستيراد",
  "Final customer price": "السعر النهائي للعميل",
  "From SHEIN link to customer-facing product":
    "من رابط شي إن إلى منتج ظاهر للعميل",
  "Import History": "سجل الاستيراد",
  "Import Product": "استيراد المنتج",
  "Import SHEIN": "استيراد من شي إن",
  "Import Steps": "خطوات الاستيراد",
  "Importing Product": "جارٍ استيراد المنتج",
  "Manual check now": "فحص يدوي الآن",
  "Manual check started a fresh browser read. Waiting for SHEIN product data...":
    "بدأ الفحص اليدوي قراءة جديدة من المتصفح. في انتظار بيانات منتج شي إن...",
  "Manual review": "مراجعة يدوية",
  "Marketplace settings": "إعدادات السوق",
  "Marketplace settings alert": "تنبيه إعدادات السوق",
  "Missing link": "الرابط مفقود",
  "Missing SHEIN Link": "رابط شي إن مفقود",
  "No imports found": "لم يتم العثور على عمليات استيراد",
  "No imports yet": "لا توجد عمليات استيراد بعد",
  "No options extracted": "لم يتم استخراج خيارات",
  "No SHEIN product link saved for this product":
    "لا يوجد رابط منتج شي إن محفوظ لهذا المنتج",
  "Open link": "فتح الرابط",
  "Open product URL": "فتح رابط المنتج",
  "Open SHEIN link in": "فتح رابط شي إن في",
  "Open SHEIN Page": "فتح صفحة شي إن",
  "Open SHEIN Product": "فتح منتج شي إن",
  "Original / Edited Description": "الوصف الأصلي / المعدل",
  "Original Price SAR": "السعر الأصلي بالريال السعودي",
  "Original SHEIN product link": "رابط منتج شي إن الأصلي",
  "Paste a SHEIN link and review product data before publishing to store":
    "الصق رابط شي إن وراجع بيانات المنتج قبل نشره في المتجر",
  "Paste a SHEIN product link to start automatic extraction, then review and edit product data before publishing":
    "الصق رابط منتج شي إن لبدء الاستخراج التلقائي، ثم راجع بيانات المنتج وعدّلها قبل النشر",
  "Paste SHEIN Link and Start Import": "الصق رابط شي إن وابدأ الاستيراد",
  "Product extracted successfully. Review form is ready.":
    "تم استخراج المنتج بنجاح. نموذج المراجعة جاهز.",
  "Ready for Review": "جاهز للمراجعة",
  "Recent import links": "روابط الاستيراد الأخيرة",
  "Reset to Kuwait SAR": "إعادة التعيين إلى الكويت والريال السعودي",
  "Review Product Before Publishing": "مراجعة المنتج قبل النشر",
  "Review required data and click Publish Product when complete":
    "راجع البيانات المطلوبة واضغط نشر المنتج عند الاكتمال",
  "Review screen": "شاشة المراجعة",
  Reviewing: "جارٍ المراجعة",
  "Reviewing product...": "جارٍ مراجعة المنتج...",
  "Save SHEIN settings": "حفظ إعدادات شي إن",
  "Select country to open SHEIN product. Currency is fixed to SAR to prevent wrong market price import":
    "اختر الدولة لفتح منتج شي إن. العملة ثابتة على الريال السعودي لمنع استيراد سعر سوق غير صحيح",
  "Select import to review": "اختر عملية استيراد لمراجعتها",
  "SHEIN Country Settings": "إعدادات دولة شي إن",
  "SHEIN Link": "رابط شي إن",
  "SHEIN link": "رابط شي إن",
  "SHEIN marketplace settings saved": "تم حفظ إعدادات سوق شي إن",
  "SHEIN Operations": "عمليات شي إن",
  "SHEIN price in SAR": "سعر شي إن بالريال السعودي",
  "SHEIN pricing settings": "إعدادات تسعير شي إن",
  "SHEIN review progress": "تقدم مراجعة شي إن",
  "SHEIN SAR": "سعر شي إن بالريال السعودي",
  "SHEIN source link": "رابط مصدر شي إن",
  Sizes: "المقاسات",
  "Sizes extracted automatically and can be added, edited, deleted, or reordered":
    "تُستخرج المقاسات تلقائيًا ويمكن إضافتها أو تعديلها أو حذفها أو إعادة ترتيبها",
  "System could not extract all data automatically. Open the SHEIN link to complete product data manually.":
    "تعذر على النظام استخراج كل البيانات تلقائيًا. افتح رابط شي إن لإكمال بيانات المنتج يدويًا.",
  "System could not extract all data automatically. You can open the SHEIN link and complete product data manually.":
    "تعذر على النظام استخراج كل البيانات تلقائيًا. يمكنك فتح رابط شي إن وإكمال بيانات المنتج يدويًا.",
  "The browser tab is being monitored automatically. Solve CAPTCHA if it appears; once the product page loads, import will continue and the SHEIN tab will close by itself.":
    "تتم مراقبة علامة تبويب المتصفح تلقائيًا. أكمل اختبار CAPTCHA إن ظهر؛ وعند تحميل صفحة المنتج سيستمر الاستيراد وتُغلق علامة تبويب شي إن تلقائيًا.",
  "The workflow is now clear: paste the link, review data and images and category, then publish the product without approval steps or drafts":
    "أصبح المسار واضحًا: الصق الرابط، وراجع البيانات والصور والقسم، ثم انشر المنتج دون خطوات اعتماد أو مسودات",
  "Unable to load SHEIN import data": "تعذر تحميل بيانات استيراد شي إن",
  "Verification cleared. Reading SHEIN product data...":
    "اكتمل التحقق. جارٍ قراءة بيانات منتج شي إن...",
  "with SAR": "بالريال السعودي",
  "You can edit or replace SHEIN description before publishing":
    "يمكنك تعديل وصف شي إن أو استبداله قبل النشر",
  "A simple four-step wizard for selecting ready items, reviewing imported SHEIN SAR prices, checking SAR/EGP totals, and creating one internal SHEIN purchase batch.":
    "معالج بسيط من أربع خطوات لاختيار العناصر الجاهزة ومراجعة أسعار شي إن المستوردة بالريال السعودي والتحقق من إجماليات الريال والجنيه وإنشاء دفعة شراء داخلية واحدة من شي إن.",
  "Active non-cancelled batch cost converted to EGP":
    "تكلفة الدفعات النشطة غير الملغاة محوّلة إلى الجنيه",
  "Active non-cancelled batch cost in SAR":
    "تكلفة الدفعات النشطة غير الملغاة بالريال السعودي",
  "Add optional references and create the internal SHEIN purchase group":
    "أضف المراجع الاختيارية وأنشئ مجموعة شراء شي إن الداخلية",
  "Batch creation steps": "خطوات إنشاء الدفعة",
  "Batch Stages": "مراحل الدفعة",
  "Batch title optional": "عنوان الدفعة اختياري",
  "Batches being prepared before SHEIN purchase":
    "دفعات قيد التجهيز قبل الشراء من شي إن",
  "Batches By Status": "الدفعات حسب الحالة",
  "Bulk Update Tracking": "تحديث التتبع جماعيًا",
  "Cancel Batch": "إلغاء الدفعة",
  "Cancel this SHEIN batch?": "إلغاء دفعة شي إن هذه؟",
  "Cancelled batches": "دفعات ملغاة",
  "Cancelled Batches": "الدفعات الملغاة",
  "Cancelled batches cannot continue the normal tracking flow.":
    "لا يمكن للدفعات الملغاة متابعة مسار التتبع المعتاد.",
  "Cancelled SHEIN batches": "دفعات شي إن الملغاة",
  "Check SAR and EGP before creating": "تحقق من الريال والجنيه قبل الإنشاء",
  "Choose approved-deposit products": "اختر المنتجات ذات العربون المعتمد",
  "Choose the exact step you want to work on":
    "اختر الخطوة المحددة التي تريد العمل عليها",
  "Collecting ordered shipping and arrived batches":
    "دفعات قيد التجميع والطلب والشحن والوصول",
  "Collection date": "تاريخ التجميع",
  "Complete selected items prices and exchange rate before creating the batch":
    "أكمل أسعار العناصر المحددة وسعر الصرف قبل إنشاء الدفعة",
  "Completed Batches": "الدفعات المكتملة",
  "Confirm the selected products and financial totals before saving":
    "أكّد المنتجات المحددة والإجماليات المالية قبل الحفظ",
  "Create batch": "إنشاء الدفعة",
  "Create Batch": "إنشاء دفعة",
  "Create flow": "مسار الإنشاء",
  "Create New Batch": "إنشاء دفعة جديدة",
  "Current admin image": "صورة الإدارة الحالية",
  "Customer collections and SHEIN batch cost from current data":
    "تحصيلات العملاء وتكلفة دفعات شي إن من البيانات الحالية",
  "Customer orders stay separate. This batch is only an internal SHEIN purchase group.":
    "تبقى طلبات العملاء مستقلة. هذه الدفعة مجرد مجموعة شراء داخلية من شي إن.",
  "Daily actions stay visible. Full edit inputs are collapsed until needed.":
    "تظل الإجراءات اليومية ظاهرة، بينما تُطوى حقول التعديل الكاملة حتى الحاجة إليها.",
  "Delivered and closed batches": "دفعات تم تسليمها وإغلاقها",
  "Delivered and closed SHEIN batches": "دفعات شي إن تم تسليمها وإغلاقها",
  "Each customer order stays independent inside the internal batch with its payment summary":
    "يبقى كل طلب عميل مستقلًا داخل الدفعة الداخلية مع ملخص مدفوعاته",
  "Enter SAR prices in Step 2": "أدخل الأسعار بالريال السعودي في الخطوة 2",
  "Enter the product price in SAR.": "أدخل سعر المنتج بالريال السعودي.",
  Exchange: "الصرف",
  "Exchange Rate": "سعر الصرف",
  "Exchange rate": "سعر الصرف",
  "Financial Summary": "الملخص المالي",
  "Find by batch code customer phone or order number":
    "ابحث برمز الدفعة أو هاتف العميل أو رقم الطلب",
  "Internal admin notes": "ملاحظات إدارية داخلية",
  "Internal Notes": "ملاحظات داخلية",
  "Internal notes optional": "الملاحظات الداخلية اختيارية",
  "Items arrived or final payment is under review":
    "وصلت العناصر أو الدفعة النهائية قيد المراجعة",
  "Items can only be removed while the batch is still collecting.":
    "يمكن إزالة العناصر فقط عندما تكون الدفعة ما زالت قيد التجميع.",
  "Keep the daily screen light. Dates are hidden until you need advanced filtering.":
    "حافظ على بساطة الشاشة اليومية. التواريخ مخفية حتى تحتاج إلى تصفية متقدمة.",
  "Latest batch status changes": "أحدث تغييرات حالة الدفعة",
  "Locked after ordering": "مقفل بعد الطلب",
  "Main action totals tracking and timeline":
    "الإجراء الرئيسي والإجماليات والتتبع والخط الزمني",
  "Main batch information status update and timeline":
    "معلومات الدفعة الرئيسية وتحديث الحالة والخط الزمني",
  "Most recently updated open SHEIN batches":
    "أحدث دفعات شي إن المفتوحة تحديثًا",
  "Move step by step so the admin always knows what to do next":
    "انتقل خطوة بخطوة ليعرف المسؤول دائمًا الإجراء التالي",
  "Move this batch to Arrived shop first. Then final payment opens and paid orders can be delivered from this tab.":
    "انقل الدفعة أولًا إلى وصلت للمتجر. بعدها تُفتح الدفعة النهائية ويمكن تسليم الطلبات المدفوعة من هذا التبويب.",
  "Move To": "نقل إلى",
  "New batches are created on a separate clean page":
    "تُنشأ الدفعات الجديدة في صفحة مستقلة وواضحة",
  "Next Action": "الإجراء التالي",
  "Next action": "الإجراء التالي",
  "Next Create Batch": "التالي: إنشاء الدفعة",
  "Next Review SAR Prices": "التالي: مراجعة أسعار الريال",
  "Next Review Totals": "التالي: مراجعة الإجماليات",
  "No customer orders inside this batch yet":
    "لا توجد طلبات عملاء داخل هذه الدفعة بعد",
  "No open SHEIN batches right now": "لا توجد دفعات شي إن مفتوحة حاليًا",
  "No products inside this batch yet": "لا توجد منتجات داخل هذه الدفعة بعد",
  "No products selected yet": "لم يتم تحديد منتجات بعد",
  "No ready items. Orders appear here after deposit approval.":
    "لا توجد عناصر جاهزة. تظهر الطلبات هنا بعد اعتماد العربون.",
  "No saved SHEIN import price for this item":
    "لا يوجد سعر استيراد محفوظ من شي إن لهذا العنصر",
  "No selected items yet": "لم يتم تحديد عناصر بعد",
  "No SHEIN batches found in this stage":
    "لم يتم العثور على دفعات شي إن في هذه المرحلة",
  "No timeline entries yet": "لا توجد إدخالات في الخط الزمني بعد",
  "No timeline events yet": "لا توجد أحداث في الخط الزمني بعد",
  "Notes are for admins only and stay attached to this SHEIN batch":
    "الملاحظات للمسؤولين فقط وتبقى مرتبطة بدفعة شي إن هذه",
  "Open Batches": "الدفعات المفتوحة",
  "Open batches active": "الدفعات المفتوحة النشطة",
  "Open one simple tab at a time instead of showing every batch detail in one long screen":
    "افتح تبويبًا بسيطًا واحدًا في كل مرة بدل عرض كل تفاصيل الدفعة في شاشة طويلة",
  "Open SHEIN Batches": "فتح دفعات شي إن",
  "Orders in this batch whose active items reached the shop now move to Waiting Final Payment. Uploaded proofs and cash-at-store confirmations are handled from Payments Review.":
    "تنتقل طلبات هذه الدفعة التي وصلت عناصرها النشطة إلى المتجر إلى انتظار الدفعة النهائية. تُدار الإثباتات المرفوعة وتأكيدات الدفع النقدي من مراجعة المدفوعات.",
  "Orders whose items reached the shop may move to Waiting Final Payment.":
    "يمكن نقل الطلبات التي وصلت عناصرها إلى المتجر إلى انتظار الدفعة النهائية.",
  "Products and item movement": "المنتجات وحركة العناصر",
  "Purchased and waiting shipment": "تم الشراء وبانتظار الشحن",
  "Remove Item": "إزالة العنصر",
  "Remove item from this draft batch?": "إزالة العنصر من هذه الدفعة المسودة؟",
  "Review or add a valid Unit SAR for every selected item and a valid exchange rate":
    "راجع أو أضف سعر وحدة صحيحًا بالريال لكل عنصر محدد وسعر صرف صحيحًا",
  "Review SAR prices": "مراجعة أسعار الريال",
  "Review totals": "مراجعة الإجماليات",
  "Save Item Status": "حفظ حالة العنصر",
  "Save Notes": "حفظ الملاحظات",
  "Save the SHEIN purchase group": "حفظ مجموعة شراء شي إن",
  "Save Tracking": "حفظ التتبع",
  "Search Existing Batches": "البحث في الدفعات الحالية",
  "Select at least one ready item first":
    "حدد عنصرًا جاهزًا واحدًا على الأقل أولًا",
  "Select ready items": "اختيار العناصر الجاهزة",
  "Selected Items": "العناصر المحددة",
  "Selected orders": "الطلبات المحددة",
  "Selected pieces": "القطع المحددة",
  "Send SHEIN Links WhatsApp": "إرسال روابط شي إن عبر واتساب",
  "SHEIN cost": "تكلفة شي إن",
  "SHEIN order reference optional": "مرجع طلب شي إن اختياري",
  "SHEIN Orders Processing": "معالجة طلبات شي إن",
  "SHEIN ref": "مرجع شي إن",
  "SHEIN reference": "مرجع شي إن",
  "SHEIN Total EGP": "إجمالي شي إن بالجنيه",
  "SHEIN Total SAR": "إجمالي شي إن بالريال",
  "Shipping customs and Egypt arrival tracking":
    "تتبع الشحن والجمارك والوصول إلى مصر",
  "Showing latest 5 timeline entries": "عرض أحدث 5 إدخالات في الخط الزمني",
  Step: "الخطوة",
  "Step 1": "الخطوة 1",
  "Step 1 Select ready items": "الخطوة 1: اختيار العناصر الجاهزة",
  "Step 2 Review SAR prices": "الخطوة 2: مراجعة أسعار الريال",
  "Step 3 Review SAR and EGP totals":
    "الخطوة 3: مراجعة إجماليات الريال والجنيه",
  "Step 4 Create batch": "الخطوة 4: إنشاء الدفعة",
  "The exchange rate is saved inside the batch so old batch totals stay stable if the rate changes later.":
    "يُحفظ سعر الصرف داخل الدفعة لتظل إجماليات الدفعات القديمة ثابتة إذا تغير السعر لاحقًا.",
  "This drawer stays stable even when you search for other ready items":
    "تظل هذه اللوحة ثابتة حتى عند البحث عن عناصر جاهزة أخرى",
  "This updates every non-cancelled item in the batch to":
    "سيحدّث ذلك كل عنصر غير ملغي في الدفعة إلى",
  "This will detach the item from the SHEIN batch and return it to the ready list while the batch is still collecting.":
    "سيؤدي ذلك إلى فصل العنصر عن دفعة شي إن وإعادته إلى قائمة الجاهز ما دامت الدفعة قيد التجميع.",
  "Total Batches": "إجمالي الدفعات",
  "Total EGP": "الإجمالي بالجنيه",
  "Total product quantity": "إجمالي كمية المنتجات",
  "Total SAR": "الإجمالي بالريال",
  "Track every product in this batch and keep individual item control when needed":
    "تتبّع كل منتج في هذه الدفعة مع إبقاء التحكم الفردي بالعناصر عند الحاجة",
  "Track in SHEIN Batch": "تتبع في دفعة شي إن",
  "Tracking carrier optional": "شركة الشحن اختيارية",
  "Tracking number": "رقم التتبع",
  "Tracking number optional": "رقم التتبع اختياري",
  "Tracking URL": "رابط التتبع",
  "Tracking URL optional": "رابط التتبع اختياري",
  "Unique customer orders": "طلبات عملاء فريدة",
  "Unit SAR": "سعر الوحدة بالريال",
  "Unit SAR is filled from the saved SHEIN import price, and you can edit it when SHEIN changes the price":
    "يُملأ سعر الوحدة بالريال من سعر استيراد شي إن المحفوظ، ويمكنك تعديله عند تغيير شي إن للسعر",
  "Updating the batch status will sync every non-cancelled item to":
    "سيؤدي تحديث حالة الدفعة إلى مزامنة كل عنصر غير ملغي إلى",
  "Use item-level controls only for exceptions after this bulk update.":
    "استخدم عناصر التحكم الفردية فقط للاستثناءات بعد هذا التحديث الجماعي.",
  "Use stage tabs to filter the batch list":
    "استخدم تبويبات المراحل لتصفية قائمة الدفعات",
  "Use these tabs to follow groups by business stage":
    "استخدم هذه التبويبات لمتابعة المجموعات حسب مرحلة العمل",
  "View and track internal SHEIN purchase groups. Create new batches in a separate step-by-step wizard so this page stays simple.":
    "اعرض مجموعات شراء شي إن الداخلية وتتبعها. أنشئ دفعات جديدة في معالج منفصل خطوة بخطوة لتبقى هذه الصفحة بسيطة.",
  "Write internal notes for this batch": "اكتب ملاحظات داخلية لهذه الدفعة",
  "Audit logs": "سجلات النشاط",
  "Customer Sales": "مبيعات العملاء",
  "Generated at": "تم الإنشاء في",
  "Loading admin reports": "جارٍ تحميل تقارير الإدارة",
  "Loading store status": "جارٍ تحميل حالة المتجر",
  "No activity log found": "لم يتم العثور على سجل نشاط",
  "No low stock variants": "لا توجد متغيرات منخفضة المخزون",
  "No new notifications": "لا توجد إشعارات جديدة",
  "Operational Reports": "التقارير التشغيلية",
  "Priority stock adjustment needed": "يلزم تعديل المخزون بأولوية",
  "Quick operational overview of orders, payments, sales, imports, and inventory from one place":
    "نظرة تشغيلية سريعة على الطلبات والمدفوعات والمبيعات والاستيراد والمخزون من مكان واحد",
  "Real-time money orders payments and SHEIN batch reporting for daily admin decisions":
    "تقارير فورية للأموال والطلبات والمدفوعات ودفعات شي إن لدعم قرارات الإدارة اليومية",
  "Recent Orders": "أحدث الطلبات",
  "Review admin, user, order, upload, product, category, settings, and SHEIN operations":
    "راجع عمليات الإدارة والمستخدمين والطلبات والرفع والمنتجات والأقسام والإعدادات وشي إن",
  "RS Store Dashboard": "لوحة تحكم RS Store",
  "Today Revenue": "إيرادات اليوم",
  "Top priorities to review before anything else":
    "أهم الأولويات للمراجعة قبل أي شيء آخر",
  "Total Orders": "إجمالي الطلبات",
  "Track orders, payments, sales, and SHEIN imports from a single, organized interface optimized for mobile and desktop":
    "تتبّع الطلبات والمدفوعات والمبيعات وعمليات استيراد شي إن من واجهة موحدة ومنظمة ومهيأة للجوال وسطح المكتب",
  "View All Orders": "عرض كل الطلبات",
  "View Reports": "عرض التقارير",
  "Unable to load admin reports": "تعذر تحميل تقارير الإدارة",
  "Remaining balance across active customer orders":
    "الرصيد المتبقي في طلبات العملاء النشطة",
  "Pieces in active non-cancelled SHEIN batches":
    "القطع الموجودة في دفعات شي إن النشطة غير الملغاة",
  "Appears in storefront and invoices": "يظهر في المتجر والفواتير",
  "Check orphaned images and safely clean up extra files without affecting product images":
    "تحقق من الصور غير المرتبطة ونظّف الملفات الزائدة بأمان دون التأثير على صور المنتجات",
  "Checking...": "جارٍ الفحص...",
  "Clean Orphaned Files": "تنظيف الملفات غير المرتبطة",
  "Cleaning...": "جارٍ التنظيف...",
  "Cleanup button executes a safe backend operation and writes an audit log with the admin user and deletion counts":
    "ينفذ زر التنظيف عملية خلفية آمنة ويسجل في سجل النشاط اسم المسؤول وأعداد الملفات المحذوفة",
  "Cloudinary files": "ملفات Cloudinary",
  "Confirm cleanup of orphaned files": "تأكيد تنظيف الملفات غير المرتبطة",
  "Customer service phone number": "رقم هاتف خدمة العملاء",
  "database records and": "سجلات قاعدة البيانات و",
  "Delete orphaned files from Cloudinary and database. Are you sure?":
    "حذف الملفات غير المرتبطة من Cloudinary وقاعدة البيانات. هل أنت متأكد؟",
  "Delivery settings and estimated duration": "إعدادات التسليم والمدة المتوقعة",
  "Estimated delivery": "مدة التسليم المتوقعة",
  "Example: 14": "مثال: 14",
  "Files can be reviewed before cleanup": "يمكن مراجعة الملفات قبل التنظيف",
  "Filter by text, entity, action, entity ID, or date range":
    "صفِّ حسب النص أو الكيان أو الإجراء أو معرّف الكيان أو نطاق التاريخ",
  "Focused setting groups. Open one area, edit only the fields you need, then save that section.":
    "مجموعات إعدادات مركزة. افتح قسمًا واحدًا وعدّل الحقول المطلوبة فقط ثم احفظ ذلك القسم.",
  "Full Instagram account link": "الرابط الكامل لحساب إنستغرام",
  "Inputs are hidden until you choose a section":
    "تظل الحقول مخفية حتى تختار قسمًا",
  "Last cleanup removed": "أزال آخر تنظيف",
  Metadata: "البيانات الوصفية",
  "Minimum deposit percent": "الحد الأدنى لنسبة العربون",
  "Only the selected section is saved so hidden settings are never overwritten by accident.":
    "يُحفظ القسم المحدد فقط حتى لا تُستبدل الإعدادات المخفية بالخطأ.",
  "Or click to upload from desktop, mobile, or tablet":
    "أو اضغط للرفع من الكمبيوتر أو الهاتف أو الجهاز اللوحي",
  "Primary contact number": "رقم التواصل الرئيسي",
  "Public store contact data visible to customers":
    "بيانات تواصل المتجر العامة الظاهرة للعملاء",
  "Records not linked to active products or entities":
    "سجلات غير مرتبطة بمنتجات أو كيانات نشطة",
  "Save this section only": "حفظ هذا القسم فقط",
  "Search action user or entity": "ابحث عن إجراء أو مستخدم أو كيان",
  "Shipping days": "أيام الشحن",
  "Shipping settings": "إعدادات الشحن",
  "Store Settings": "إعدادات المتجر",
  "Storefront settings": "إعدادات واجهة المتجر",
  "Unlinked Cloudinary files": "ملفات Cloudinary غير مرتبطة",
  "Unlinked database records": "سجلات قاعدة بيانات غير مرتبطة",
  "Unable to upload images": "تعذر رفع الصور",
  "Used to calculate store price when publishing SHEIN products":
    "يُستخدم لحساب سعر المتجر عند نشر منتجات شي إن",
  "WhatsApp Customer": "مراسلة العميل عبر واتساب",
  Entity: "الكيان",
  "Entity ID": "معرّف الكيان",
  "Entity type": "نوع الكيان",
  Instagram: "إنستغرام",
  Instapay: "إنستاباي",
  "Vodafone Cash": "فودافون كاش",
  WhatsApp: "واتساب",
  "Editable fields": "الحقول القابلة للتعديل",
  "Fixed Currency": "عملة ثابتة",
  "Max price": "أقصى سعر",
  "Min price": "أدنى سعر",
  "Optional customer-facing title": "عنوان اختياري ظاهر للعميل",
  "SAR exchange rate": "سعر صرف الريال السعودي",
  "SAR exchange rate for importing products":
    "سعر صرف الريال السعودي لاستيراد المنتجات",
  "SAR rate is unavailable. Update pricing settings first.":
    "سعر صرف الريال السعودي غير متاح. حدّث إعدادات التسعير أولًا.",
  "SAR rate": "سعر الريال",
  "SAR to EGP rate": "سعر تحويل الريال إلى الجنيه",
  "SAR × exchange rate": "الريال × سعر الصرف",
  "SAR × rate": "الريال × السعر",
  "Sort by date": "الترتيب حسب التاريخ",
  "Sort by name": "الترتيب حسب الاسم",
  "Sort by price": "الترتيب حسب السعر",
  "Sort order": "ترتيب الفرز",
  "Status note optional": "ملاحظة الحالة اختيارية",
  ". Use item controls below for exceptions.":
    ". استخدم عناصر التحكم أدناه للاستثناءات.",
  "Add store WhatsApp number in Settings": "أضف رقم واتساب المتجر في الإعدادات",
  "Approving product...": "جارٍ اعتماد المنتج...",
  "Could not load admin reports": "تعذر تحميل تقارير الإدارة",
  "Filter Products": "تصفية المنتجات",
  FINAL_PAYMENT: "الدفعة النهائية",
  PENDING_REVIEW: "قيد المراجعة",
  READY_FOR_SHEIN_BATCH: "جاهز لدفعة شي إن",
  "import review": "مراجعة الاستيراد",
  "item(s) from this batch": "عنصر من هذه الدفعة",
  "item(s) in this SHEIN batch": "عنصر في دفعة شي إن هذه",
  items: "عناصر",
  orders: "طلبات",
  "Loading custom orders": "جارٍ تحميل الطلبات الخاصة",
  "Only the next decision is visible first. Details stay collapsed until needed.":
    "يظهر القرار التالي أولًا فقط، وتبقى التفاصيل مطوية حتى الحاجة إليها.",
  "Open Payments Review": "فتح مراجعة المدفوعات",
  "Orders now start here only after deposit approval. Payments Review handles deposit and final payment proofs separately.":
    "تبدأ الطلبات هنا فقط بعد اعتماد العربون. تتولى مراجعة المدفوعات إثباتات العربون والدفعة النهائية بصورة منفصلة.",
  "Paid delivery actions": "إجراءات تسليم الطلبات المدفوعة",
  "Price in SAR": "السعر بالريال السعودي",
  "published products": "منتجات منشورة",
  "ready item(s)": "عناصر جاهزة",
  "selected item(s) still need a valid Unit SAR amount because no saved SHEIN import price was found.":
    "ما زالت بعض العناصر المحددة تحتاج إلى سعر وحدة صحيح بالريال لعدم وجود سعر استيراد محفوظ من شي إن.",
  "Sign in as admin or store owner to access the control panel":
    "سجّل الدخول كمسؤول أو مالك للمتجر للوصول إلى لوحة التحكم",
  Subcategories: "الأقسام الفرعية",
  "Subcategories (": "الأقسام الفرعية (",
  Sort: "الترتيب",
  "50 or 60 or 70": "50 أو 60 أو 70",
  "Search: “": "البحث: «",
  "RS Store": "RS Store",
  "RS Store V2": "RS Store V2",
  SHEIN: "شي إن",
  SAR: "ر.س",
  EGP: "ج.م",
  Cloudinary: "Cloudinary",
  CAPTCHA: "CAPTCHA",
  Chrome: "Chrome",
  V1: "V1",
  "Add images": "إضافة صور",
  "Add ready items or mark as ordered from SHEIN":
    "أضف العناصر الجاهزة أو حدد الدفعة كتم طلبها من شي إن",
  "Add tracking details then mark as shipped":
    "أضف تفاصيل التتبع ثم حددها كمشحونة",
  "Admin console": "لوحة الإدارة",
  "Admin Dashboard | RS Store": "لوحة الإدارة | متجر RS",
  "Admin system": "نظام الإدارة",
  Advanced: "متقدم",
  "Advanced pricing input. Review before publishing imported products.":
    "إدخال تسعير متقدم. راجعه قبل نشر المنتجات المستوردة.",
  "Arrived Egypt": "وصل إلى مصر",
  "Arrived Kuwait": "وصل إلى الكويت",
  "At Customs": "في الجمارك",
  Bahrain: "البحرين",
  "Cash at store": "نقدًا في المتجر",
  "Cash review": "مراجعة الدفع النقدي",
  "Close menu": "إغلاق القائمة",
  "Compact menu": "تصغير القائمة",
  "Complete order": "إكمال الطلب",
  "Confirm customs clearance and move the batch to Arrived Egypt":
    "أكّد انتهاء التخليص الجمركي وانقل الدفعة إلى وصلت إلى مصر",
  "Confirm local arrival and move the batch to Arrived Shop":
    "أكّد الوصول المحلي وانقل الدفعة إلى وصلت إلى المتجر",
  "Confirm order": "تأكيد الطلب",
  "Confirm that the remaining cash amount was received at the store before delivery.":
    "أكّد استلام المبلغ النقدي المتبقي في المتجر قبل التسليم.",
  "Creating Product": "جارٍ إنشاء المنتج",
  Daily: "يومي",
  "Deposit Approved": "تم اعتماد العربون",
  "Deposit proof": "إثبات العربون",
  "Deposit Rejected": "تم رفض العربون",
  "Expand menu": "توسيع القائمة",
  Extracting: "جارٍ الاستخراج",
  Failed: "فشل",
  "Final Payment Approved": "تم اعتماد الدفعة النهائية",
  "Final payment is paid. Mark delivered when handed to the customer":
    "تم دفع الدفعة النهائية. حدّد الطلب كمُسلَّم عند تسليمه للعميل",
  "Final payment opens automatically. Use Delivery after payment approval":
    "تُفتح الدفعة النهائية تلقائيًا. استخدم التسليم بعد اعتماد الدفع",
  "Final payment proof": "إثبات الدفعة النهائية",
  "Final Payment Rejected": "تم رفض الدفعة النهائية",
  "Follow shipment until it reaches customs": "تابع الشحنة حتى تصل إلى الجمارك",
  "If approved, the order becomes fully paid and moves to Ready To Deliver.":
    "عند الاعتماد يصبح الطلب مدفوعًا بالكامل وينتقل إلى جاهز للتسليم.",
  "If approved, this order leaves Payments Review and appears in Orders as ready for SHEIN batching.":
    "عند الاعتماد يغادر الطلب مراجعة المدفوعات ويظهر في الطلبات كجاهز للإضافة إلى دفعة شي إن.",
  Kuwait: "الكويت",
  Logout: "تسجيل الخروج",
  Manual: "يدوي",
  "Manual review if failed": "مراجعة يدوية عند الفشل",
  "Manual Review on Failure": "مراجعة يدوية عند الفشل",
  "Manual Review Required": "مطلوب مراجعة يدوية",
  "Mark as shipped": "تحديد كمشحون",
  "Most used. Vodafone fee applies only to Vodafone Cash payments.":
    "الأكثر استخدامًا. تُطبق رسوم فودافون فقط على مدفوعات فودافون كاش.",
  "Needs payment review": "يحتاج إلى مراجعة الدفع",
  "No admin action is required until the customer uploads a corrected final payment proof.":
    "لا يلزم إجراء من الإدارة حتى يرفع العميل إثبات دفعة نهائية مصححًا.",
  "No admin action is required until the customer uploads a new deposit proof.":
    "لا يلزم إجراء من الإدارة حتى يرفع العميل إثبات عربون جديدًا.",
  Oman: "عُمان",
  "Open admin menu": "فتح قائمة الإدارة",
  "Open import": "فتح الاستيراد",
  "Open SHEIN with Country and Currency": "فتح شي إن بالدولة والعملة",
  "Open SHEIN with selected country and currency":
    "فتح شي إن بالدولة والعملة المحددتين",
  Operations: "العمليات",
  "Premium admin system": "نظام إدارة متميز",
  "Prepare SHEIN Link": "تجهيز رابط شي إن",
  "Prepare SHEIN link": "تجهيز رابط شي إن",
  "Prepare the order for delivery": "تجهيز الطلب للتسليم",
  "Preview Ready": "المعاينة جاهزة",
  "Preview ready": "المعاينة جاهزة",
  Qatar: "قطر",
  "Ready to Publish": "جاهز للنشر",
  "Review deposit proof": "مراجعة إثبات العربون",
  "Review final payment before delivery": "مراجعة الدفعة النهائية قبل التسليم",
  "Review final payment proof": "مراجعة إثبات الدفعة النهائية",
  Reviewed: "تمت المراجعة",
  "RS Store private admin dashboard": "لوحة الإدارة الخاصة بمتجر RS",
  "Saudi Arabia": "المملكة العربية السعودية",
  "Secure admin session": "جلسة إدارة آمنة",
  "Show preview if successful": "عرض المعاينة عند النجاح",
  "Show Preview on Success": "عرض المعاينة عند النجاح",
  "Skip to content": "الانتقال إلى المحتوى",
  "Start import session": "بدء جلسة الاستيراد",
  "Start Import Session": "بدء جلسة الاستيراد",
  "Start processing": "بدء المعالجة",
  Submitted: "تم الإرسال",
  Success: "نجاح",
  "This customer order is cancelled": "طلب العميل هذا ملغي",
  "This customer order is completed": "طلب العميل هذا مكتمل",
  "Try Extraction": "محاولة الاستخراج",
  "Try extraction": "محاولة الاستخراج",
  "Under review": "قيد المراجعة",
  "Under Review": "قيد المراجعة",
  "United Arab Emirates": "الإمارات العربية المتحدة",
  "Update stock": "تحديث المخزون",
  "Update this when customer contact details change.":
    "حدّث هذا عند تغيير بيانات تواصل العملاء.",
  "Use Delivery to deliver paid customer orders":
    "استخدم التسليم لتسليم طلبات العملاء المدفوعة",
  "Usually changed less often.": "عادةً ما يتغير بصورة أقل.",
  Verification: "التحقق",
  "View store": "عرض المتجر",
  Waiting: "قيد الانتظار",
  "Waiting Admin Review": "بانتظار مراجعة الإدارة",
  "Waiting Deposit": "بانتظار العربون",
  "Waiting for corrected final payment proof": "بانتظار إثبات دفعة نهائية مصحح",
  "Waiting for new deposit proof": "بانتظار إثبات عربون جديد",
  "Manual Review": "مراجعة يدوية",
  "Ready for batch": "جاهز للدفعة",
  "In batch": "ضمن دفعة",
  "Today revenue": "إيرادات اليوم",
  "Total orders": "إجمالي الطلبات",
  "Review payment": "مراجعة الدفعة",
};

const caseInsensitiveTranslations = new Map(
  Object.entries(ADMIN_ARABIC_TRANSLATIONS).map(([key, value]) => [
    key.toLocaleLowerCase("en"),
    value,
  ]),
);

const originalTexts = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const translatedAttributeNames = [
  "placeholder",
  "title",
  "aria-label",
  "alt",
] as const;
const arabicTextPattern = /[\u0600-\u06ff]/u;

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function lookup(value: string) {
  return (
    ADMIN_ARABIC_TRANSLATIONS[value] ??
    caseInsensitiveTranslations.get(value.toLocaleLowerCase("en"))
  );
}

function preserveOuterWhitespace(original: string, translated: string) {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function translatePunctuatedLabel(value: string) {
  const match = value.match(/^([·•✓✔✅✕✖❌–—-]*\s*)(.*?)(\s*[:：–—-]?)$/u);
  if (!match) return undefined;
  const [, prefix, core, suffix] = match;
  const translated = lookup(core.trim());
  return translated ? `${prefix}${translated}${suffix}` : undefined;
}

function translateDynamicText(value: string) {
  const translatedValue = (text: string) => translateAdminText(text).trim();
  const rules: Array<[RegExp, (...matches: string[]) => string]> = [
    [/^Page (\d+) of (\d+)$/i, (_, page, pages) => `صفحة ${page} من ${pages}`],
    [
      /^Showing (\d+)[–-](\d+) of (\d+)$/i,
      (_, from, to, total) => `عرض ${from}–${to} من ${total}`,
    ],
    [/^(\d+) operations?$/i, (_, count) => `${count} عملية`],
    [
      /^(\d+) categories saved in database$/i,
      (_, count) => `تم حفظ ${count} قسم في قاعدة البيانات`,
    ],
    [/^Upload (.+)$/i, (_, label) => `رفع ${translatedValue(label)}`],
    [
      /^(\d+) matching custom order requests?$/i,
      (_, count) => `${count} طلب خاص مطابق`,
    ],
    [
      /^(\d+) tasks? need review$/i,
      (_, count) => `${count} مهمة تحتاج إلى مراجعة`,
    ],
    [/^(\d+) new orders?$/i, (_, count) => `${count} طلب جديد`],
    [/^(\d+) orders? today$/i, (_, count) => `${count} طلب اليوم`],
    [
      /^(\d+) published, (\d+) draft$/i,
      (_, published, draft) => `${published} منشور، ${draft} مسودة`,
    ],
    [/^(\d+) scheduled sales?$/i, (_, count) => `${count} عرض مجدول`],
    [/^(\d+) failed$/i, (_, count) => `${count} فشل`],
    [/^(\d+) notifications?$/i, (_, count) => `${count} إشعار`],
    [/^(\d+) of (\d+)$/i, (_, current, total) => `${current} من ${total}`],
    [
      /^(\d+) product\(s\) added to sale$/i,
      (_, count) => `تمت إضافة ${count} منتج إلى العرض`,
    ],
    [
      /^(\d+) sales? · page (\d+) of (\d+)$/i,
      (_, count, page, pages) => `${count} عرض · صفحة ${page} من ${pages}`,
    ],
    [
      /^Add (\d+) selected product\(s\) to sale$/i,
      (_, count) => `إضافة ${count} منتج محدد إلى العرض`,
    ],
    [/^From (.+) to (.+)$/i, (_, from, to) => `من ${from} إلى ${to}`],
    [/^Select sale (.+)$/i, (_, sale) => `اختر العرض ${sale}`],
    [
      /^(\d+) orders? in (.+)$/i,
      (_, count, status) => `${count} طلب في ${translatedValue(status)}`,
    ],
    [/^Select order (.+)$/i, (_, order) => `اختر الطلب ${order}`],
    [/^Order (.+)$/i, (_, order) => `الطلب ${order}`],
    [
      /^Current queue: (.+)$/i,
      (_, queue) => `القائمة الحالية: ${translatedValue(queue)}`,
    ],
    [/^(\d+) payment items?$/i, (_, count) => `${count} عنصر دفع`],
    [/^Select payment (.+)$/i, (_, payment) => `اختر الدفعة ${payment}`],
    [/^Payment (?!type:)(.+)$/i, (_, payment) => `الدفعة ${payment}`],
    [/^Order: (.+)$/i, (_, order) => `الطلب: ${order}`],
    [/^Customer: (.+)$/i, (_, customer) => `العميل: ${customer}`],
    [/^Product: (.+)$/i, (_, product) => `المنتج: ${product}`],
    [/^Amount affected: (.+)$/i, (_, amount) => `المبلغ المتأثر: ${amount}`],
    [
      /^Payment type: (.+)$/i,
      (_, type) => `نوع الدفع: ${translatedValue(type)}`,
    ],
    [
      /^(.+) deposit \+ (.+) final$/i,
      (_, deposit, final) => `${deposit} عربون + ${final} دفعة نهائية`,
    ],
    [
      /^(\d+) total pieces in all batches$/i,
      (_, count) => `${count} قطعة إجمالًا في كل الدفعات`,
    ],
    [
      /^(\d+) active orders from (\d+) total$/i,
      (_, active, total) => `${active} طلب نشط من إجمالي ${total}`,
    ],
    [
      /^(\d+) open batches with (\d+) active pieces$/i,
      (_, batches, pieces) => `${batches} دفعة مفتوحة تضم ${pieces} قطعة نشطة`,
    ],
    [/^(.+) saved$/i, (_, section) => `تم حفظ ${translatedValue(section)}`],
    [/^(\d+) days$/i, (_, days) => `${days} يوم`],
    [/^(.+) is required$/i, (_, field) => `${translatedValue(field)} مطلوب`],
    [
      /^(.+) must be a number$/i,
      (_, field) => `يجب أن يكون ${translatedValue(field)} رقمًا`,
    ],
    [
      /^(.+) is below allowed minimum$/i,
      (_, field) => `${translatedValue(field)} أقل من الحد الأدنى المسموح`,
    ],
    [
      /^(.+) is above allowed maximum$/i,
      (_, field) => `${translatedValue(field)} أعلى من الحد الأقصى المسموح`,
    ],
    [
      /^Missing settings registry definition for (.+)$/i,
      (_, key) => `تعريف إعدادات السجل مفقود للمفتاح ${key}`,
    ],
    [
      /^(.+) created with (\d+) item\(s\)$/i,
      (_, batch, count) => `تم إنشاء ${batch} بعدد ${count} عنصر`,
    ],
    [
      /^Select (?!batch |order |payment |sale )(.+)$/i,
      (_, item) => `اختر ${item}`,
    ],
    [
      /^Move batch to (.+)\?$/i,
      (_, status) => `نقل الدفعة إلى ${translatedValue(status)}؟`,
    ],
    [
      /^This action will update (\d+) item\(s\) and may open final payment for customer orders\.$/i,
      (_, count) =>
        `سيحدّث هذا الإجراء ${count} عنصر وقد يفتح الدفعة النهائية لطلبات العملاء.`,
    ],
    [
      /^This action will update (\d+) non-cancelled item\(s\) in this batch\.$/i,
      (_, count) => `سيحدّث هذا الإجراء ${count} عنصر غير ملغي في هذه الدفعة.`,
    ],
    [/^Batch: (.+)$/i, (_, batch) => `الدفعة: ${batch}`],
    [
      /^Customer orders affected: (\d+)$/i,
      (_, count) => `طلبات العملاء المتأثرة: ${count}`,
    ],
    [
      /^Item tracking will sync to: (.+)$/i,
      (_, status) => `ستتم مزامنة تتبع العنصر إلى: ${translatedValue(status)}`,
    ],
    [/^Move To (.+)$/i, (_, status) => `نقل إلى ${translatedValue(status)}`],
    [
      /^Batch moved to (.+)\. Final payment opened for ready orders\.$/i,
      (_, status) =>
        `تم نقل الدفعة إلى ${translatedValue(status)}. فُتحت الدفعة النهائية للطلبات الجاهزة.`,
    ],
    [
      /^Batch moved to (.+) and items synced$/i,
      (_, status) =>
        `تم نقل الدفعة إلى ${translatedValue(status)} ومزامنة العناصر`,
    ],
    [
      /^Bulk tracking moved to (.+)$/i,
      (_, status) => `تم نقل التتبع الجماعي إلى ${translatedValue(status)}`,
    ],
    [
      /^Manual item tracking override to (.+)$/i,
      (_, status) =>
        `تم تجاوز تتبع العنصر يدويًا إلى ${translatedValue(status)}`,
    ],
    [
      /^Item status updated to (.+)$/i,
      (_, status) => `تم تحديث حالة العنصر إلى ${translatedValue(status)}`,
    ],
    [
      /^(.+) is already (ready to deliver|delivered)$/i,
      (_, order, status) => `${order} حالته بالفعل ${translatedValue(status)}`,
    ],
    [
      /^Status steps to apply: (.+)$/i,
      (_, steps) => `خطوات الحالة المطلوب تطبيقها: ${steps}`,
    ],
    [
      /^Delivery update from SHEIN batch (.+)$/i,
      (_, batch) => `تحديث التسليم من دفعة شي إن ${batch}`,
    ],
    [
      /^(.+) marked ready to deliver$/i,
      (_, order) => `تم تحديد ${order} كجاهز للتسليم`,
    ],
    [/^(.+) marked delivered$/i, (_, order) => `تم تحديد ${order} كمُسلَّم`],
    [/^([^\d].*) batches$/i, (_, status) => `دفعات ${translatedValue(status)}`],
    [
      /^(\d+) batch in this stage$/i,
      (_, count) => `${count} دفعة في هذه المرحلة`,
    ],
    [/^Select batch (.+)$/i, (_, batch) => `اختر الدفعة ${batch}`],
    [/^(.+) Details$/i, (_, value) => `تفاصيل ${value}`],
    [
      /^Cleanup completed\. Database records (\d+)\. Cloudinary files (\d+)\.$/i,
      (_, records, files) =>
        `اكتمل التنظيف. سجلات قاعدة البيانات ${records}. ملفات Cloudinary ${files}.`,
    ],
    [
      /^Discount (\d+(?:\.\d+)?)% applied to (\d+) products$/i,
      (_, discount, count) => `تم تطبيق خصم ${discount}% على ${count} منتج`,
    ],
    [/^(\d+) products?$/i, (_, count) => `${count} منتج`],
    [/^Edit product (.+)$/i, (_, product) => `تعديل المنتج ${product}`],
    [/^([\d.,-]+) EGP$/i, (_, amount) => `${amount} ج.م`],
    [/^([\d.,-]+) SAR$/i, (_, amount) => `${amount} ر.س`],
    [
      /^(.+)\. Still waiting for the SHEIN CAPTCHA\/product page; keep the Chrome window open\.$/i,
      (_, message) =>
        `${translatedValue(message)}. ما زلنا ننتظر اختبار CAPTCHA أو صفحة منتج شي إن؛ اترك نافذة Chrome مفتوحة.`,
    ],
    [/^Option (\d+)$/i, (_, option) => `الخيار ${option}`],
    [/^Page (\d+) of (\d+)$/i, (_, page, pages) => `صفحة ${page} من ${pages}`],
    [/^(\d+) results?$/i, (_, count) => `${count} نتيجة`],
    [/^(\d+) items?$/i, (_, count) => `${count} عنصر`],
    [/^(\d+) item\(s\)$/i, (_, count) => `${count} عنصر`],
    [/^(\d+) orders?$/i, (_, count) => `${count} طلب`],
    [/^(\d+) pieces?$/i, (_, count) => `${count} قطعة`],
    [/^(\d+) batches?$/i, (_, count) => `${count} دفعة`],
    [/^Step (\d+)$/i, (_, step) => `الخطوة ${step}`],
    [/^Batch #?(.+)$/i, (_, code) => `الدفعة ${code}`],
    [/^Total: (.+)$/i, (_, amount) => `الإجمالي: ${amount}`],
    [/^Subtotal: (.+)$/i, (_, amount) => `الإجمالي الفرعي: ${amount}`],
    [/^Remaining: (.+)$/i, (_, amount) => `المتبقي: ${amount}`],
    [/^Paid: (.+)$/i, (_, amount) => `المدفوع: ${amount}`],
    [/^Qty: (.+)$/i, (_, quantity) => `الكمية: ${quantity}`],
    [/^Reason: (.+)$/i, (_, reason) => `السبب: ${reason}`],
    [/^Status: (.+)$/i, (_, status) => `الحالة: ${translatedValue(status)}`],
    [/^Created by (.+)$/i, (_, user) => `أنشأه ${user}`],
    [/^Updated by (.+)$/i, (_, user) => `حدّثه ${user}`],
    [/^Search: [“"](.+)[”"]?$/i, (_, query) => `البحث: «${query}»`],
    [/^(\d+) selected$/i, (_, count) => `تم تحديد ${count}`],
  ];

  for (const [pattern, render] of rules) {
    const match = value.match(pattern);
    if (match) return render(...match);
  }
  return undefined;
}

export function translateAdminText(original: string) {
  const normalized = normalize(original);
  if (!normalized) return original;

  const exact = lookup(normalized);
  if (exact) return preserveOuterWhitespace(original, exact);

  const punctuated = translatePunctuatedLabel(normalized);
  if (punctuated) return preserveOuterWhitespace(original, punctuated);

  const dynamic = translateDynamicText(normalized);
  return dynamic ? preserveOuterWhitespace(original, dynamic) : original;
}

function shouldSkip(node: Node) {
  const element = node instanceof Element ? node : node.parentElement;
  return Boolean(
    element?.closest(
      'script, style, code, pre, [data-no-admin-translate], input[type="hidden"], [contenteditable="true"]',
    ),
  );
}

function localizeTextNode(
  text: Text,
  language: Language,
  captureCurrent = false,
) {
  if (shouldSkip(text)) return;

  const cachedOriginal = originalTexts.get(text);
  if (captureCurrent && cachedOriginal !== undefined) {
    const expected =
      language === "ar" ? translateAdminText(cachedOriginal) : cachedOriginal;
    if (text.data !== expected && !arabicTextPattern.test(text.data)) {
      originalTexts.set(text, text.data);
    }
  }

  const original = originalTexts.get(text) ?? text.data;
  originalTexts.set(text, original);
  const localized = language === "ar" ? translateAdminText(original) : original;
  if (text.data !== localized) text.data = localized;
}

function localizeAttribute(
  element: Element,
  attribute: (typeof translatedAttributeNames)[number],
  language: Language,
  captureCurrent = false,
) {
  if (shouldSkip(element)) return;
  const current = element.getAttribute(attribute);
  if (current === null) return;

  let values = originalAttributes.get(element);
  if (!values) {
    values = new Map();
    originalAttributes.set(element, values);
  }

  const cachedOriginal = values.get(attribute);
  if (captureCurrent && cachedOriginal !== undefined) {
    const expected =
      language === "ar" ? translateAdminText(cachedOriginal) : cachedOriginal;
    if (current !== expected && !arabicTextPattern.test(current)) {
      values.set(attribute, current);
    }
  }

  if (!values.has(attribute)) values.set(attribute, current);
  const original = values.get(attribute) ?? current;
  const localized = language === "ar" ? translateAdminText(original) : original;
  if (current !== localized) element.setAttribute(attribute, localized);
}

function applyAdminLocalization(
  root: ParentNode,
  language: Language,
  captureCurrent = false,
) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    localizeTextNode(node as Text, language, captureCurrent);
  }

  const elements =
    root instanceof Element
      ? [root, ...root.querySelectorAll("*")]
      : [...root.querySelectorAll("*")];

  for (const element of elements) {
    for (const attribute of translatedAttributeNames) {
      localizeAttribute(element, attribute, language, captureCurrent);
    }
  }
}

export function useAdminArabicLocalization(language: Language) {
  const languageRef = useRef(language);
  languageRef.current = language;

  useEffect(() => {
    const root = document.getElementById("admin-root");
    if (!root) return;

    applyAdminLocalization(root, languageRef.current, true);
    const observer = new MutationObserver((mutations) => {
      const activeLanguage = languageRef.current;
      for (const mutation of mutations) {
        if (
          mutation.type === "characterData" &&
          mutation.target instanceof Text
        ) {
          localizeTextNode(mutation.target, activeLanguage, true);
          continue;
        }

        if (
          mutation.type === "attributes" &&
          mutation.target instanceof Element
        ) {
          const attribute = mutation.attributeName;
          if (
            attribute &&
            translatedAttributeNames.includes(
              attribute as (typeof translatedAttributeNames)[number],
            )
          ) {
            localizeAttribute(
              mutation.target,
              attribute as (typeof translatedAttributeNames)[number],
              activeLanguage,
              true,
            );
          }
          continue;
        }

        for (const node of mutation.addedNodes) {
          if (node instanceof Text) {
            localizeTextNode(node, activeLanguage);
          } else if (
            node instanceof Element ||
            node instanceof DocumentFragment
          ) {
            applyAdminLocalization(node, activeLanguage);
          }
        }
      }
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...translatedAttributeNames],
    });
    return () => {
      observer.disconnect();
    };
  }, [language]);
}
