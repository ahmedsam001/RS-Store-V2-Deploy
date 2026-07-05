import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import {
  adminApi,
  AdminCategory,
  AdminCreateProductInput,
  AdminCreateVariantInput,
  AdminImage,
  AdminProduct,
  AdminVariant,
} from '@/features/admin/api/admin-api';
import { AdminCard, AdminPageHeader } from '@/features/admin/components/AdminDesign';
import { AdminLoading } from '@/features/admin/components/AdminState';
import {
  AdminFeedback,
  AdminNoticeState,
  toNotice,
} from '@/features/admin/components/AdminFeedback';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';
import { AdminProductsList } from '@/features/admin/products/AdminProductsList';
import { ProductForm } from '@/features/admin/products/ProductForm';
import { useAuth } from '@/features/auth';

export function AdminProductsPage() {
  const { csrfToken } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [notice, setNotice] = useState<AdminNoticeState>(null);

  async function loadCategories() {
    try {
      setCategories(await adminApi.categories());
    } catch (error) {
      setNotice(toNotice(error));
    }
  }

  useEffect(() => {
    loadCategories().catch(() => {});
  }, []);

  async function handleCreate(data: AdminCreateProductInput) {
    try {
      await adminApi.createProduct(data, { csrfToken });
      setNotice({ type: 'success', message: 'Product created successfully' });
      setShowCreateForm(false);
    } catch (error) {
      setNotice(toNotice(error));
    }
  }

  async function handleUpdate(data: AdminCreateProductInput, id: string) {
    try {
      await adminApi.updateProduct(id, data, { csrfToken });
      setNotice({ type: 'success', message: 'Product updated successfully' });
      setEditingProduct(null);
    } catch (error) {
      setNotice(toNotice(error));
    }
  }

  async function refreshEditingProduct(id: string) {
    setEditingProduct(await adminApi.product(id));
  }

  if (!categories) return <AdminLoading />;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Products"
        title="Manage Products"
        description="Create, edit, and organize products with full control over pricing and inventory"
      />

      <AdminFeedback notice={notice} />

      {showCreateForm ? (
        <AdminCard title="Create New Product">
          <ProductForm
            categories={categories}
            onSubmit={handleCreate}
            submitLabel="Create Product"
            disabled={false}
          />
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => setShowCreateForm(false)}
          >
            Back to list
          </Button>
        </AdminCard>
      ) : editingProduct ? (
        <AdminCard title="Edit Product">
          <ProductForm
            categories={categories}
            defaultValues={{
              slug: editingProduct.slug,
              nameAr: editingProduct.nameAr,
              nameEn: editingProduct.nameEn ?? undefined,
              description: editingProduct.description ?? undefined,
              sourceSheinUrl: editingProduct.sourceSheinUrl ?? undefined,
              subCategory: editingProduct.subCategory ?? undefined,
              priceAmount: formatMinorUnitForInput(editingProduct.priceAmount),
              sku: editingProduct.sku ?? undefined,
              status: editingProduct.status,
              categoryId: editingProduct.categoryId ?? undefined,
              discount: parseOptionalNumber(
                editingProduct.discount ?? editingProduct.discountPercent,
              ),
              rating: parseOptionalNumber(editingProduct.rating),
              currency: editingProduct.currency,
              isInStock: editingProduct.isInStock,
              stockQuantity: getProductAvailableStock(editingProduct),
            }}
            onSubmit={(data) => handleUpdate(data, editingProduct.id)}
            submitLabel="Save Changes"
            disabled={false}
          />
          {editingProduct.sourceSheinUrl ? (
            <div className="mt-4 rounded-2xl border border-[#efd6c5] bg-[#fffaf3] p-4">
              <p className="text-sm font-extrabold text-[#241611]">SHEIN source link</p>
              <a
                href={editingProduct.sourceSheinUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex max-w-full items-center gap-2 truncate text-sm font-bold text-[#c7831e]"
              >
                <span className="truncate">{editingProduct.sourceSheinUrl}</span>
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            </div>
          ) : null}
          <ProductImageManager
            product={editingProduct}
            onRefresh={() => refreshEditingProduct(editingProduct.id)}
          />
          <ProductVariantManager
            product={editingProduct}
            onRefresh={() => refreshEditingProduct(editingProduct.id)}
          />
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => setEditingProduct(null)}
          >
            Back to list
          </Button>
        </AdminCard>
      ) : (
        <AdminProductsList
          categories={categories}
          onEdit={setEditingProduct}
          onAddNew={() => setShowCreateForm(true)}
        />
      )}
    </div>
  );
}

