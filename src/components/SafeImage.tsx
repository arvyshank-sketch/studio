
'use client';

import Image, { ImageProps } from "next/image";
import { useEffect, useState } from "react";

type Props = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null;
  alt?: string | null;
  fallbackSrc?: string;
  unopt?: boolean;
  "data-ai-hint"?: string;
};

export default function SafeImage({
  src,
  alt,
  fallbackSrc = "https://placehold.co/128x128.png?text=SJW",
  unopt = false,
  ...rest
}: Props) {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setImgSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <Image
      {...rest}
      src={imgSrc}
      alt={alt || "image"}
      onError={() => setImgSrc(fallbackSrc)}
      referrerPolicy="no-referrer"
      unoptimized={unopt}
    />
  );
}
