/* eslint-disable react-hooks/exhaustive-deps */
import { FormEvent, useEffect, useState } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import {
  AdminCategory,
  AdminPaginated,
  AdminProduct,
  adminApi,
} from '@/features/admin/api/admin-api';
import {
  AdminCard,
  AdminFilterBar,
  AdminStatusBadge,
} from '@/features/admin/components/AdminDesign';
import { AdminEmpty } from '@/features/admin/components/AdminState';
import { AdminMobileDataCard, AdminMobileField } from '@/features/admin/components/AdminMobileList';
import { AdminPagination } from '@/features/admin/components/AdminPagination';
import { AdminConfirmButton } from '@/features/admin/components/AdminConfirmButton';
import {
  AdminFeedback,
  AdminNoticeState,
  toNotice,
} from '@/features/admin/components/AdminFeedback';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';
import { useAuth } from '@/features/auth';

type ProductFilters = {
  search: string;
  categoryId: string;
  status: string;
  minPrice: string;
  maxPrice: string;
  stockStatus: string;
  sortBy: string;
  sortOrder: string;
  page: number;
};

type Props = {
  categories: AdminCategory[];
  onEdit: (product: AdminProduct) => void;
  onAddNew: () => void;
};

export function AdminProductsList({ categories, onEdit, onAddNew }: Props) {
  const { csrfToken } = useAuth();
  const [response, setResponse] = useState<AdminPaginated<AdminProduct> | null>(null);
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    categoryId: '',
    status: '',
    minPrice: '',
    maxPrice: '',
    stockStatus: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [notice, setNotice] = useState<AdminNoticeState>(null);
  const [bulkDiscount, setBulkDiscount] = useState('');

  async function load(next = filters) {
    try {
      const productsResponse = await adminApi.productsPage(buildProductQuery(next));
      setResponse(productsResponse);
      setNotice(null);
    } catch (error) {
      setNotice(toNotice(error));
    }
  }

  async function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters((current) => ({ ...current, page: 1 }));
    await load({ ...filters, page: 1 });
  }

  async function changePage(page: number) {
    setFilters((current) => ({ ...current, page }));
    await load({ ...filters, page });
  }

  async function handleDelete(id: string) {
    try {
      await adminApi.deleteProduct(id, { csrfToken });
      await load();
    } catch (error) {
      setNotice(toNotice(error));
    }
  }

  async function handleApplyBulkDiscount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const discount = Number(bulkDiscount);
    if (Number.isNaN(discount) || discount < 0 || discount > 100) {
      setNotice({ type: 'error', message: 'Discount must be between 0 and 100' });
      return;
    }

    try {
      const result = await adminApi.applyBulkProductDiscount(discount, { csrfToken });
      await load();
      setNotice({
        type: 'success',
        message: `Discount ${discount}% applied to ${result.updatedCount} products`,
      });
    } catch (error) {
      setNotice(toNotice(error));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const products = response?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))}
            placeholder="Search products..."
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onAddNew}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setIsFilterOpen(true)}
          >
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      <div className="hidden lg:block">
        <FilterPanel
          filters={filters}
          setFilters={setFilters}
          categories={categories}
          onSubmit={submitFilters}
        />
      </div>

      <form
        className="rounded-2xl border bg-card p-3 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-3"
        onSubmit={handleApplyBulkDiscount}
      >
        <div>
          <p className="text-sm font-extrabold">Apply discount to all products</p>
          <p className="text-xs font-semibold text-muted-foreground">
            This updates every product discount shown on the customer store
          </p>
        </div>
        <div className="mt-3 flex gap-2 sm:mt-0">
          <Input
            value={bulkDiscount}
            onChange={(event) => setBulkDiscount(event.target.value)}
            type="number"
            min="0"
            max="100"
            placeholder="Discount %"
            className="w-32"
          />
          <Button type="submit" variant="outline">
            Apply to all
          </Button>
        </div>
      </form>

      <AdminFeedback notice={notice} />

      <AdminCard
        title="Products"
        description={`${response?.meta.total ?? 0} product${response?.meta.total !== 1 ? 's' : ''}`}
        contentClassName="grid gap-3"
      >
        {products.length === 0 ? (
          <AdminEmpty
            message="No products found"
            action={{
              label: 'Clear filters',
              onClick: () => {
                const cleared: ProductFilters = {
                  ...filters,
                  search: '',
                  categoryId: '',
                  status: '',
                  stockStatus: '',
                };
                setFilters(cleared);
                load(cleared);
              },
            }}
          />
        ) : null}
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onEdit={() => onEdit(product)}
            onDelete={() => handleDelete(product.id)}
          />
        ))}
        {response && response.meta.totalPages > 1 && (
          <AdminPagination meta={response.meta} onPageChange={changePage} />
        )}
      </AdminCard>

      {isFilterOpen && (
        <MobileFilterDrawer
          filters={filters}
          setFilters={setFilters}
          categories={categories}
          onClose={() => setIsFilterOpen(false)}
          onSubmit={async () => {
            const next = { ...filters, page: 1 };
            setFilters(next);
            setIsFilterOpen(false);
            await load(next);
          }}
        />
      )}
    </div>
  );
}

