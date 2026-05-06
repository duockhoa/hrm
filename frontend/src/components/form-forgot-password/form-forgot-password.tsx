"use client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { login } from "@/services/auth.service";
import { setCookie } from "@/services/setcookie";
import { useTokens } from "@/store/token.store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Eye, EyeClosed } from "lucide-react";

export default function FormForgotPassword() {
  const formSchema = z.object({
    email: z.string().email("Vui lòng nhập email hợp lệ"),
  });
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Xử lý gửi yêu cầu lấy lại mật khẩu tại đây
    console.log(values);
    toast.success("Yêu cầu lấy lại mật khẩu đã được gửi!");
  };
  return (
    <div className=" bg-gray-50 border p-8 rounded-lg shadow-md w-full max-w-md">
      <Form {...form}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <input
                  type="email"
                  placeholder="Nhập email của bạn"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full mt-4"
          onClick={form.handleSubmit(onSubmit)}
        >
          Gửi Yêu Cầu
        </Button>
      </Form>
    </div>
  );
}
