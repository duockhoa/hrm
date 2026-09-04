"use client";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import FormEditCompany from "./form-edit-company";

export default function ItemCompany({ company }: { company: any }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        className="border rounded-md p-4 shadow-sm hover:shadow-md transition cursor-pointer flex items-center gap-4"
        onClick={() => setOpen(true)}
      >
        <div style={{ width: 80, height: 80, position: "relative" }}>
          <img
            src={
              company.image_url ||
              "https://prod-cdn.pharmacity.io/e-com/images/brand-logo/dk-pharma.png"
            }
            alt={company.name || "company logo"}
          />
        </div>
        <div>
          <h2 className="text-xl font-bold">{company.name}</h2>
          <p className="text-gray-600">{company.description}</p>
          <p className="text-gray-500 text-sm mt-2">{company.address}</p>
          <p className="text-gray-500 text-sm">{company.phone}</p>
          <p className="text-gray-500 text-sm">{company.email}</p>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg w-full">
          <FormEditCompany company={company} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
