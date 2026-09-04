import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NHÃN DK",
};

export default function LabelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
