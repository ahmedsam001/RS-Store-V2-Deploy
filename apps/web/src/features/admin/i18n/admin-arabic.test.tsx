import { act, render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import {
  translateAdminText,
  useAdminArabicLocalization,
} from "@/features/admin/i18n/admin-arabic";
import type { Language } from "@/shared/i18n";

function LocalizationFixture({ language }: { language: Language }) {
  const dynamicTextRef = useRef<HTMLSpanElement>(null);
  const dynamicInputRef = useRef<HTMLInputElement>(null);
  useAdminArabicLocalization(language);

  return (
    <div
      id="admin-root"
      lang={language}
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <h1>Results</h1>
      <p>· Qty</p>
      <p>Showing 1–5 of 12</p>
      <p>Custom customer product name</p>
      <p data-no-admin-translate>Order Dress</p>
      <p data-no-admin-translate>Active</p>
      <p data-no-admin-translate>أحمد</p>
      <p>{language === "ar" ? "نظام إدارة احترافي" : "Premium admin system"}</p>
      <input
        placeholder="Search products..."
        title="Filter Products"
        aria-label="Filter Products"
        alt="Product images"
      />
      <span ref={dynamicTextRef}>Loading...</span>
      <input ref={dynamicInputRef} placeholder="Search..." />
      <button
        type="button"
        onClick={() => {
          const text = dynamicTextRef.current?.firstChild;
          if (text instanceof Text) text.data = "Uploading...";
          dynamicInputRef.current?.setAttribute(
            "placeholder",
            "Search this queue",
          );
        }}
      >
        Change dynamic copy
      </button>
    </div>
  );
}

describe("admin Arabic localization", () => {
  it("translates exact, punctuated, and dynamic admin copy", () => {
    expect(translateAdminText("Results")).toBe("النتائج");
    expect(translateAdminText("· Qty")).toBe("· الكمية");
    expect(translateAdminText("Reason:")).toBe("السبب:");
    expect(translateAdminText("Showing 1–5 of 12")).toBe("عرض 1–5 من 12");
    expect(translateAdminText("3 matching custom order requests")).toBe(
      "3 طلب خاص مطابق",
    );
    expect(translateAdminText("Batch: SH-100")).toBe("الدفعة: SH-100");
    expect(translateAdminText("Status: Delivered")).toBe("الحالة: تم التسليم");
  });

  it("translates admin text and translated attributes while preserving unknown content", async () => {
    render(<LocalizationFixture language="ar" />);

    await waitFor(() =>
      expect(screen.getByRole("heading")).toHaveTextContent("النتائج"),
    );
    expect(screen.getByText("· الكمية")).toBeInTheDocument();
    expect(screen.getByText("عرض 1–5 من 12")).toBeInTheDocument();
    expect(
      screen.getByText("Custom customer product name"),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("البحث في المنتجات...")).toHaveAttribute(
      "title",
      "تصفية المنتجات",
    );
    expect(screen.getByPlaceholderText("البحث في المنتجات...")).toHaveAttribute(
      "aria-label",
      "تصفية المنتجات",
    );
    expect(screen.getByText("Order Dress")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("أحمد")).toBeInTheDocument();
    expect(screen.queryByText("Results")).not.toBeInTheDocument();
    expect(screen.queryByText("· Qty")).not.toBeInTheDocument();
    expect(screen.queryByText("Showing 1–5 of 12")).not.toBeInTheDocument();
  });

  it("translates character-data and attribute updates added after the initial render", async () => {
    render(<LocalizationFixture language="ar" />);

    await act(async () => {
      screen.getByRole("button", { name: "Change dynamic copy" }).click();
    });

    await waitFor(() =>
      expect(screen.getByText("جارٍ الرفع...")).toBeInTheDocument(),
    );
    expect(
      screen.getByPlaceholderText("البحث في هذه القائمة"),
    ).toBeInTheDocument();
  });

  it("restores the original English copy when language changes", async () => {
    const view = render(<LocalizationFixture language="ar" />);
    await waitFor(() =>
      expect(screen.getByRole("heading")).toHaveTextContent("النتائج"),
    );

    view.rerender(<LocalizationFixture language="en" />);

    await waitFor(() =>
      expect(screen.getByRole("heading")).toHaveTextContent("Results"),
    );
    expect(screen.getByText("· Qty")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search products...")).toHaveAttribute(
      "title",
      "Filter Products",
    );
    expect(screen.getByPlaceholderText("Search products...")).toHaveAttribute(
      "aria-label",
      "Filter Products",
    );
    expect(screen.getByText("Premium admin system")).toBeInTheDocument();
    expect(screen.queryByText("النتائج")).not.toBeInTheDocument();
    expect(screen.queryByText("نظام إدارة احترافي")).not.toBeInTheDocument();
  });

  it("survives repeated switching without caching Arabic as the English source", async () => {
    const view = render(<LocalizationFixture language="en" />);

    for (const language of ["ar", "en", "ar", "en"] as const) {
      view.rerender(<LocalizationFixture language={language} />);
      await waitFor(() =>
        expect(screen.getByRole("heading")).toHaveTextContent(
          language === "ar" ? "النتائج" : "Results",
        ),
      );
    }

    expect(screen.getByText("Premium admin system")).toBeInTheDocument();
    expect(screen.getByText("Order Dress")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("does not let a stale Arabic observer retranslate English mutations", async () => {
    const view = render(<LocalizationFixture language="ar" />);
    await waitFor(() => expect(screen.getByRole("heading")).toHaveTextContent("النتائج"));

    view.rerender(<LocalizationFixture language="en" />);
    await waitFor(() => expect(screen.getByRole("heading")).toHaveTextContent("Results"));

    await act(async () => {
      screen.getByRole("button", { name: "Change dynamic copy" }).click();
    });

    await waitFor(() => expect(screen.getByText("Uploading...")).toBeInTheDocument());
    expect(screen.getByPlaceholderText("Search this queue")).toBeInTheDocument();
    expect(screen.queryByText("جارٍ الرفع...")).not.toBeInTheDocument();
  });
});
