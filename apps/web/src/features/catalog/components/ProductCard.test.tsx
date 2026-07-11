import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderWithRouter, createMockProduct } from '@/test/test-utils';
import { ProductCard } from '@/features/catalog/components/ProductCard';

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function createProductWithImage(slug: string) {
  return createMockProduct({
    slug,
    imageCount: 1,
    primaryImage: {
      id: `${slug}-image`,
      url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      width: 600,
      height: 750,
      altText: 'Product image',
      isPrimary: true,
      sortOrder: 0,
    },
  });
}

describe('ProductCard primary action behavior', () => {
  it('navigates to product details for products without variants instead of adding an invalid cart item', async () => {
    const product = createMockProduct({ slug: 'product-direct', variantCount: 0 });
    renderWithRouter(
      <>
        <ProductCard product={product} />
        <LocationProbe />
      </>,
    );

    await userEvent.click(screen.getByRole('button', { name: /View details/i }));

    expect(screen.getByTestId('location').textContent).toBe('/products/product-direct');
  });

  it('navigates variant products to product details for option selection', async () => {
    const product = createMockProduct({ slug: 'variant-product', variantCount: 3 });
    renderWithRouter(
      <>
        <ProductCard product={product} />
        <LocationProbe />
      </>,
    );

    await userEvent.click(screen.getByRole('button', { name: /Select options/i }));

    expect(screen.getByTestId('location').textContent).toBe('/products/variant-product');
  });
});

describe('ProductCard discount display', () => {
  it('shows black price for products without discount', () => {
    const product = createMockProduct({
      slug: 'no-discount',
      price: { amount: '750.00', currency: 'EGP' },
      originalPrice: null,
    });
    renderWithRouter(<ProductCard product={product} />);

    const priceElement = screen.getByText(/EGP\s*750/);
    expect(priceElement).toBeInTheDocument();
    expect(priceElement).toHaveClass('text-rs-ink');
    expect(priceElement).not.toHaveClass('rs-price-primary');
  });

  it('shows red price for discounted products', () => {
    const product = createMockProduct({
      slug: 'with-discount',
      price: { amount: '750.00', currency: 'EGP' },
      originalPrice: { amount: '1000.00', currency: 'EGP' },
    });
    renderWithRouter(<ProductCard product={product} />);

    const priceElement = screen.getByText(/EGP\s*750/);
    expect(priceElement).toHaveClass('rs-price-primary');
  });

  it('shows old price with line-through for discounted products', () => {
    const product = createMockProduct({
      slug: 'with-discount',
      price: { amount: '750.00', currency: 'EGP' },
      originalPrice: { amount: '1000.00', currency: 'EGP' },
    });
    renderWithRouter(<ProductCard product={product} />);

    const oldPriceElement = screen.getByText(/EGP\s*1[,.]000/);
    expect(oldPriceElement).toBeInTheDocument();
    expect(oldPriceElement).toHaveClass('line-through');
    expect(oldPriceElement).toHaveClass('text-muted-foreground');
  });

  it('shows discount badge for discounted products', () => {
    const product = createMockProduct({
      slug: 'with-discount',
      price: { amount: '750.00', currency: 'EGP' },
      originalPrice: { amount: '1000.00', currency: 'EGP' },
    });
    renderWithRouter(<ProductCard product={product} />);

    const badge = screen.getByLabelText(/Discount 25%/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('-25%');
  });

  it('does not show old price for products without discount', () => {
    const product = createMockProduct({
      slug: 'no-discount',
      price: { amount: '750.00', currency: 'EGP' },
      originalPrice: null,
    });
    renderWithRouter(<ProductCard product={product} />);

    expect(screen.queryByText(/EGP\s*1[,.]000/)).not.toBeInTheDocument();
  });

  it('uses effective flash sale discount percentage when product discount also exists', () => {
    const product = createMockProduct({
      slug: 'flash-sale-priority',
      price: { amount: '800.00', currency: 'EGP' },
      originalPrice: { amount: '1000.00', currency: 'EGP' },
      discount: 10,
      sale: {
        flashSaleId: 'flash-sale-1',
        title: 'Flash Sale',
        discountPercent: '20',
        originalPrice: { amount: '1000.00', currency: 'EGP' },
        discountAmount: { amount: '200.00', currency: 'EGP' },
      },
    });
    renderWithRouter(<ProductCard product={product} />);

    expect(screen.getByLabelText(/Discount 20%/i)).toHaveTextContent('-20%');
  });

  it('can show discount prices from sale payload even when originalPrice is not duplicated', () => {
    const product = createMockProduct({
      slug: 'sale-original-price-fallback',
      price: { amount: '800.00', currency: 'EGP' },
      originalPrice: null,
      sale: {
        flashSaleId: 'flash-sale-1',
        title: 'Flash Sale',
        discountPercent: '20',
        originalPrice: { amount: '1000.00', currency: 'EGP' },
        discountAmount: { amount: '200.00', currency: 'EGP' },
      },
    });
    renderWithRouter(<ProductCard product={product} />);

    expect(screen.getByText(/EGP\s*800/)).toBeInTheDocument();
    expect(screen.getByText(/EGP\s*1[,.]000/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Discount 20%/i)).toHaveTextContent('-20%');
  });

  it('shows the discount amount from the active sale payload', () => {
    const product = createMockProduct({
      slug: 'discount-amount',
      price: { amount: '800.00', currency: 'EGP' },
      originalPrice: { amount: '1000.00', currency: 'EGP' },
      sale: {
        flashSaleId: 'flash-sale-1',
        title: 'Flash Sale',
        discountPercent: '20',
        originalPrice: { amount: '1000.00', currency: 'EGP' },
        discountAmount: { amount: '200.00', currency: 'EGP' },
      },
    });
    renderWithRouter(<ProductCard product={product} />);

    expect(screen.getByText(/Save.*EGP\s*200/i)).toBeInTheDocument();
  });

  it('does not show discount badge for products without discount', () => {
    const product = createMockProduct({
      slug: 'no-discount',
      price: { amount: '750.00', currency: 'EGP' },
      originalPrice: null,
    });
    renderWithRouter(<ProductCard product={product} />);

    expect(screen.queryByLabelText(/Discount/i)).not.toBeInTheDocument();
  });
});

describe('ProductCard image loading priority', () => {
  it('gives only the first product high fetch priority', () => {
    const product = createProductWithImage('priority-product');
    renderWithRouter(<ProductCard product={product} index={0} />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('loading', 'eager');
    expect(image).toHaveAttribute('fetchpriority', 'high');
  });

  it('loads the second product eagerly without high fetch priority', () => {
    const product = createProductWithImage('second-product');
    renderWithRouter(<ProductCard product={product} index={1} />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('loading', 'eager');
    expect(image).not.toHaveAttribute('fetchpriority', 'high');
  });

  it('lazy-loads products below the first row', () => {
    const product = createProductWithImage('below-fold-product');
    renderWithRouter(<ProductCard product={product} index={2} />);

    expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy');
  });
});
