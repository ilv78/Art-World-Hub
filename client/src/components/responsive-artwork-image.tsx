import { forwardRef, type ImgHTMLAttributes } from "react";
import { getArtworkPictureSources } from "@/lib/artwork-image";

interface ResponsiveArtworkImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "srcSet"> {
  src: string;
  sizes: string;
  pictureClassName?: string;
}

export const ResponsiveArtworkImage = forwardRef<HTMLImageElement, ResponsiveArtworkImageProps>(
  ({ src, sizes, pictureClassName, ...imgProps }, ref) => {
    const sources = getArtworkPictureSources(src);

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

ResponsiveArtworkImage.displayName = "ResponsiveArtworkImage";
