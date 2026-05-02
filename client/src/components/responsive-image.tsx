import { forwardRef, type ImgHTMLAttributes } from "react";
import { getResponsivePictureSources } from "@shared/responsive-image";

interface ResponsiveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "srcSet"> {
  src: string;
  sizes: string;
  pictureClassName?: string;
}

// Renders <picture> with WebP + JPEG srcset variants when the URL points
// at a managed /uploads/<subdir>/ image (artworks or blog covers from #573).
// Falls back to plain <img> for external URLs (Google Photos imports etc.).
//
// `display: contents` on the <picture> wrapper keeps it layout-transparent
// so the inner <img>'s sizing classes (w-full / h-full / object-cover etc.)
// resolve against the picture's parent — the wrapper doesn't introduce its
// own box. (See the bug we hit in #564 testing.)
export const ResponsiveImage = forwardRef<HTMLImageElement, ResponsiveImageProps>(
  ({ src, sizes, pictureClassName, ...imgProps }, ref) => {
    const sources = getResponsivePictureSources(src);

    if (!sources) {
      return <img ref={ref} src={src} sizes={sizes} {...imgProps} />;
    }

    return (
      <picture className={pictureClassName} style={{ display: "contents" }}>
        <source type="image/webp" srcSet={sources.webpSrcSet} sizes={sizes} />
        <source type="image/jpeg" srcSet={sources.jpegSrcSet} sizes={sizes} />
        <img ref={ref} src={sources.fallbackSrc} sizes={sizes} {...imgProps} />
      </picture>
    );
  },
);

ResponsiveImage.displayName = "ResponsiveImage";

// Backwards-compat alias — pre-#573 code referenced this name.
export const ResponsiveArtworkImage = ResponsiveImage;
