import type { SheinMarketplaceSettings } from './shein-marketplace';
import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn, execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';
import { SHEIN_MAX_PRODUCT_IMAGES } from './shein-image-filter';
import { SheinPreviewNormalizer } from './shein-preview.normalizer';
import { SheinUrlService } from './shein-url.service';
import { DEFAULT_SHEIN_IMPORT_VARIANT_STOCK, SheinImportPreview, SheinImportStepStatus } from './shein.types';
//import { FIXED_SHEIN_CURRENCY, SheinMarketplaceSettings } from './shein-marketplace';

const DEFAULT_WAIT_MS = 20 * 60_000;
const DEFAULT_POLL_MS = 3_000;

const VISIBLE_PAGE_READER = String.raw`function readVisibleSheinProduct(options) {
  const currencyCode = String(options && options.currencyCode || 'SAR').toUpperCase();
  const countryCode = String(options && options.countryCode || 'KW').toUpperCase();
  const sourceUrl = location.href;
  const text = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const unique = (items) => Array.from(new Set(items.map(text).filter(Boolean)));
  const decode = (value) => {
    try { return String(value || '').replace(/\\u002F/gi, '/').replace(/\\u0026/gi, '&').replace(/\\\//g, '/'); } catch { return String(value || ''); }
  };
  const absolute = (value) => {
    const raw = decode(value).replace(/^\/\//, 'https://').trim();
    if (!raw || /^(data|blob|javascript):/i.test(raw)) return '';
    try { return new URL(raw, location.href).toString(); } catch { return ''; }
  };
  const meta = (property) => text(document.querySelector('meta[property="' + property + '"], meta[name="' + property + '"]')?.getAttribute('content'));
  const bodyText = text(document.body && document.body.innerText);
  const html = document.documentElement ? document.documentElement.innerHTML : '';
  const pageTitle = text(document.title);
  const visibleChallengeElementText = Array.from(document.querySelectorAll('[id], [class], iframe')).slice(0, 800).filter((node) => {
    const rect = typeof node.getBoundingClientRect === 'function' ? node.getBoundingClientRect() : { width: 0, height: 0 };
    const style = window.getComputedStyle ? window.getComputedStyle(node) : null;
    return rect.width > 0 && rect.height > 0 && style?.display !== 'none' && style?.visibility !== 'hidden' && Number(style?.opacity || 1) !== 0;
  }).map((node) => text([node.tagName, node.id, node.className, node.getAttribute('src'), node.getAttribute('title'), node.getAttribute('name'), node.textContent].join(' '))).join(' ');
  const scriptSrcText = Array.from(document.scripts || []).map((node) => text(node.src)).join(' ');
  const visibleChallengeHaystack = [sourceUrl, bodyText, visibleChallengeElementText].join(' ').toLowerCase();
  const hardChallengePattern = /captcha|verify you are human|verify that you are human|verify you are not a robot|complete (?:the )?challenge|slide to complete|slider puzzle|turnstile|cf-turnstile|geetest|px-captcha|arkose|datadome|hcaptcha|recaptcha|shein verification/i;
  const detectCurrency = (value) => {
    const sample = String(value || '');
    if (/\b(?:CHF)\b|swiss\s*franc/i.test(sample)) return 'CHF';
    if (/\b(?:EGP)\b|egyptian\s*pound/i.test(sample)) return 'EGP';
    if (/\b(?:AED)\b|emirati\s*dirham/i.test(sample)) return 'AED';
    if (/\b(?:KWD)\b|kuwaiti\s*dinar/i.test(sample)) return 'KWD';
    if (/\b(?:USD|US\$)\b|us\s*dollar/i.test(sample)) return 'USD';
    if (/\b(?:SAR|SR)\b|saudi\s*riyal/i.test(sample)) return 'SAR';
    return '';
  };
  const productPriceText = text(Array.from(document.querySelectorAll('.product-intro__head-price, [class*="product-intro__head-price" i], [data-testid*="price" i]'))
    .slice(0, 8)
    .map((node) => node.textContent || node.getAttribute('aria-label') || '')
    .join(' '));
  const actualDetectedCurrency = detectCurrency(productPriceText) || detectCurrency(bodyText.slice(0, 5000)) || currencyCode;

  if (document.readyState !== 'complete') {
    return { state: 'loading', sourceUrl, message: 'Waiting for SHEIN page to finish loading' };
  }

  const jsonLd = [];
  for (const node of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    try { jsonLd.push(JSON.parse(node.textContent || '{}')); } catch { /* ignore invalid JSON LD */ }
  }
  const jsonLdText = text(JSON.stringify(jsonLd));
  const scriptsText = Array.from(document.scripts || []).map((node) => node.textContent || '').join('\n').slice(0, 3_000_000);
  const decodedHtml = decode(html);
  const decodedScripts = decode(scriptsText);
  const combinedData = [decodedHtml, jsonLdText, decodedScripts, bodyText].join(' ');
  const hasProductNameSelector = Boolean(document.querySelector('h1.product-intro__head-name, [class*="product-intro__head-name" i], [data-testid*="product" i][data-testid*="title" i], [data-testid*="product" i][data-testid*="name" i]'));
  const hasProductIntro = Boolean(document.querySelector('.product-intro, [class*="product-intro" i], [data-testid*="product-intro" i]'));
  const hasProductPriceSelector = Boolean(document.querySelector('.product-intro__head-price, [class*="product-intro__head-price" i], [data-testid*="price" i]'));
  const hasProductGallerySelector = Boolean(document.querySelector('.product-intro__main img, .product-intro__img img, .product-intro__thumbs img, [class*="product-intro" i] [class*="gallery" i], [class*="product-intro" i] [class*="thumb" i], [class*="product-intro" i] [class*="swiper" i], [class*="gallery" i] img, [class*="thumb" i] img'));
  const hasAddToBag = Boolean(Array.from(document.querySelectorAll('button, [role="button"], a')).some((node) => /add\s+to\s+(bag|cart)|add\s+bag|add\s+cart/i.test(text(node.textContent || node.getAttribute('aria-label') || node.getAttribute('title')))));
  const hasOptionArea = Boolean(document.querySelector('[class*="product-intro" i] [class*="size" i], [class*="product-intro" i] [class*="color" i], [class*="product-intro" i] [class*="sku" i], [data-testid*="size" i], [data-testid*="color" i], [aria-label*="size" i], [aria-label*="color" i]'));
  const productUrlLooksValid = /(?:-p-|goods_id=|goodsid=|product_id=|productid=)\d{5,}/i.test(sourceUrl);
  const badProductName = (value) => {
    const normalized = text(value).toLowerCase();
    if (!normalized || normalized.length < 3) return true;
    if (/captcha|verify|security|login|sign in|robot|restore pages|profile error/i.test(normalized)) return true;
    if (/^(shein|home|categories|just for you|new in|sale|cart|bag|wishlist)$/i.test(normalized)) return true;
    if (/^(swiss franc|egyptian pound|saudi riyal|emirati dirham|us dollar|euro|pound sterling|currency|language)$/i.test(normalized)) return true;
    return false;
  };
  const cleanTitle = (item) => text(item)
    .replace(/\s*[|\-–]\s*SHEIN.*$/i, '')
    .replace(/^SHEIN\s*[-–|]\s*/i, '')
    .trim();
  const titleCandidates = unique([
    document.querySelector('h1.product-intro__head-name')?.textContent,
    document.querySelector('[class*="product-intro__head-name" i]')?.textContent,
    document.querySelector('[data-testid*="product" i][data-testid*="title" i]')?.textContent,
    document.querySelector('[data-testid*="product" i][data-testid*="name" i]')?.textContent,
    document.querySelector('[class*="product" i][class*="title" i]')?.textContent,
    document.querySelector('[class*="product" i][class*="name" i]')?.textContent,
    document.querySelector('h1')?.textContent,
    /"(?:goods_name|goodsName|productName|goodsTitle)"\s*:\s*"([^"\\]{3,220})"/i.exec(combinedData)?.[1]
  ].map(cleanTitle));
  const name = titleCandidates.find((item) => !badProductName(item));

  const numberFrom = (value) => {
    const normalized = String(value || '').replace(/,/g, '').match(/[0-9]+(?:\.[0-9]{1,2})?/);
    return normalized ? Number(normalized[0]) : NaN;
  };
  const priceCandidates = [];
  const hasCurrencyMarker = (value) => new RegExp('(?:' + currencyCode.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&') + '|SAR|SR|EGP|AED|KWD|USD|US\\$|\\$|£|€)', 'i').test(String(value || ''));
  const pushPrice = (value, weight, context = '') => {
    const content = text(value);
    const ctx = text(context).toLowerCase();
    if (!content) return;
    if (/shipping|delivery|installment|tax|coupon|points|free|returns|qty|quantity|add to cart|cart|size guide/.test((content + ' ' + ctx).toLowerCase())) return;
    if (!hasCurrencyMarker(content) && !/price|sale|discount|current|final|amount|retail|special/.test(ctx)) return;
    const amount = numberFrom(content);
    if (Number.isFinite(amount) && amount > 0 && amount < 1000000) priceCandidates.push({ amount, weight });
  };
  const priceSelectors = [
    '.product-intro__head-price .sale-price',
    '.product-intro__head-price [class*="sale" i]',
    '[class*="product-intro__head-price" i] [class*="sale" i]',
    '[class*="product-intro__head-price" i]',
    '[data-testid*="price" i]',
    '[class*="price" i]'
  ];
  for (const selector of priceSelectors) {
    for (const node of Array.from(document.querySelectorAll(selector))) {
      const content = text(node.textContent || node.getAttribute('aria-label'));
      if (!content) continue;
      const className = text(node.className || '');
      const combinedClass = (selector + ' ' + className + ' ' + text(node.getAttribute('data-testid')) + ' ' + text(node.getAttribute('aria-label'))).toLowerCase();
      let weight = selector.includes('product-intro') ? 70 : 20;
      if (/sale|discount|special|current|final|now|new|main/.test(combinedClass)) weight += 80;
      if (/original|old|retail|was/.test(combinedClass) || node.tagName === 'DEL') weight -= 100;
      pushPrice(content, weight, combinedClass);
    }
  }
  const escapedCurrency = currencyCode.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
  const textualPricePatterns = [
    new RegExp('(?:' + escapedCurrency + '|SAR|SR|EGP|AED|KWD|USD|US\\$|\\$|£|€)\\s*([0-9]+(?:[,.][0-9]{1,2})?)', 'ig'),
    /([0-9]+(?:[,.][0-9]{1,2})?)\s*(?:SAR|SR|EGP|AED|KWD|USD|US\$|\$|£|€)/ig,
    /"(?:salePrice|sale_price|discountPrice|finalPrice|currentPrice|priceAmount|unit_price)"\s*:?\s*"?([0-9]+(?:[,.][0-9]{1,2})?)/ig,
    /"(?:retailPrice|price)"\s*:?\s*"?([0-9]+(?:[,.][0-9]{1,2})?)/ig
  ];
  for (const pattern of textualPricePatterns) {
    let match;
    while ((match = pattern.exec(combinedData)) && priceCandidates.length < 100) {
      pushPrice(match[0], /sale|discount|final|current|unit/i.test(pattern.source) ? 55 : 10, pattern.source);
    }
  }
  priceCandidates.sort((a, b) => b.weight - a.weight || a.amount - b.amount);
  const priceAmount = priceCandidates.length ? String(priceCandidates[0].amount.toFixed(2)).replace(/\.00$/, '') : '';

  const descriptionCandidates = unique([
    meta('description'),
    meta('og:description'),
    meta('twitter:description'),
    document.querySelector('[class*="description" i]')?.textContent,
    document.querySelector('[class*="detail" i]')?.textContent,
    /"(?:description|goods_desc|goodsDesc|productDescription)"\s*:\s*"([^"\\]{20,2000})"/i.exec(combinedData)?.[1]
  ].map((item) => text(decode(String(item || '')).replace(/\\u003c[^>]+\\u003e|<[^>]+>/g, ' '))));
  const description = descriptionCandidates.find((item) => item.length >= 20 && !/captcha|verify|security/i.test(item)) || '';

  const rawImages = [];
  const productImagePath = (url) => /(?:ltwebstatic\.com|img\.shein\.com|shein\.com)/i.test(url) && /(?:images\d*_(?:pi|spmp|mp|p)|\/v4\/j\/(?:pi|spmp|mp|p)\/|\/pi\/|\/product\/|\/goods\/)/i.test(url);
  const badImageAsset = (url, context = '') => /facebook|instagram|twitter|youtube|pinterest|snapchat|visa|mastercard|maestro|american\s*express|amex|diners\s*club|discover|paypal|payment|footer|social|logo|icon|sprite|app[-_\s]?store|google[-_\s]?play|qr|flag|currency|size[-_\s]?guide|size[-_\s]?chart|swatch|banner|placeholder|loading|avatar|\/assets\/|\/she_dist\/|blank|base64|grey\.gif|star|rating|review|points?|coupon|badge|shipping|return|favicon|common|download|swiss|franc|profile|measurement|color[-_\s]?block|advert|tracking|pixel/i.test(url + ' ' + context);
  const productImageContext = (context = '') => /product-intro|goods|gallery|thumb|swiper|crop-image|j-image|product-image|main-image|detail-image/i.test(context);
  const imageKey = (url) => url
    .split('?')[0]
    .replace(/_thumbnail_\d+x\d+\.(jpg|jpeg|png|webp|avif)$/i, '_thumbnail')
    .replace(/_\d+x\d+\.(jpg|jpeg|png|webp|avif)$/i, '')
    .replace(/\.(jpg|jpeg|png|webp|avif)$/i, '');
  const pushImage = (value, node, baseScore = 0) => {
    const normalized = absolute(value);
    if (!normalized || !/\.(jpg|jpeg|png|webp|avif)(?:\?|$)/i.test(normalized)) return;
    const context = node ? text([
      node.className,
      node.id,
      node.getAttribute?.('alt'),
      node.getAttribute?.('title'),
      node.closest?.('[class*="product-intro" i], [class*="goods" i], [class*="gallery" i], [class*="thumb" i], [class*="swiper" i], footer, header')?.className,
      node.closest?.('[class]')?.className
    ].join(' ')) : '';
    if (!/(shein|ltwebstatic)/i.test(normalized)) return;
    if (badImageAsset(normalized, context)) return;
    if (!productImagePath(normalized)) return;
    if (node && !productImageContext(context)) return;

    let score = baseScore + 20;
    if (/product-intro|goods|gallery|thumb|swiper|crop-image|j-image|product-image/i.test(context)) score += 80;
    if (/thumbnail|_405x552|_220x293|images\d*_[a-z]+|\/v4\/j\/(?:pi|spmp|mp|p)\//i.test(normalized)) score += 60;
    if (node) {
      const rect = typeof node.getBoundingClientRect === 'function' ? node.getBoundingClientRect() : { width: 0, height: 0, top: 0, left: 0 };
      const naturalWidth = Number(node.naturalWidth || node.width || rect.width || 0);
      const naturalHeight = Number(node.naturalHeight || node.height || rect.height || 0);
      if (naturalWidth && naturalHeight && (naturalWidth < 80 || naturalHeight < 80)) return;
      if (naturalWidth >= 160 && naturalHeight >= 160) score += 40;
      if (rect.width >= 50 && rect.height >= 50 && rect.top >= -50 && rect.top < Math.max(1600, window.innerHeight * 2)) score += 25;
    }

    const key = imageKey(normalized);
    if (!rawImages.some((item) => item.key === key)) rawImages.push({ url: normalized, key, score, order: rawImages.length });
  };
  const bestFromSrcset = (srcset) => {
    const parts = String(srcset || '').split(',').map((entry) => entry.trim()).filter(Boolean).map((entry) => {
      const pieces = entry.split(/\s+/);
      const url = pieces[0] || '';
      const width = Number((pieces[1] || '').replace(/[^0-9.]/g, '')) || 0;
      return { url, width };
    }).filter((item) => item.url);
    parts.sort((a, b) => b.width - a.width);
    return parts[0]?.url || '';
  };
  const pushImageNode = (image, score) => {
    pushImage(image.getAttribute('data-zoom-image'), image, score + 40);
    pushImage(image.getAttribute('data-origin-image'), image, score + 35);
    pushImage(image.getAttribute('data-src'), image, score + 30);
    pushImage(bestFromSrcset(image.getAttribute('srcset')), image, score + 25);
    pushImage(image.currentSrc, image, score + 20);
    pushImage(image.src, image, score + 10);
  };
  for (const selector of [
    '.product-intro__main img',
    '.product-intro__img img',
    '.product-intro__thumbs img',
    '[class*="product-intro" i] [class*="main" i] img',
    '[class*="product-intro" i] [class*="thumb" i] img',
    '[class*="product-intro" i] [class*="gallery" i] img',
    '[class*="product-intro" i] [class*="swiper" i] img',
    '[class*="product-intro" i] picture img',
    '[class*="product-intro" i] img',
    '[class*="goods" i] [class*="main" i] img',
    '[class*="goods" i] [class*="thumb" i] img',
    '[class*="goods" i] [class*="gallery" i] img',
    '[class*="gallery" i] img',
    '[class*="thumb" i] img',
    'picture img'
  ]) {
    for (const image of Array.from(document.querySelectorAll(selector))) pushImageNode(image, 100);
    if (rawImages.length >= 12) break;
  }
  pushImage(meta('og:image'), null, 60);
  pushImage(meta('twitter:image'), null, 60);
  const imageJsonPatterns = [
    /"(?:image_url|goods_img|origin_image|originalImage|imageUrl|goods_img_url|medium_image|big_image|main_image|detail_image)"\s*:\s*"([^"\\]+)"/ig,
    /(?:https?:)?\/\/(?:img\.shein\.com|[^\s"'<>]*ltwebstatic\.com|[^\s"'<>]*shein\.com)\/[^\s"'<>]+?\.(?:jpg|jpeg|png|webp|avif)(?:\?[^\s"'<>]*)?/ig
  ];
  for (const pattern of imageJsonPatterns) {
    let match;
    while ((match = pattern.exec(combinedData)) && rawImages.length < 30) pushImage(match[1] || match[0], null, 25);
  }
  const imageCandidates = rawImages
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((item) => item.url)
    .slice(0, 20);

  const cleanOption = (value) => text(decode(value)).replace(/^[\s:：-]+|[\s:：-]+$/g, '').trim();
  const isBadOption = (value) => /select|choose|guide|chart|model stats|bust|waist|hip|shoulder|length|measurement|quantity|add to cart|cart|sold out|undefined|null|more image/i.test(value);
  const isSizeValue = (value) => /^(?:xxs|xs|s|m|l|xl|xxl|xxxl|[0-9]xl|one size|eu ?[0-9]{2}|us ?[0-9]{1,2}(?:\.[0-9])?|uk ?[0-9]{1,2}(?:\.[0-9])?|[0-9]{1,3}(?:\.[0-9])?|[0-9]{1,2}-[0-9]{1,2}|[0-9]{1,2}y)$/i.test(cleanOption(value));
  const isColorValue = (value) => {
    const cleaned = cleanOption(value);
    return cleaned.length > 1 && cleaned.length <= 40 && !isSizeValue(cleaned) && !isBadOption(cleaned) && !/^(?:color|colour|لون)$/i.test(cleaned);
  };
  const nodeOptionText = (node) => cleanOption(
    node.textContent
      || node.getAttribute('aria-label')
      || node.getAttribute('title')
      || node.getAttribute('alt')
      || node.getAttribute('data-attr-value-name')
      || node.getAttribute('data-attr_value_name')
      || node.getAttribute('data-value')
      || node.getAttribute('value')
  );
  const optionTextFrom = (selector) => unique(Array.from(document.querySelectorAll(selector)).map(nodeOptionText).filter(Boolean));
  const likelySizes = optionTextFrom('[class*="product-intro" i] [class*="size" i] button, [class*="product-intro" i] [class*="size" i] [role="button"], [class*="size" i] button, [class*="size" i] [role="button"], [data-testid*="size" i], [aria-label*="size" i], [class*="sku" i] button, [class*="attr" i] button')
    .filter((item) => !isBadOption(item) && isSizeValue(item));
  const likelyColors = optionTextFrom('[class*="product-intro" i] [class*="color" i] button, [class*="product-intro" i] [class*="color" i] [role="button"], [class*="color" i] button, [class*="color" i] [role="button"], [data-testid*="color" i], [aria-label*="color" i], [class*="color" i] img, [class*="color" i] [title], [class*="color" i] [aria-label]')
    .filter(isColorValue);

  const sizeJsonValues = [];
  const colorJsonValues = [];
  const directSizePattern = /"(?:size|sizeName|size_name|size_name_en|size_name_ar)"\s*:\s*"([^"\\]{1,40})"/ig;
  const directColorPattern = /"(?:color|colour|colorName|color_name|color_name_en|color_name_ar)"\s*:\s*"([^"\\]{1,40})"/ig;
  for (const match of combinedData.matchAll(directSizePattern)) {
    const value = cleanOption(match[1]);
    if (value && !isBadOption(value) && isSizeValue(value)) sizeJsonValues.push(value);
    if (sizeJsonValues.length >= 60) break;
  }
  for (const match of combinedData.matchAll(directColorPattern)) {
    const value = cleanOption(match[1]);
    if (value && isColorValue(value)) colorJsonValues.push(value);
    if (colorJsonValues.length >= 60) break;
  }

  const collectLabeledValues = (labelPattern, target) => {
    const groupPattern = /"(?:attr_name|attrName|attributeName|sku_attr_name|name|label)"\s*:\s*"([^"\\]{1,40})"/ig;
    let groupMatch;
    while ((groupMatch = groupPattern.exec(combinedData)) && target.length < 80) {
      const label = cleanOption(groupMatch[1]);
      if (!labelPattern.test(label)) continue;
      const block = combinedData.slice(groupMatch.index, groupMatch.index + 3500);
      const valuePattern = /"(?:attr_value_name|attrValueName|valueName|attrValue|attr_value|sku_attr_value_name|name|label|value)"\s*:\s*"([^"\\]{1,40})"/ig;
      let valueMatch;
      while ((valueMatch = valuePattern.exec(block)) && target.length < 80) {
        const value = cleanOption(valueMatch[1]);
        if (value && !isBadOption(value)) target.push(value);
      }
    }
  };
  collectLabeledValues(/size|مقاس/i, sizeJsonValues);
  collectLabeledValues(/color|colour|لون/i, colorJsonValues);

  const genericOptionValues = [];
  const optionPattern = /"(?:attr_value_name|attrValueName|valueName|attrValue|goods_attr|sku_attr_value_name)"\s*:\s*"([^"\\]{1,40})"/ig;
  for (const match of combinedData.matchAll(optionPattern)) {
    const value = cleanOption(match[1]);
    if (value && !isBadOption(value)) genericOptionValues.push(value);
    if (genericOptionValues.length >= 100) break;
  }

  const sizeValues = unique([...likelySizes, ...sizeJsonValues, ...genericOptionValues.filter(isSizeValue)]).slice(0, 30);
  const colorValues = unique([...likelyColors, ...colorJsonValues, ...genericOptionValues.filter((value) => !sizeValues.includes(value) && isColorValue(value))]).slice(0, 30);
  const variants = [];
  if (sizeValues.length && colorValues.length && sizeValues.length * colorValues.length <= 80) {
    for (const size of sizeValues) for (const color of colorValues) variants.push({ nameAr: size + ' / ' + color, size, color, stockQuantity: ${DEFAULT_SHEIN_IMPORT_VARIANT_STOCK} });
  } else if (sizeValues.length) {
    for (const size of sizeValues) variants.push({ nameAr: size, size, stockQuantity: ${DEFAULT_SHEIN_IMPORT_VARIANT_STOCK} });
  } else if (colorValues.length) {
    for (const color of colorValues) variants.push({ nameAr: color, color, stockQuantity: ${DEFAULT_SHEIN_IMPORT_VARIANT_STOCK} });
  }

  const sku = /(?:-p-|goods_id=|goodsId=|product_id=)(\d{5,})/i.exec(sourceUrl)?.[1]
    || /"(?:goods_sn|goodsSn|goods_id|goodsId|product_id|sku_code|skuCode)"\s*:?\s*"?([A-Za-z0-9_-]{5,})/i.exec(combinedData)?.[1];
  const hasVisiblePriceSignal = Boolean(priceAmount || (productPriceText && numberFrom(productPriceText) > 0));
  const hasColorOptions = colorValues.length > 0 || Boolean(document.querySelector('[class*="product-intro" i] [class*="color" i], [data-testid*="color" i], [aria-label*="color" i]'));
  const hasSizeOptions = sizeValues.length > 0 || Boolean(document.querySelector('[class*="product-intro" i] [class*="size" i], [data-testid*="size" i], [aria-label*="size" i]'));
  const hasValidGalleryImages = imageCandidates.length >= 2;
  const productReadySignals = [
    Boolean(name),
    hasVisiblePriceSignal,
    Boolean(sku),
    hasColorOptions,
    hasSizeOptions,
    hasProductGallerySelector || hasValidGalleryImages,
    hasAddToBag,
    productUrlLooksValid,
    hasProductIntro
  ].filter(Boolean).length;
  const productReady = productReadySignals >= 4 || Boolean(name && hasVisiblePriceSignal && hasAddToBag);
  const hardCaptchaVisible = hardChallengePattern.test(visibleChallengeHaystack);

  if (!productReady && hardCaptchaVisible) {
    return { state: 'verification', sourceUrl, message: 'SHEIN page requests verification. Complete the CAPTCHA in the open Chrome window and the system will continue automatically.' };
  }
  if (!productReady && productReadySignals < 2) {
    return { state: 'loading', sourceUrl, message: 'Waiting for a fully loaded SHEIN product page after verification' };
  }

  if (!name) return { state: 'loading', sourceUrl, message: 'Waiting for product name to appear on SHEIN page' };
  if (!priceAmount) return { state: 'loading', sourceUrl, message: 'Waiting for price to appear, make sure the page is on the correct currency then wait a moment' };
  if (imageCandidates.length < 2) return { state: 'loading', sourceUrl, message: 'Waiting for at least two valid SHEIN product gallery images to load' };

  return {
    state: 'ready',
    sourceUrl,
    product: {
      sourceUrl,
      name,
      description,
      priceAmount,
      currency: currencyCode,
      country: countryCode,
      actualDetectedCurrency,
      actualDetectedCountry: countryCode,
      sku,
      images: imageCandidates.slice(0, 20),
      variants: variants.slice(0, 80)
    }
  };
}`;

