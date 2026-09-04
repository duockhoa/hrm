"use client";
import ApplicationAccessGuard from "@/components/application-access-guard/application-access-guard";
import Header from "@/components/header/header";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ApplicationAccessGuard>
      <div className="flex h-screen flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto bg-blue-50 p-2">{children}</div>
        </div>
      </div>
    </ApplicationAccessGuard>
  );
}
