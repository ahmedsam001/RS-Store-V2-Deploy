export function buildResponsiveImageSources(
  src: string,
  widths: number[],
  width?: number | string,
): { src: string; srcSet: string } {
  const normalizedWidths = [...new Set(widths)].sort((first, second) => first - second);
  const fallbackWidth = Number(
    width ?? normalizedWidths[Math.floor(normalizedWidths.length / 2)] ?? 800,
  );

  return {
    src: transformCloudinaryUrl(src, fallbackWidth),
    srcSet: normalizedWidths
      .map((imageWidth) => `${transformCloudinaryUrl(src, imageWidth)} ${imageWidth}w`)
      .join(', '),
  };
}

function transformCloudinaryUrl(src: string, width: number): string {
  if (!src.includes('/upload/')) {
    return src;
  }

  return src.replace('/upload/', `/upload/f_auto,q_auto,c_fill,w_${width}/`);
}
