
'use client';

import Image, { ImageProps } from "next/image";
import { useEffect, useState } from "react";

type Props = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null;
  alt?: string | null;
  fallbackSrc?: string;
  unopt?: boolean; // set true if you haven't configured domains yet
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
      // allow loading Google/Firebase photos that block referrers sometimes
      referrerPolicy="no-referrer"
      // quick bypass while testing (or keep it false after domains are set)
      unoptimized={unopt}
    />
  );
}
