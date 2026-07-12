import { describe, expect, it } from "vitest";
import {
  buildCustomerWhatsappUrl,
  normalizeWhatsappPhone,
} from "@/features/admin/components/AdminDesign";

describe("admin customer WhatsApp message", () => {
  it("builds an Arabic message when the admin language is Arabic", () => {
    const url = buildCustomerWhatsappUrl(
      "01012345678",
      "أحمد",
      "RS-100",
      "DELIVERED",
      "FINAL_PAYMENT_APPROVED",
      "ar",
    );

    expect(url).not.toBeNull();
    const message = new URL(url as string).searchParams.get("text");
    expect(message).toContain("مرحبًا أحمد");
    expect(message).toContain("حالة الطلب: تم التسليم");
    expect(message).toContain("حالة الدفع: تم اعتماد الدفعة النهائية");
  });

  it("keeps the existing English message as the default", () => {
    const url = buildCustomerWhatsappUrl(
      "01012345678",
      "Ahmed",
      "RS-100",
      "DELIVERED",
      "FINAL_PAYMENT_APPROVED",
    );

    expect(normalizeWhatsappPhone("010 1234 5678")).toBe("201012345678");
    const message = new URL(url as string).searchParams.get("text");
    expect(message).toContain("Hello Ahmed");
    expect(message).toContain("Order status: Delivered");
    expect(message).toContain("Payment status: Final Payment Approved");
  });
});
