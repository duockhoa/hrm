"use client";
import HeaderListDepartment from "@/components/header-department-list/header-list-department";
import useDepartmentStore from "@/store/department.store";

import ItemDepartment from "@/components/item-department/item-department";
export default function DepartmentPage() {
  const { departments, departmentsLoading } = useDepartmentStore();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md bg-white p-4 shadow-md">
      <div className="shrink-0">
        <HeaderListDepartment />
      </div>

      <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
        {departmentsLoading ? (
          <p>Loading...</p>
        ) : departments.length === 0 ? (
          <p>No departments found.</p>
        ) : (
          <div className="flex flex-row flex-wrap gap-4 content-start">
            {departments.map((dept) => (
              <ItemDepartment key={dept.name} department={dept} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
