"use client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "../ui/input";
import { useDepartmentDirectory } from "@/hooks/use-department-directory";
import DirectoryLoadStatus from "@/components/common/directory-load-status";
import { userService } from "@/services/index.service";
import { mutate } from "swr";
import { refreshUserDirectories } from "@/hooks/use-user-directory";

export default function EditUserForm({
  user,
  onClose,
}: {
  user: any;
  onClose?: () => void;
}) {
  const {
    data: departments = [],
    isLoading: departmentsLoading,
    error: departmentsError,
    mutate: retryDepartments,
  } = useDepartmentDirectory();
  const formSchema = z.object({
    username: z
      .string()
      .min(2, "Employee Code must be at least 2 characters")
      .max(20, "Employee Code must be at most 20 characters"),
    name: z
      .string()
      .min(2, "Full Name must be at least 2 characters")
      .max(100, "Full Name must be at most 100 characters"),
    department: z
      .string()
      .min(2, "Department must be at least 2 characters")
      .max(100, "Department must be at most 100 characters"),

    email: z.string().email("Invalid email address"),
    position: z.string().optional(),
    network_policy_code: z.enum(["OPEN", "IP_ALLOWLIST"]),
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: user?.username || "",
      department: user?.department || "",
      name: user?.name || "",
      email: user?.email || "",
      position: user?.position || "",
      network_policy_code: user?.network_policy_code ?? "OPEN",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      await userService.updateUser(user?.id || "", data);
      toast.success("User updated successfully!");
      mutate("/users/" + user?.id);
      void refreshUserDirectories();
      onClose?.();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update user.");
      console.error("Error updating user:", error);
    }
  };

  const onError = (errors: any) => {
    console.log("Form errors:", errors);
  };

  return (
    <div className="p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)}>
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Mã Nhân viên</FormLabel>
                <FormControl>
                  <Input placeholder="Enter Mã Nhân viên" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Tên nhân sự</FormLabel>
                <FormControl>
                  <Input placeholder="Enter full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Bộ Phận</FormLabel>
                <FormControl>
                  <Select
                    disabled={departmentsLoading || Boolean(departmentsError)}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                      {departments.map((department) => (
                        <SelectItem
                          key={department.name}
                          value={department.name}
                        >
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <DirectoryLoadStatus
                  loading={departmentsLoading}
                  error={departmentsError}
                  label="danh sách phòng ban"
                  onRetry={() => void retryDepartments().catch(() => {})}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Chức vụ</FormLabel>
                <FormControl>
                  <Input placeholder="Enter position" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Enter email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="network_policy_code"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Chính sách truy cập mạng</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={form.formState.isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn chính sách mạng" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="OPEN">Mở (OPEN)</SelectItem>
                    <SelectItem value="IP_ALLOWLIST">
                      Theo IP (IP_ALLOWLIST)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end mt-4">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Lưu
            </Button>
            <Button
              type="button"
              variant="outline"
              className="ml-2"
              onClick={() => form.reset()}
            >
              Đặt lại
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
