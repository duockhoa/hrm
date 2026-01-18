"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
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
import { Label } from "@/components/ui/label";
export default function AddUserForm() {
  const formSchema = z.object({
    employeeCode: z
      .string()
      .min(2, "Employee Code must be at least 2 characters")
      .max(20, "Employee Code must be at most 20 characters"),
    fullName: z
      .string()
      .min(2, "Full Name must be at least 2 characters")
      .max(100, "Full Name must be at most 100 characters"),
    department: z
      .string()
      .min(2, "Department must be at least 2 characters")
      .max(100, "Department must be at most 100 characters"),

    email: z.any(),
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeCode: "",
      department: "",
      fullName: "",
      email: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      console.log("Form Data:", data);
      // Call your API to add the user here
      toast.success("User added successfully!");
    } catch (error) {
      toast.error("Failed to add user. Please try again.");
      console.error("Error adding user:", error);
    }
  };

  const onError = (errors: any) => {
    console.log("Form errors:", errors);
  };
  return (
    <div className="p-4">
      <div className="w-full text-center text-lg font-semibold mb-4">
        THÊM NHÂN SỰ MỚI
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)}>
          <FormField
            control={form.control}
            name="employeeCode"
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
            name="fullName"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Full Name</FormLabel>
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
                  <Input placeholder="Enter bộ phận" type="text" {...field} />
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
          <Button type="submit">Add User</Button>
          <Button
            type="button"
            variant="outline"
            className="ml-2"
            onClick={() => form.reset()}
          >
            Reset
          </Button>
        </form>
      </Form>
    </div>
  );
}
