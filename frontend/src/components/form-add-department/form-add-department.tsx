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
import axiosClient from "@/lib/axios-client";
import { API_ROUTES } from "@/lib/api-routes";
import { departmentsService } from "@/services/index.service";
import { mutate } from "swr";

export default function FormAddDepartment(props: { onClose: () => void }) {
  const formSchema = z.object({
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    company: z.string().optional(),
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      company: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await departmentsService.createDepartment({
        name: values.name,
        description: values.description,
      });
      toast.success("Department added successfully");
      form.reset();
      mutate(API_ROUTES.departments.base); // Refresh the department list after adding a new department
      props.onClose();
    } catch (error) {
      toast.error("Failed to add department");
    }
  };

  const onError = (errors: any) => {
    console.log("Form errors:", errors);
    toast.error("Please fix the errors in the form");
  };

  return (
    <div className="bg-white rounded-md p-4 shadow-md h-[100%]">
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
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input placeholder="Select company name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button type="submit">Add Department</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
