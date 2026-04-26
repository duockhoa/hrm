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
import useUsersStore from "@/store/users.store";

export default function FormEditDepartment({
  department,
  onClose,
}: {
  department: any;
  onClose: () => void;
}) {
  const { users } = useUsersStore();
  const { companies } = useCompanyStore();
  const formSchema = z.object({
    description: z.string().optional(),
    company_id: z.number().optional(),
    team_lead: z.number().optional(),
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: department?.description || "",
      company_id: department?.company_id || undefined,
      team_lead: department?.team_lead || undefined,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await departmentsService.updateDepartment(department.name, {
        description: values.description,
        company_id: values.company_id,
        team_lead: values.team_lead,
      });
      toast.success("Department updated successfully");
      mutate(API_ROUTES.departments.base);
      mutate(`${API_ROUTES.departments.base}/${department.name}`);
      onClose();
    } catch {
      toast.error("Failed to update department");
    }
  };

  const onError = () => {
    toast.error("Please fix the errors in the form");
  };

  return (
    <div className="bg-white rounded-md p-4 shadow-md h-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, onError)}
          className="space-y-4"
        >
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input value={department?.name || ""} disabled />
            </FormControl>
            <FormMessage />
          </FormItem>
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
          <FormField
            control={form.control}
            name="team_lead"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team Lead</FormLabel>
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
                      <SelectValue placeholder="Select team lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name}
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
