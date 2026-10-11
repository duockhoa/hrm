import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NHÃN NGUYÊN LIỆU",
};

export default function LabelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
