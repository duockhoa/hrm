"use client";
import HeaderListCompany from "@/components/header-list-company/header-list-company";
import useCompanyStore from "@/store/companies.store";
import ItemCompany from "@/components/item-company/item-company";

export default function Company() {
  const { companies, companiesLoading } = useCompanyStore();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md bg-white p-4 shadow-md">
      <div className="shrink-0">
        <HeaderListCompany />
      </div>

      <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
        {companiesLoading ? (
          <p>Loading...</p>
        ) : companies.length === 0 ? (
          <p>No companies found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company: any) => (
              <ItemCompany key={company.id} company={company} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