function ProductVariantManager({
  product,
  onRefresh,
}: {
  product: AdminProduct;
  onRefresh: () => Promise<void>;
}) {
  const { csrfToken } = useAuth();
  const [notice, setNotice] = useState<AdminNoticeState>(null);
  const [isBusy, setIsBusy] = useState(false);
  const variants = product.variants ?? [];

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      setIsBusy(true);
      setNotice(null);
      await action();
      await onRefresh();
      setNotice({ type: 'success', message: success });
    } catch (error) {
      setNotice(toNotice(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function saveVariant(event: FormEvent<HTMLFormElement>, variant: AdminVariant) {
    event.preventDefault();
    const input = readVariantForm(event.currentTarget, product, variant);
    if (!input) {
      setNotice({ type: 'error', message: 'Variant stock must be a non-negative number' });
      return;
    }

    await run(
      () => adminApi.updateVariant(product.id, variant.id, input, { csrfToken }),
      'Variant updated',
    );
  }

  async function createVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = readVariantForm(form, product);
    if (!input) {
      setNotice({ type: 'error', message: 'Variant stock must be a non-negative number' });
      return;
    }

    await run(async () => {
      await adminApi.createVariant(product.id, input, { csrfToken });
      form.reset();
    }, 'Variant added');
  }

  async function deleteVariant(variant: AdminVariant) {
    if (!window.confirm('Delete this variant?')) return;

    await run(
      () => adminApi.deleteVariant(product.id, variant.id, { csrfToken }),
      'Variant deleted',
    );
  }

  return (
    <div className="mt-6 rounded-2xl border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-extrabold">Product variants</h3>
        <p className="text-sm text-muted-foreground">
          Edit size, color, stock, SKU, status, and optional variant pricing.
        </p>
      </div>

      <div className="mt-3">
        <AdminFeedback notice={notice} />
      </div>

      {variants.length === 0 ? (
        <p className="mt-4 rounded-xl bg-muted p-3 text-sm font-semibold text-muted-foreground">
          No variants yet. Add a size or color option below.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {variants.map((variant) => (
            <form
              key={variant.id}
              className="rounded-xl border bg-background p-3"
              onSubmit={(event) => saveVariant(event, variant)}
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Input
                  name="size"
                  placeholder="Size"
                  defaultValue={variant.size ?? ''}
                  disabled={isBusy}
                />
                <Input
                  name="color"
                  placeholder="Color"
                  defaultValue={variant.color ?? ''}
                  disabled={isBusy}
                />
                <Input
                  name="stockQuantity"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Stock"
                  defaultValue={String(variant.stockQuantity ?? 0)}
                  disabled={isBusy}
                />
                <Select name="status" defaultValue={variant.status || 'ACTIVE'} disabled={isBusy}>
                  {VARIANT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {formatVariantStatus(status)}
                    </option>
                  ))}
                </Select>
                <Input
                  name="sku"
                  placeholder="SKU"
                  defaultValue={variant.sku ?? ''}
                  dir="ltr"
                  disabled={isBusy}
                />
                <Input
                  name="priceAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Variant price"
                  defaultValue={formatOptionalMinorUnitForInput(variant.priceAmount)}
                  disabled={isBusy}
                />
                <Input
                  name="nameAr"
                  placeholder="Variant Arabic name"
                  defaultValue={variant.nameAr}
                  disabled={isBusy}
                />
                <Input
                  name="nameEn"
                  placeholder="Variant English name"
                  defaultValue={variant.nameEn ?? ''}
                  disabled={isBusy}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="submit" size="sm" disabled={isBusy}>
                  Save variant
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => deleteVariant(variant)}
                  disabled={isBusy}
                >
                  Delete
                </Button>
              </div>
            </form>
          ))}
        </div>
      )}

      <form className="mt-5 rounded-xl border bg-background p-3" onSubmit={createVariant}>
        <p className="text-sm font-extrabold text-[#241611]">Add variant</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input name="size" placeholder="Size" disabled={isBusy} />
          <Input name="color" placeholder="Color" disabled={isBusy} />
          <Input
            name="stockQuantity"
            type="number"
            min="0"
            step="1"
            placeholder="Stock"
            defaultValue="0"
            disabled={isBusy}
          />
          <Select name="status" defaultValue="ACTIVE" disabled={isBusy}>
            {VARIANT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {formatVariantStatus(status)}
              </option>
            ))}
          </Select>
          <Input name="sku" placeholder="SKU" dir="ltr" disabled={isBusy} />
          <Input
            name="priceAmount"
            type="number"
            step="0.01"
            min="0"
            placeholder="Variant price"
            disabled={isBusy}
          />
          <Input name="nameAr" placeholder="Variant Arabic name" disabled={isBusy} />
          <Input name="nameEn" placeholder="Variant English name" disabled={isBusy} />
        </div>
        <Button type="submit" size="sm" className="mt-3" disabled={isBusy}>
          Add variant
        </Button>
      </form>
    </div>
  );
}

