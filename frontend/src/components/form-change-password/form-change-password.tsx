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
import { userService } from "@/services/index.service";

import { Input } from "../ui/input";
import axiosClient from "@/lib/axios-client";
export default function ChangePassword() {
  const formSchema = z
    .object({
      currentPassword: z
        .string()
        .min(6, "Mật khẩu hiện tại phải có ít nhất 6 ký tự")
        .max(50, "Mật khẩu hiện tại phải có nhiều nhất 50 ký tự"),
      newPassword: z
        .string()
        .min(6, "Mật khẩu mới phải có ít nhất 6 ký tự")
        .max(50, "Mật khẩu mới phải có nhiều nhất 50 ký tự"),
      confirmNewPassword: z
        .string()
        .min(6, "Xác nhận mật khẩu mới phải có ít nhất 6 ký tự")
        .max(50, "Xác nhận mật khẩu mới phải có nhiều nhất 50 ký tự"),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: "Mật khẩu mới và xác nhận mật khẩu mới không khớp",
    });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log("Change password data:", data);
    userService
      .changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      .then(() => {
        toast.success("Đổi mật khẩu thành công");
        form.reset();
      })
      .catch((error) => {
        toast.error("Đổi mật khẩu thất bại: " + error.message);
      });
  };

  const onError = (errors: any) => {
    console.log("Form errors:", errors);
    toast.error("Vui lòng sửa các lỗi trong biểu mẫu.");
  };

  return (
    <div className="w-full p-4">
      <div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onError)}
            className="gap-4 flex flex-col"
          >
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu hiện tại</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Nhập mật khẩu hiện tại"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu mới</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Nhập mật khẩu mới"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Xác nhận mật khẩu mới</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Nhập xác nhận mật khẩu mới"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Đổi mật khẩu</Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
