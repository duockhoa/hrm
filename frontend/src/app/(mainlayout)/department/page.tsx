"use client";
import HeaderListDepartment from "@/components/header-department-list/header-list-department";
import useDepartmentStore from "@/store/department.store";

import FormConfirm from "@/components/form-confirm/form-confirm";
import ItemDepartment from "@/components/item-department/item-department";
export default function Department() {
  const { departments, departmentsLoading } = useDepartmentStore();

  return (
    <div className="bg-white rounded-md p-4 shadow-md h-[100%]">
      <HeaderListDepartment />
      {departmentsLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="mt-4 flex flex-row gap-4 flex-wrap ">
          {departments.length === 0 ? (
            <p>No departments found.</p>
          ) : (
            departments.map((dept) => (
              <ItemDepartment key={dept.name} department={dept} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