function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: AdminProduct;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const primaryImage = product.images?.find((img) => img.isPrimary) ?? product.images?.[0];
  const categoryName = product.category?.nameAr ?? '-';
  const isInStock = product.isInStock !== false;

  return (
    <AdminMobileDataCard
      title={product.nameAr}
      media={
        <ImageWithFallback
          src={primaryImage?.secureUrl}
          alt={product.nameAr}
          className="h-16 w-16 rounded-xl object-cover"
          fallbackVariant="product"
        />
      }
      badge={<AdminStatusBadge value={product.status} />}
      onClick={onEdit}
      ariaLabel={`Edit product ${product.nameAr}`}
      actions={
        <>
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <AdminConfirmButton
            type="button"
            variant="outline"
            size="sm"
            message="Delete this product?"
            onClick={onDelete}
          >
            Delete
          </AdminConfirmButton>
        </>
      }
    >
      <AdminMobileField label="SKU" value={product.sku ?? '-'} dir="ltr" />
      <AdminMobileField label="Category" value={categoryName} />
      <AdminMobileField label="Price" value={<AdminProductPrice product={product} />} dir="ltr" />
      <AdminMobileField
        label="Availability"
        value={isInStock ? 'In Stock' : 'Out of Stock'}
        dir="ltr"
      />
    </AdminMobileDataCard>
  );
}

function FilterPanel({
  filters,
  setFilters,
  categories,
  onSubmit,
}: {
  filters: ProductFilters;
  setFilters: (f: ProductFilters) => void;
  categories: AdminCategory[];
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <AdminFilterBar onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <Select
        value={filters.categoryId}
        onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nameAr}
          </option>
        ))}
      </Select>

      <Select
        value={filters.status}
        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
      >
        <option value="">All statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="DRAFT">Draft</option>
        <option value="ARCHIVED">Archived</option>
      </Select>

      <Select
        value={filters.stockStatus}
        onChange={(e) => setFilters({ ...filters, stockStatus: e.target.value })}
      >
        <option value="">Any stock</option>
        <option value="inStock">In stock</option>
        <option value="outOfStock">Out of stock</option>
      </Select>

      <Input
        value={filters.minPrice}
        onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
        placeholder="Min price"
        type="number"
        min="0"
      />

      <Input
        value={filters.maxPrice}
        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
        placeholder="Max price"
        type="number"
        min="0"
      />

      <Select
        value={filters.sortBy}
        onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
      >
        <option value="createdAt">Sort by date</option>
        <option value="name">Sort by name</option>
        <option value="priceAmount">Sort by price</option>
      </Select>

      <Button type="submit">Apply filters</Button>
    </AdminFilterBar>
  );
}

function MobileFilterDrawer({
  filters,
  setFilters,
  categories,
  onClose,
  onSubmit,
}: {
  filters: ProductFilters;
  setFilters: (f: ProductFilters) => void;
  categories: AdminCategory[];
  onClose: () => void;
  onSubmit: () => void;
}) {
  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close filter drawer"
      />
      <aside className="absolute inset-y-0 right-0 flex h-full w-[min(88vw,360px)] flex-col gap-4 bg-background p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Filter Products</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            categories={categories}
            onSubmit={handleFilterSubmit}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={onSubmit}>
            Apply
          </Button>
        </div>
      </aside>
    </div>
  );
}

function AdminProductPrice({ product }: { product: AdminProduct }) {
  const discount = Number(product.discount ?? product.discountPercent ?? 0);
  const originalAmount = Number(product.priceAmount ?? 0);
  const currency = product.currency || 'EGP';
  if (!Number.isFinite(discount) || discount <= 0) {
    return <>{formatPrice(originalAmount, currency)}</>;
  }

  const newAmount = Math.max(0, Math.round((originalAmount * (100 - discount)) / 100));
  return (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      <span className="text-muted-foreground line-through">
        {formatPrice(originalAmount, currency)}
      </span>
      <span className="text-primary">{formatPrice(newAmount, currency)}</span>
      <span className="text-xs text-green-700">-{discount}%</span>
    </span>
  );
}

function formatPrice(amount: string | number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    Number(amount ?? 0) / 100,
  );
}

function buildProductQuery(filters: ProductFilters): string {
  const params = new URLSearchParams({
    limit: '20',
    page: String(filters.page),
  });
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.status) params.set('status', filters.status);
  if (filters.minPrice) params.set('minPrice', filters.minPrice);
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
  if (filters.stockStatus) params.set('stockStatus', filters.stockStatus);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  return `&${params.toString()}`;
}