type AssistedBrowserHandle = {
  process: ReturnType<typeof spawn>;
  port: number;
  profileDir: string;
  temporaryProfile: boolean;
};

type AssistedBrowserSession = {
  id: string;
  browser: AssistedBrowserHandle;
  target: ChromeTarget;
  sourceUrl: string;
  preparedUrl: string;
  marketplace: Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'>;
  createdAt: number;
  lastUsedAt: number;
};

export type AssistedSessionReadResult = {
  state: 'ready' | 'verification' | 'loading';
  message: string;
  sourceUrl: string;
  preparedUrl: string;
  preview?: SheinImportPreview;
};

type ChromeTarget = {
  id: string;
  type?: string;
  url?: string;
  title?: string;
  webSocketDebuggerUrl?: string;
};

type VisibleReaderResult = {
  state?: 'loading' | 'verification' | 'ready';
  message?: string;
  sourceUrl?: string;
  product?: {
    sourceUrl?: string;
    name?: string;
    description?: string;
    priceAmount?: string;
    currency?: string;
    country?: string;
    actualDetectedCurrency?: string;
    actualDetectedCountry?: string;
    sku?: string;
    images?: string[];
    variants?: Array<{ nameAr?: string; nameEn?: string; size?: string; color?: string; sku?: string; stockQuantity?: number }>;
  };
};

