/* eslint-disable @next/next/no-img-element -- Static Pages uses standard browser images. */
import type { ImageProps } from "next/image";
export default function Image({
  src,
  alt,
  fill,
  priority,
  unoptimized: _unoptimized,
  loader: _loader,
  quality: _quality,
  placeholder: _placeholder,
  blurDataURL: _blur,
  onLoadingComplete: _complete,
  style,
  ...props
}: ImageProps) {
  const source = typeof src === "string" ? src : "default" in src ? src.default.src : src.src;
  return (
    <img
      {...props}
      src={source}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      style={{
        ...(fill ? { position: "absolute", inset: 0, width: "100%", height: "100%" } : {}),
        ...style,
      }}
    />
  );
}
