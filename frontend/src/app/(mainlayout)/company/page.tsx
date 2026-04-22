"use client";
import HeaderListCompany from "@/components/header-list-company/header-list-company";
import useCompanyStore from "@/store/companies.store";
import ItemCompany from "@/components/item-company/item-company";
export default function Company() {
  const { companies } = useCompanyStore();
  console.log("companies", companies);
  return (
    <div className="bg-white rounded-md p-4 shadow-md h-[100%]">
      <HeaderListCompany />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {companies.map((company: any) => (
          <ItemCompany key={company.id} company={company} />
        ))}
      </div>
    </div>
  );
}
