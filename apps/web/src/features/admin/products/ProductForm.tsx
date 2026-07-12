import { FormEvent, useMemo, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { AdminCategory, AdminCreateProductInput } from '@/features/admin/api/admin-api';
import {
  AdminFeedback,
  AdminNoticeState,
  toNotice,
} from '@/features/admin/components/AdminFeedback';
import { AdminFormSection } from '@/features/admin/components/AdminDesign';
import { getSubCategories } from '@/shared/constants/product-categories';

type Props = {
  categories: AdminCategory[];
  onSubmit: (data: AdminCreateProductInput) => Promise<void>;
  submitLabel: string;
  defaultValues?: Partial<AdminCreateProductInput>;
  disabled?: boolean;
};

export function ProductForm({ categories, onSubmit, submitLabel, defaultValues, disabled }: Props) {
  const [notice, setNotice] = useState<AdminNoticeState>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(defaultValues?.categoryId ?? '');

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );

  const subCategories = useMemo(() => {
    const dynamicChildren =
      selectedCategory?.children
        ?.filter((child) => child.isActive !== false)
        .map((child) => child.nameEn || child.nameAr)
        .filter(Boolean) ?? [];
    const staticChildren = getSubCategories(selectedCategory?.slug);
    return Array.from(
      new Set(
        [...dynamicChildren, ...staticChildren, defaultValues?.subCategory].filter(
          Boolean,
        ) as string[],
      ),
    );
  }, [defaultValues?.subCategory, selectedCategory]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const data = readForm(event.currentTarget);
    if (!validate(data)) return;
    try {
      await onSubmit(data);
      if (!defaultValues) event.currentTarget.reset();
    } catch (error) {
      setNotice(toNotice(error));
    }
  }

  function validate(data: AdminCreateProductInput): boolean {
    if (!data.nameAr?.trim()) {
      setNotice({ type: 'error', message: 'Arabic product name is required' });
      return false;
    }
    const price = Number(data.priceAmount);
    if (isNaN(price) || price < 0) {
      setNotice({ type: 'error', message: 'Price must be a non-negative number' });
      return false;
    }
    if (data.discount !== undefined && (data.discount < 0 || data.discount > 100)) {
      setNotice({ type: 'error', message: 'Discount must be between 0 and 100' });
      return false;
    }
    if (data.rating !== undefined && (data.rating < 0 || data.rating > 5)) {
      setNotice({ type: 'error', message: 'Rating must be between 0 and 5' });
      return false;
    }
    return true;
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <AdminFeedback notice={notice} />

      <AdminFormSection title="Basic Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="nameAr"
            placeholder="Product name Arabic"
            defaultValue={defaultValues?.nameAr ?? ''}
            required
            disabled={disabled}
          />
          <Input
            name="nameEn"
            placeholder="Product name English"
            defaultValue={defaultValues?.nameEn ?? ''}
            disabled={disabled}
          />
          <Select
            name="categoryId"
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            disabled={disabled}
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id} data-no-admin-translate>
                {cat.nameEn || cat.nameAr}
              </option>
            ))}
          </Select>
          <Select
            name="subCategory"
            defaultValue={defaultValues?.subCategory ?? ''}
            disabled={disabled || !selectedCategoryId}
          >
            <option value="">Select subcategory</option>
            {subCategories.map((subCategory) => (
              <option key={subCategory} value={subCategory}>
                {subCategory}
              </option>
            ))}
          </Select>
        </div>
      </AdminFormSection>

      <AdminFormSection title="Admin Product Settings">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="slug"
            placeholder="Slug leave empty to auto generate"
            defaultValue={defaultValues?.slug ?? ''}
            dir="ltr"
            disabled={disabled}
          />
          <Input
            name="sku"
            placeholder="SKU"
            defaultValue={defaultValues?.sku ?? ''}
            disabled={disabled}
          />
          <Input
            name="sourceSheinUrl"
            type="url"
            placeholder="Original SHEIN product link"
            defaultValue={defaultValues?.sourceSheinUrl ?? ''}
            dir="ltr"
            disabled={disabled}
          />
          <Select name="status" defaultValue={defaultValues?.status ?? 'DRAFT'} disabled={disabled}>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
          <div>
            <p className="text-sm font-extrabold">Stock Availability</p>
            <div className="mt-2 flex gap-4" role="radiogroup" aria-label="Stock Availability">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="isInStock"
                  value="true"
                  defaultChecked={defaultValues?.isInStock !== false}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <span>✅ In Stock</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="isInStock"
                  value="false"
                  defaultChecked={defaultValues?.isInStock === false}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <span>❌ Out of Stock</span>
              </label>
            </div>
          </div>
        </div>
      </AdminFormSection>

      <AdminFormSection title="Pricing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="priceAmount"
            type="number"
            step="0.01"
            placeholder="Price"
            defaultValue={defaultValues?.priceAmount ?? ''}
            required
            disabled={disabled}
          />
          <Input
            name="discount"
            type="number"
            min="0"
            max="100"
            placeholder="Discount %"
            defaultValue={defaultValues?.discount ?? ''}
            disabled={disabled}
          />
          <Input
            name="rating"
            type="number"
            min="0"
            max="5"
            step="0.1"
            placeholder="Rating 0 - 5"
            defaultValue={defaultValues?.rating ?? ''}
            disabled={disabled}
          />
          <Input
            name="currency"
            placeholder="Currency"
            defaultValue={defaultValues?.currency ?? 'EGP'}
            maxLength={3}
            dir="ltr"
            disabled={disabled}
          />
        </div>
      </AdminFormSection>

      <AdminFormSection title="Description">
        <textarea
          name="description"
          placeholder="Product description"
          defaultValue={defaultValues?.description ?? ''}
          rows={4}
          disabled={disabled}
          className="w-full rounded-2xl border border-input bg-card/90 px-4 py-2.5 text-sm shadow-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      </AdminFormSection>

      <Button type="submit" disabled={disabled}>
        {submitLabel}
      </Button>
    </form>
  );
}

function readForm(form: HTMLFormElement): AdminCreateProductInput {
  const data = new FormData(form);
  const discountRaw = data.get('discount');
  const ratingRaw = data.get('rating');
  const isInStock = String(data.get('isInStock') ?? 'true') === 'true';

  return {
    slug: normalizeSlug(String(data.get('slug') ?? '')),
    nameAr: String(data.get('nameAr') ?? '').trim(),
    nameEn: String(data.get('nameEn') ?? '').trim() || undefined,
    description: String(data.get('description') ?? '').trim() || undefined,
    sourceSheinUrl: String(data.get('sourceSheinUrl') ?? '').trim() || undefined,
    subCategory: String(data.get('subCategory') ?? '').trim() || undefined,
    priceAmount: String(data.get('priceAmount') ?? ''),
    sku: String(data.get('sku') ?? '').trim() || undefined,
    status: String(data.get('status') ?? 'DRAFT') as 'ACTIVE' | 'DRAFT' | 'ARCHIVED',
    categoryId: String(data.get('categoryId') ?? '') || undefined,
    discount: discountRaw ? Number(discountRaw) : undefined,
    rating: ratingRaw ? Number(ratingRaw) : undefined,
    currency:
      String(data.get('currency') ?? '')
        .trim()
        .toUpperCase() || undefined,
    isInStock,
  };
}

function normalizeSlug(value: string): string | undefined {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;
  return trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