function ProductImageManager({
  product,
  onRefresh,
}: {
  product: AdminProduct;
  onRefresh: () => Promise<void>;
}) {
  const { csrfToken } = useAuth();
  const [notice, setNotice] = useState<AdminNoticeState>(null);
  const [isBusy, setIsBusy] = useState(false);
  const images = product.images ?? [];

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      setIsBusy(true);
      setNotice(null);
      await action();
      await onRefresh();
      setNotice({ type: 'success', message: success });
    } catch (error) {
      setNotice(toNotice(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith('image/'),
    );
    event.target.value = '';
    if (!files.length) return;

    await run(async () => {
      const hasExistingImages = images.length > 0;
      for (const [index, file] of files.entries()) {
        const uploaded = await adminApi.uploadImage(file, 'rs-store/products', { csrfToken });
        await adminApi.addProductImage(
          product.id,
          {
            ...uploaded,
            altTextAr: product.nameAr,
            isPrimary: !hasExistingImages && index === 0,
          },
          { csrfToken },
        );
      }
    }, 'Product images updated');
  }

  return (
    <div className="mt-6 rounded-2xl border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-extrabold">Product images</h3>
          <p className="text-sm text-muted-foreground">
            Images saved here are used directly on the customer store
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-sm font-bold">
          Upload images
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={uploadFiles}
            disabled={isBusy}
          />
        </label>
      </div>

      <div className="mt-3">
        <AdminFeedback notice={notice} />
      </div>

      {images.length === 0 ? (
        <p className="mt-4 rounded-xl bg-muted p-3 text-sm font-semibold text-muted-foreground">
          No product images yet. Upload at least one image so the product appears correctly in the
          storefront.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {images.map((image) => (
            <ProductImageCard
              key={image.id}
              image={image}
              disabled={isBusy}
              onSetPrimary={() =>
                run(
                  () => adminApi.setPrimaryImage(product.id, image.id, { csrfToken }),
                  'Primary image updated',
                )
              }
              onDelete={() =>
                run(
                  () => adminApi.deleteProductImage(image.id, { csrfToken }),
                  'Product image deleted',
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductImageCard({
  image,
  disabled,
  onSetPrimary,
  onDelete,
}: {
  image: AdminImage;
  disabled: boolean;
  onSetPrimary: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border bg-background p-2">
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
        <ImageWithFallback
          src={image.secureUrl}
          alt={image.altTextAr ?? 'Product image'}
          className="h-full w-full object-cover"
          fallbackVariant="product"
        />
        {image.isPrimary ? (
          <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-1 text-xs font-black">
            Primary
          </span>
        ) : null}
      </div>
      <div className="mt-2 grid gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onSetPrimary}
          disabled={disabled || image.isPrimary}
        >
          Set primary
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDelete} disabled={disabled}>
          Delete image
        </Button>
      </div>
    </div>
  );
}

function formatMinorUnitForInput(value: string | number | null | undefined): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '';
  return (numeric / 100).toFixed(2).replace(/\.00$/, '');
}

function formatOptionalMinorUnitForInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  return formatMinorUnitForInput(value);
}

function parseOptionalNumber(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

const VARIANT_STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'] as const;

function formatVariantStatus(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function readVariantForm(
  form: HTMLFormElement,
  product: AdminProduct,
  existing?: AdminVariant,
): AdminCreateVariantInput | null {
  const data = new FormData(form);
  const size = String(data.get('size') ?? '').trim();
  const color = String(data.get('color') ?? '').trim();
  const stockQuantity = Number(data.get('stockQuantity') ?? 0);
  const priceAmount = String(data.get('priceAmount') ?? '').trim();
  const nameAr =
    String(data.get('nameAr') ?? '').trim() ||
    existing?.nameAr ||
    [size, color].filter(Boolean).join(' / ') ||
    product.nameAr;

  if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
    return null;
  }

  return {
    nameAr,
    nameEn: String(data.get('nameEn') ?? '').trim() || undefined,
    sku: String(data.get('sku') ?? '').trim() || undefined,
    size: existing ? size : size || undefined,
    color: existing ? color : color || undefined,
    priceAmount: priceAmount || undefined,
    stockQuantity: Math.trunc(stockQuantity),
    status: String(data.get('status') ?? existing?.status ?? 'ACTIVE') || undefined,
  };
}

function getProductAvailableStock(product: {
  variants?: Array<{ stockQuantity: number }>;
}): number | undefined {
  if (!product.variants?.length) return undefined;
  return Math.max(
    ...product.variants.map((variant) => Math.max(0, Number(variant.stockQuantity) || 0)),
  );
}
