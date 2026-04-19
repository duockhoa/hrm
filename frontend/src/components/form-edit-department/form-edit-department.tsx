import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "../ui/input";
import useCompanyStore from "@/store/companies.store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { departmentsService } from "@/services/index.service";
import { mutate } from "swr";
import { API_ROUTES } from "@/lib/api-routes";

export default function FormEditDepartment({
  department,
  onClose,
}: {
  department: any;
  onClose: () => void;
}) {
  const { companies } = useCompanyStore();
  const formSchema = z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    company_id: z.number().optional(),
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: department?.name || "",
      description: department?.description || "",
      company_id: department?.company_id,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await departmentsService.updateDepartment(department.name, {
        name: values.name,
        description: values.description,
        company_id: values.company_id,
      });
      toast.success("Department updated successfully");
      mutate(API_ROUTES.departments.base);
      mutate(`${API_ROUTES.departments.base}/${department.name}`);
      onClose();
    } catch (error) {
      toast.error("Failed to update department");
    }
  };

  const onError = (errors: any) => {
    toast.error("Please fix the errors in the form");
  };

  return (
    <div className="bg-white rounded-md p-4 shadow-md h-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, onError)}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter department name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter department description"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="company_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(val) =>
                      field.onChange(val ? Number(val) : undefined)
                    }
                    value={
                      field.value === null || field.value === undefined
                        ? ""
                        : field.value.toString()
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company) => (
                        <SelectItem
                          key={company.id}
                          value={company.id.toString()}
                        >
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button type="submit">Update Department</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