type StepReporter = (stepId: string, status: SheinImportStepStatus, message?: string) => void;

type WebSocketLike = {
  addEventListener(event: string, listener: (event: { data?: unknown }) => void): void;
  send(payload: string): void;
  close(): void;
};

type WebSocketConstructorLike = new (url: string) => WebSocketLike;

@Injectable()
export class SheinAssistedBrowserService {
  private readonly sessions = new Map<string, AssistedBrowserSession>();

  constructor(
    private readonly configService: ConfigService,
    private readonly urlService: SheinUrlService,
    private readonly normalizer: SheinPreviewNormalizer,
  ) {}

  isInteractiveEnabled(): boolean {
    return this.browserMode() === 'interactive' && this.visibleBrowserCanOpen();
  }

  canOpenVisibleSession(): boolean {
    return this.visibleBrowserCanOpen();
  }

  async openAssistedSession(sessionId: string, sourceUrl: string, marketplace: Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'>): Promise<AssistedSessionReadResult> {
    await this.closeSession(sessionId);
    const browser = await this.openVisibleBrowser();
    try {
      const target = await this.openSheinTarget(browser, sourceUrl, marketplace);
      const preparedUrl = this.marketUrl(sourceUrl, marketplace);
      this.sessions.set(sessionId, {
        id: sessionId,
        browser,
        target,
        sourceUrl,
        preparedUrl,
        marketplace,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
      });
      return this.readAssistedSession(sessionId);
    } catch (error) {
      await this.closeBrowser(browser);
      throw error;
    }
  }

