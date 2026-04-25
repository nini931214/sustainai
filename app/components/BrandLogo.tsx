// app/components/BrandLogo.tsx
import Image from "next/image";

export default function BrandLogo({
  size = 48,
}: {
  size?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/brand/logo.png"
        alt="SustainAI Logo"
        width={size}
        height={size}
        priority
      />
      <span className="text-xl font-semibold tracking-tight">
        SustainAI
      </span>
    </div>
  );
}