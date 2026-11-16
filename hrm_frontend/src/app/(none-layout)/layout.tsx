"use client";
import { useEffect } from "react";

import useCompanyStore from "@/store/companies.store";
import useSWR from "swr";
import Header from "@/components/layout/header";
import { companiesService } from "@/services/index.service";
import { API_ROUTES } from "@/lib/api-routes";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { setCompanies } = useCompanyStore();

  const { data: companies } = useSWR(
    API_ROUTES.companies.base,
    companiesService.fetcherCompanies,
  );
  useEffect(() => {
    if (companies) {
      setCompanies(companies);
    }
  }, [companies, setCompanies]);

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-2 bg-blue-50">{children}</div>
      </div>
    </div>
  );
}