  async readAssistedSession(sessionId: string): Promise<AssistedSessionReadResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new BadRequestException('SHEIN session not open or expired. Start import again.');
    }

    session.lastUsedAt = Date.now();

    let inspected: VisibleReaderResult;
    try {
      session.target = await this.findBestSheinTarget(session.browser.port, session.target.id) ?? session.target;
      if (!this.isBrowserProcessAlive(session.browser) && !session.target.webSocketDebuggerUrl) {
        return {
          state: 'loading',
          message: 'Waiting for visible Chrome DevTools to reconnect. Keep the SHEIN product tab open; the importer will continue automatically.',
          sourceUrl: session.target.url || session.sourceUrl,
          preparedUrl: session.preparedUrl,
        };
      }
      if (session.target.webSocketDebuggerUrl) {
        await this.wakeVisiblePage(session.target.webSocketDebuggerUrl);
      }
      inspected = await this.inspectVisiblePage(session.browser.port, session.target.id, session.marketplace);
    } catch (error) {
      const transientMessage = this.transientDevToolsMessage(error);
      if (!transientMessage) throw error;

      return {
        state: 'loading',
        message: transientMessage,
        sourceUrl: session.target.url || session.sourceUrl,
        preparedUrl: session.preparedUrl,
      };
    }

    if (inspected.state === 'ready' && inspected.product) {
      const preview = this.normalizeVisibleProduct(inspected.product, inspected.sourceUrl || session.sourceUrl, session.marketplace);
      if (!this.isStrictReadyPreview(preview)) {
        return {
          state: 'loading',
          message: 'Waiting for complete product name, price, and at least two valid SHEIN product images',
          sourceUrl: inspected.sourceUrl || session.sourceUrl,
          preparedUrl: session.preparedUrl,
        };
      }
      await this.closeSession(sessionId);
      return {
        state: 'ready',
        message: 'Product data extracted from SHEIN page',
        sourceUrl: inspected.sourceUrl || session.sourceUrl,
        preparedUrl: session.preparedUrl,
        preview,
      };
    }

    const state = inspected.state === 'verification' ? 'verification' : 'loading';
    return {
      state,
      message: inspected.message || (state === 'verification' ? 'SHEIN requires verification. Complete CAPTCHA in the opened browser. The system will keep waiting and continue automatically after it is solved.' : 'SHEIN page is still loading. Complete any popup or login, keep Chrome open, and the system will keep waiting.'),
      sourceUrl: inspected.sourceUrl || session.sourceUrl,
      preparedUrl: session.preparedUrl,
    };
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.sessions.delete(sessionId);
    await this.closeTarget(session.browser.port, session.target.id).catch(() => undefined);
    await this.closeBrowser(session.browser);
  }

  async captureProductPreview(sourceUrl: string, marketplace: Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'>, report: StepReporter): Promise<SheinImportPreview> {
    report('browser_fallback', 'running', 'Opening real Chrome to bypass SHEIN verification like V1');

    const browser = await this.openVisibleBrowser();
    let target: ChromeTarget | null = null;

    try {
      target = await this.openSheinTarget(browser, sourceUrl, marketplace);
      report('browser_fallback', 'success', 'Opened SHEIN in real Chrome window');
      report('read_html', 'verification', 'If CAPTCHA appears, complete it in Chrome window and system will continue automatically');

      const deadline = Date.now() + this.maxWaitMs();
      let lastMessage = '';

      while (Date.now() < deadline) {
        let inspected: VisibleReaderResult;
        try {
          target = await this.findBestSheinTarget(browser.port, target.id) ?? target;
          if (target.webSocketDebuggerUrl) {
            await this.wakeVisiblePage(target.webSocketDebuggerUrl);
          }
          inspected = await this.inspectVisiblePage(browser.port, target.id, marketplace);
        } catch (error) {
          const transientMessage = this.transientDevToolsMessage(error);
          if (!transientMessage) throw error;
          if (transientMessage !== lastMessage) report('read_html', 'running', transientMessage);
          lastMessage = transientMessage;
          await this.sleep(this.pollMs());
          continue;
        }

        if (inspected.state === 'ready' && inspected.product) {
          report('read_html', 'success', 'Verification passed and page read successfully');
          report('extract_product', 'running', 'Preparing product data from Chrome page');
          const preview = this.normalizeVisibleProduct(inspected.product, inspected.sourceUrl || sourceUrl, marketplace);
          if (!this.isStrictReadyPreview(preview)) {
            const message = 'Waiting for complete product name, price, and at least two valid SHEIN product images';
            if (message !== lastMessage) report('read_html', 'running', message);
            lastMessage = message;
            await this.sleep(this.pollMs());
            continue;
          }
          report('extract_product', 'success', 'Extracted name, price, and images from the page');
          report('review_ready', 'success', 'Closed SHEIN tab and returned for product review');
          await this.closeTarget(browser.port, target.id);
          target = null;
          return preview;
        }

        const message = inspected.message || 'Waiting for SHEIN page to complete';
        if (inspected.state === 'verification') {
          report('read_html', 'verification', message);
        } else if (message !== lastMessage) {
          report('read_html', 'running', message);
        }
        lastMessage = message;
        await this.sleep(this.pollMs());
      }

      throw new ServiceUnavailableException('Import timeout completed before SHEIN verification finished. Try again.');
    } finally {
      if (target) {
        await this.closeTarget(browser.port, target.id);
      }
      await this.closeBrowser(browser);
    }
  }

  private normalizeVisibleProduct(product: NonNullable<VisibleReaderResult['product']>, sourceUrl: string, marketplace: Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'>): SheinImportPreview {
    const candidate = {
      slug: product.sku,
      nameAr: product.name || 'SHEIN Product',
      nameEn: product.name || 'SHEIN Product',
      sku: product.sku,
      description: product.description || undefined,
      priceAmount: product.priceAmount || '',
      currency: product.currency || marketplace.currencyCode,
      country: marketplace.countryCode,
      selectedCountry: marketplace.countryCode,
      selectedCurrency: marketplace.currencyCode,
      actualDetectedCountry: product.actualDetectedCountry,
      actualDetectedCurrency: product.actualDetectedCurrency || product.currency,
      sizes: (product.variants || []).map((variant) => variant.size).filter((value): value is string => Boolean(value)),
      colors: (product.variants || []).map((variant) => variant.color).filter((value): value is string => Boolean(value)),
      images: (product.images || []).slice(0, SHEIN_MAX_PRODUCT_IMAGES).map((url) => ({ url })),
      variants: (product.variants || []).map((variant) => ({
        nameAr: variant.nameAr || [variant.size, variant.color].filter(Boolean).join(' / ') || 'Default option',
        nameEn: variant.nameEn,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        stockQuantity: Number.isFinite(Number(variant.stockQuantity)) && Number(variant.stockQuantity) > 0 ? Number(variant.stockQuantity) : DEFAULT_SHEIN_IMPORT_VARIANT_STOCK,
      })),
    };

    return this.normalizer.normalize(candidate, product.sourceUrl || sourceUrl, { marketplace, strictImages: true });
  }

  private isStrictReadyPreview(preview: SheinImportPreview): boolean {
    return Boolean(
      preview.nameAr?.trim()
      && preview.priceAmount?.trim()
      && Number.isFinite(Number(preview.priceAmount))
      && Number(preview.priceAmount) > 0
      && preview.images.length >= 2,
    );
  }

  private async openVisibleBrowser(): Promise<AssistedBrowserHandle> {
    this.assertVisibleBrowserCanOpen();
    const executable = await this.resolveBrowserExecutable();
    const port = await this.freeLocalPort();
    const profile = this.profileDir();
    const profileDir = profile.path;
    fs.mkdirSync(profileDir, { recursive: true });
    this.removeStaleProfileLocks(profileDir);

    const args = [
      `--remote-debugging-port=${port}`,
      '--remote-debugging-address=127.0.0.1',
      '--remote-allow-origins=*',
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-session-crashed-bubble',
      '--disable-restore-session-state',
      '--disable-infobars',
      '--disable-notifications',
      '--disable-popup-blocking',
      '--disable-background-networking',
      '--password-store=basic',
      '--use-mock-keychain',
      '--test-type',
      '--disable-dev-shm-usage',
      '--window-size=1365,1000',
      '--lang=en-US',
      'about:blank',
    ];

    if (this.shouldDisableSandbox()) {
      args.unshift('--no-sandbox', '--disable-setuid-sandbox');
    }

    const child = spawn(executable, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: false });
    let lastError = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      lastError = `${lastError}${chunk.toString('utf8')}`.slice(-4000);
    });

    const started = await this.waitForChrome(port, 30_000);
    if (!started) {
      try { child.kill('SIGTERM'); } catch { /* ignore */ }
      const details = lastError.split('\n').filter(Boolean).slice(-2).join(' ');
      throw new ServiceUnavailableException(`Unable to open assisted Chrome${details ? `: ${details}` : ''}`);
    }

    return { process: child, port, profileDir, temporaryProfile: profile.temporary };
  }

  private async openSheinTarget(browser: AssistedBrowserHandle, sourceUrl: string, marketplace: Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'>): Promise<ChromeTarget> {
    const target = await this.chromeEndpoint<ChromeTarget>(browser.port, `/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT', timeoutMs: 5_000 });
    if (!target.webSocketDebuggerUrl) {
      throw new ServiceUnavailableException('Chrome DevTools did not return a debuggable tab');
    }

    const normalizedUrl = this.marketUrl(sourceUrl, marketplace);
    await this.cdpCommand(target.webSocketDebuggerUrl, 'Network.enable', {}, 5_000).catch(() => undefined);
    await this.setMarketCookies(target.webSocketDebuggerUrl, normalizedUrl, marketplace);
    await this.cdpCommand(target.webSocketDebuggerUrl, 'Page.navigate', { url: normalizedUrl }, 10_000);
    await this.sleep(1_500);
    return target;
  }

  private async inspectVisiblePage(port: number, targetId: string, marketplace: Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'>): Promise<VisibleReaderResult> {
    const target = await this.getTarget(port, targetId);
    if (!target?.webSocketDebuggerUrl) {
      throw new BadRequestException('SHEIN tab was closed before import completed');
    }

    const result = await this.cdpCommand(target.webSocketDebuggerUrl, 'Runtime.evaluate', {
      expression: `(${VISIBLE_PAGE_READER})(${JSON.stringify({ currencyCode: marketplace.currencyCode, countryCode: marketplace.countryCode })})`,
      awaitPromise: true,
      returnByValue: true,
    }, 12_000);

    const value = this.readCdpValue(result);
    return this.isVisibleReaderResult(value) ? value : { state: 'loading', message: 'Waiting for SHEIN page to load' };
  }

  private async findBestSheinTarget(port: number, currentTargetId: string): Promise<ChromeTarget | null> {
    const targets = await this.chromeEndpoint<ChromeTarget[]>(port, '/json/list', { timeoutMs: 3_000 }).catch(() => []);
    const pages = targets.filter((target) => target.type === 'page' && target.webSocketDebuggerUrl);
    if (!pages.length) return null;

    pages.sort((a, b) => this.sheinTargetScore(b, currentTargetId) - this.sheinTargetScore(a, currentTargetId));
    return pages[0] ?? null;
  }

  private sheinTargetScore(target: ChromeTarget, currentTargetId: string): number {
    const url = String(target.url || '').toLowerCase();
    const title = String(target.title || '').toLowerCase();
    let score = target.id === currentTargetId ? 5 : 0;
    if (/shein/.test(url + ' ' + title)) score += 20;
    if (/(?:-p-|goods_id=|goodsid=|product_id=|productid=)/.test(url)) score += 40;
    if (/sharejump|appjump/.test(url)) score += 8;
    if (/captcha|verify|verification|security/.test(url + ' ' + title)) score += 10;
    if (/about:blank|chrome:\/\//.test(url)) score -= 30;
    return score;
  }

  private async wakeVisiblePage(webSocketDebuggerUrl: string): Promise<void> {
    await this.cdpCommand(webSocketDebuggerUrl, 'Page.bringToFront', {}, 2_500).catch(() => undefined);
    await this.cdpCommand(webSocketDebuggerUrl, 'Runtime.evaluate', {
      expression: `(() => {
        try {
          window.scrollTo(0, 0);
          document.dispatchEvent(new Event('visibilitychange'));
          window.dispatchEvent(new Event('focus'));
          window.dispatchEvent(new Event('resize'));
          setTimeout(() => window.scrollTo(0, Math.min(900, document.body?.scrollHeight || 900)), 120);
          setTimeout(() => window.scrollTo(0, 0), 420);
        } catch (_) {}
        return true;
      })()`,
      awaitPromise: false,
      returnByValue: true,
    }, 4_000).catch(() => undefined);
  }

  private async setMarketCookies(webSocketDebuggerUrl: string, normalizedUrl: string, marketplace: Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'>): Promise<void> {
    const host = new URL(normalizedUrl).hostname;
    const domains = host.endsWith('.shein.com') || host === 'shein.com' ? ['.shein.com', host] : [host];
    const values = [
      ['currency', marketplace.currencyCode],
      ['default_currency', marketplace.currencyCode],
      ['country', marketplace.countryCode],
      ['localcountry', marketplace.countryCode],
      ['language', marketplace.language],
      ['lang', marketplace.language],
    ];

    for (const domain of [...new Set(domains)]) {
      for (const [name, value] of values) {
        await this.cdpCommand(webSocketDebuggerUrl, 'Network.setCookie', {
          name,
          value,
          domain,
          path: '/',
          secure: true,
          sameSite: 'Lax',
        }, 5_000).catch(() => undefined);
      }
    }
  }

  private marketUrl(sourceUrl: string, marketplace: Pick<SheinMarketplaceSettings, 'countryCode' | 'currencyCode' | 'language'>): string {
    return this.urlService.applyV1MarketToSheinUrl(sourceUrl, marketplace).toString();
  }

  private async getTarget(port: number, targetId: string): Promise<ChromeTarget | null> {
    const targets = await this.chromeEndpoint<ChromeTarget[]>(port, '/json/list', { timeoutMs: 3_000 });
    return targets.find((target) => target.id === targetId) ?? null;
  }

  private async closeTarget(port: number, targetId: string): Promise<void> {
    await this.chromeEndpoint<unknown>(port, `/json/close/${encodeURIComponent(targetId)}`, { timeoutMs: 2_500 }).catch(() => undefined);
  }

  private async closeBrowser(browser: AssistedBrowserHandle): Promise<void> {
    try {
      const version = await this.chromeEndpoint<{ webSocketDebuggerUrl?: string }>(browser.port, '/json/version', { timeoutMs: 2_000 });
      if (version.webSocketDebuggerUrl) {
        await this.cdpCommand(version.webSocketDebuggerUrl, 'Browser.close', {}, 2_500).catch(() => undefined);
      }
    } catch { /* ignore */ }

    await this.sleep(300);
    try {
      if (!browser.process.killed) browser.process.kill('SIGTERM');
    } catch { /* ignore */ }

    if (browser.temporaryProfile) {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        try {
          fs.rmSync(browser.profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
          break;
        } catch {
          await this.sleep(200);
        }
      }
    }
  }

  private async cdpCommand(webSocketDebuggerUrl: string, method: string, params: Record<string, unknown>, timeoutMs: number): Promise<Record<string, unknown>> {
    const WebSocketCtor = (globalThis as { WebSocket?: WebSocketConstructorLike }).WebSocket;
    if (!WebSocketCtor) {
      throw new ServiceUnavailableException('Node WebSocket support is not available for Chrome DevTools');
    }

    return new Promise((resolve, reject) => {
      const ws = new WebSocketCtor(webSocketDebuggerUrl);
      const id = Math.floor(Math.random() * 1_000_000_000);
      const timer = setTimeout(() => {
        try { ws.close(); } catch { /* ignore */ }
        reject(new ServiceUnavailableException(`Chrome command timed out: ${method}`));
      }, timeoutMs);

      const finish = (error: Error | null, value?: Record<string, unknown>) => {
        clearTimeout(timer);
        try { ws.close(); } catch { /* ignore */ }
        if (error) reject(error);
        else resolve(value ?? {});
      };

      ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ id, method, params }));
      });
      ws.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(typeof event.data === 'string' ? event.data : Buffer.from(event.data as ArrayBuffer).toString('utf8')) as Record<string, unknown>;
          if (message.id !== id) return;
          const cdpError = message.error;
          if (this.isRecord(cdpError)) {
            finish(new ServiceUnavailableException(String(cdpError.message || `Chrome command failed: ${method}`)));
            return;
          }
          finish(null, this.isRecord(message.result) ? message.result : {});
        } catch (error) {
          finish(error instanceof Error ? error : new Error('Invalid Chrome DevTools response'));
        }
      });
      ws.addEventListener('error', () => finish(new ServiceUnavailableException('Could not communicate with the visible Chrome window')));
    });
  }

  private async chromeEndpoint<T>(port: number, pathname: string, options: { method?: string; timeoutMs: number }): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await fetch(`http://127.0.0.1:${port}${pathname}`, { method: options.method, signal: controller.signal });
      if (!response.ok) {
        throw new ServiceUnavailableException(`Chrome DevTools returned ${response.status}`);
      }
      return await response.json() as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private async waitForChrome(port: number, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        await this.chromeEndpoint<unknown>(port, '/json/version', { timeoutMs: 1_200 });
        return true;
      } catch {
        await this.sleep(350);
      }
    }
    return false;
  }

  private async resolveBrowserExecutable(): Promise<string> {
    for (const candidate of this.browserExecutableCandidates()) {
      const resolved = await this.commandPath(candidate);
      if (resolved) return resolved;
    }
    throw new ServiceUnavailableException('Chrome or Chromium not found. Install Chrome or set SHEIN_BROWSER_PATH.');
  }

  private async commandPath(command: string): Promise<string> {
    if (!command) return '';
    if (path.isAbsolute(command)) return fs.existsSync(command) ? command : '';
    const lookupCommand = process.platform === 'win32' ? 'where' : 'which';
    return new Promise((resolve) => {
      execFile(lookupCommand, [command], { timeout: 3_000 }, (error, stdout) => {
        resolve(error ? '' : String(stdout || '').split(/\r?\n/)[0]?.trim() ?? '');
      });
    });
  }

  private browserExecutableCandidates(): string[] {
    const configured = this.configService.get<string>('SHEIN_BROWSER_PATH');
    const values = [configured];

    if (process.platform === 'win32') {
      const roots = [
        process.env.PROGRAMFILES,
        process.env['PROGRAMFILES(X86)'],
        process.env.LOCALAPPDATA,
      ].filter((root): root is string => Boolean(root));

      for (const root of roots) {
        values.push(
          path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
          path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
          path.join(root, 'Chromium', 'Application', 'chrome.exe'),
        );
      }
      values.push('chrome.exe', 'msedge.exe');
    } else if (process.platform === 'darwin') {
      values.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', 'google-chrome', 'chromium');
    } else {
      values.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', 'google-chrome', 'chromium');
    }

    return [...new Set(values.filter((value): value is string => Boolean(value)))];
  }

  private freeLocalPort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        server.close(() => resolve(typeof address === 'object' && address ? address.port : 0));
      });
    });
  }

  private profileDir(): { path: string; temporary: boolean } {
    const configured = this.configService.get<string>('SHEIN_ASSIST_PROFILE');
    if (configured) {
      return { path: configured, temporary: false };
    }

    // Use a fresh writable profile for every assisted import.
    // Reusing one profile inside Docker often triggers Chromium native dialogs such as
    // "Profile error occurred" and "Restore pages", which can block the V1-style flow.
    return { path: fs.mkdtempSync(path.join(os.tmpdir(), 'rsstore-v2-shein-browser-')), temporary: true };
  }

  private removeStaleProfileLocks(profileDir: string): void {
    for (const lockName of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
      try { fs.rmSync(path.join(profileDir, lockName), { force: true }); } catch { /* ignore */ }
    }
  }

  private assertVisibleBrowserCanOpen(): void {
    if (!this.visibleBrowserCanOpen()) {
      throw new ServiceUnavailableException('Visible Chrome automation is unavailable in this runtime. If the API runs inside Docker, start it with GUI/X11 access or run the API locally on a desktop session.');
    }
  }

  private visibleBrowserCanOpen(): boolean {
    return !(process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY);
  }

  private browserMode(): 'off' | 'headless' | 'interactive' {
    const value = String(this.configService.get<string>('SHEIN_BROWSER_IMPORT') ?? 'off').trim().toLowerCase();
    if (['0', 'false', 'no', 'off', 'manual'].includes(value)) return 'off';
    if (['headless', 'dump'].includes(value)) return 'headless';
    return 'interactive';
  }

  private shouldDisableSandbox(): boolean {
    const configured = String(this.configService.get<string>('SHEIN_BROWSER_NO_SANDBOX') ?? '').trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(configured)) return true;
    return process.platform !== 'win32' && typeof process.getuid === 'function' && process.getuid() === 0;
  }

  private maxWaitMs(): number {
    const configured = Number(this.configService.get<string>('SHEIN_ASSIST_MAX_WAIT_MS'));
    if (Number.isFinite(configured) && configured > 0) return Math.max(60_000, Math.min(30 * 60_000, Math.trunc(configured)));
    return DEFAULT_WAIT_MS;
  }

  private pollMs(): number {
    const configured = Number(this.configService.get<string>('SHEIN_ASSIST_POLL_MS'));
    if (Number.isFinite(configured) && configured > 0) return Math.max(1_500, Math.min(10_000, Math.trunc(configured)));
    return DEFAULT_POLL_MS;
  }



  private transientDevToolsMessage(error: unknown): string | null {
    const message = error instanceof Error ? error.message : String(error || '');
    if (/session not open|expired/i.test(message)) return null;
    if (/timed out|timeout|DevTools|communicate|fetch failed|ECONNREFUSED|ECONNRESET|aborted|Target closed|No target|socket|terminated while loading/i.test(message)) {
      return 'Waiting for SHEIN/CAPTCHA page to finish. Keep the visible Chrome window open; the importer will continue automatically after verification is solved.';
    }
    if (/tab was closed|visible chrome was closed/i.test(message)) {
      return 'Waiting for visible Chrome DevTools to reconnect. Keep the SHEIN product tab open; the importer will continue automatically.';
    }
    return null;
  }

  private isBrowserProcessAlive(browser: AssistedBrowserHandle): boolean {
    return browser.process.exitCode === null && !browser.process.killed;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private readCdpValue(result: Record<string, unknown>): unknown {
    const resultObject = this.isRecord(result.result) ? result.result : undefined;
    return resultObject?.value;
  }

  private isVisibleReaderResult(value: unknown): value is VisibleReaderResult {
    return this.isRecord(value) && typeof value.state === 'string';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
