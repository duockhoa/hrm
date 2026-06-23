"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  Eye,
  EyeClosed,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import {
  requestPasswordReset,
  resetPassword,
  verifyResetPasswordOtp,
} from "@/services/auth.service";

const emailSchema = z.object({
  email: z.string().email("Vui lòng nhập email hợp lệ"),
});

const otpSchema = z.object({
  otp: z
    .string()
    .length(6, "OTP phải gồm 6 chữ số")
    .regex(/^\d+$/, "OTP chỉ được chứa chữ số"),
});

const resetSchema = z
  .object({
    newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự"),
    confirmPassword: z
      .string()
      .min(6, "Xác nhận mật khẩu phải có ít nhất 6 ký tự"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type EmailFormValues = z.infer<typeof emailSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;
type ResetFormValues = z.infer<typeof resetSchema>;
type ResetStep = "email" | "otp" | "reset";

export default function FormForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<ResetStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onEmailSubmit = async (values: EmailFormValues) => {
    try {
      setIsLoading(true);
      await requestPasswordReset(values.email);
      setEmail(values.email);
      setOtp("");
      otpForm.reset({ otp: "" });
      resetForm.reset();
      setStep("otp");
      toast.success("OTP đã được gửi tới email của bạn.");
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Không thể gửi OTP. Vui lòng thử lại."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpSubmit = async (values: OtpFormValues) => {
    try {
      setIsLoading(true);
      await verifyResetPasswordOtp(email, values.otp);
      setOtp(values.otp);
      setStep("reset");
      toast.success("OTP hợp lệ. Vui lòng đặt mật khẩu mới.");
    } catch (error) {
      toast.error(getErrorMessage(error, "OTP không hợp lệ hoặc đã hết hạn."));
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (values: ResetFormValues) => {
    try {
      setIsLoading(true);
      await resetPassword(email, otp, values.newPassword);
      toast.success("Đặt lại mật khẩu thành công.");
      router.replace("/login");
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Không thể đặt lại mật khẩu. Vui lòng yêu cầu OTP mới.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!email) {
      setStep("email");
      return;
    }

    try {
      setIsResending(true);
      await requestPasswordReset(email);
      setOtp("");
      otpForm.reset({ otp: "" });
      resetForm.reset();
      setStep("otp");
      toast.success("OTP mới đã được gửi tới email của bạn.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể gửi lại OTP."));
    } finally {
      setIsResending(false);
    }
  };

  const changeEmail = () => {
    setOtp("");
    otpForm.reset({ otp: "" });
    resetForm.reset();
    setStep("email");
  };

  return (
    <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-md">
      <div className="mb-6 space-y-3">
        <StepIndicator step={step} />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {step === "email" && "Khôi phục mật khẩu"}
            {step === "otp" && "Xác thực OTP"}
            {step === "reset" && "Đặt mật khẩu mới"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {step === "email" &&
              "Nhập email tài khoản để nhận mã OTP đặt lại mật khẩu."}
            {step === "otp" && `Mã OTP đã được gửi tới ${email}.`}
            {step === "reset" &&
              "Mật khẩu mới sẽ được dùng cho lần đăng nhập kế tiếp."}
          </p>
        </div>
      </div>

      {step === "email" && (
        <Form {...emailForm}>
          <form
            className="space-y-4"
            onSubmit={emailForm.handleSubmit(onEmailSubmit)}
          >
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="name@dkpharma.vn"
                        className="h-11 pl-9"
                        disabled={isLoading}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button className="h-11 w-full" type="submit" disabled={isLoading}>
              {isLoading ? <Spinner /> : <Mail />}
              Gửi OTP
            </Button>
          </form>
        </Form>
      )}

      {step === "otp" && (
        <Form {...otpForm}>
          <form
            className="space-y-5"
            onSubmit={otpForm.handleSubmit(onOtpSubmit)}
          >
            <FormField
              control={otpForm.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mã OTP</FormLabel>
                  <FormControl>
                    <InputOTP
                      maxLength={6}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                      containerClassName="justify-center"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot
                          index={0}
                          className="h-11 w-10 text-base"
                        />
                        <InputOTPSlot
                          index={1}
                          className="h-11 w-10 text-base"
                        />
                        <InputOTPSlot
                          index={2}
                          className="h-11 w-10 text-base"
                        />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot
                          index={3}
                          className="h-11 w-10 text-base"
                        />
                        <InputOTPSlot
                          index={4}
                          className="h-11 w-10 text-base"
                        />
                        <InputOTPSlot
                          index={5}
                          className="h-11 w-10 text-base"
                        />
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button className="h-11 w-full" type="submit" disabled={isLoading}>
              {isLoading ? <Spinner /> : <KeyRound />}
              Xác nhận OTP
            </Button>

            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={changeEmail}
                disabled={isLoading || isResending}
              >
                <ArrowLeft />
                Đổi email
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resendOtp}
                disabled={isLoading || isResending}
              >
                {isResending ? <Spinner /> : <RefreshCw />}
                Gửi lại OTP
              </Button>
            </div>
          </form>
        </Form>
      )}

      {step === "reset" && (
        <Form {...resetForm}>
          <form
            className="space-y-4"
            onSubmit={resetForm.handleSubmit(onResetSubmit)}
          >
            <FormField
              control={resetForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu mới</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Nhập mật khẩu mới"
                        className="h-11 pl-9 pr-10"
                        disabled={isLoading}
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={
                          showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                        }
                      >
                        {showPassword ? (
                          <EyeClosed className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={resetForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Xác nhận mật khẩu</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Nhập lại mật khẩu mới"
                        className="h-11 pl-9 pr-10"
                        disabled={isLoading}
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        onClick={() =>
                          setShowConfirmPassword((value) => !value)
                        }
                        aria-label={
                          showConfirmPassword
                            ? "Ẩn xác nhận mật khẩu"
                            : "Hiện xác nhận mật khẩu"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeClosed className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button className="h-11 w-full" type="submit" disabled={isLoading}>
              {isLoading ? <Spinner /> : <LockKeyhole />}
              Đặt lại mật khẩu
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setStep("otp")}
              disabled={isLoading}
            >
              <ArrowLeft />
              Quay lại nhập OTP
            </Button>
          </form>
        </Form>
      )}

      <div className="mt-6 text-center text-sm text-gray-500">
        <Link href="/login" className="text-blue-600 hover:underline">
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: ResetStep }) {
  const currentStep = step === "email" ? 1 : step === "otp" ? 2 : 3;

  return (
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className={`h-1.5 rounded-full ${
            item <= currentStep ? "bg-blue-600" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(". ");
    }

    if (message) {
      if (message === "User not found") {
        return "Không tìm thấy tài khoản với email này.";
      }

      if (message === "Invalid OTP") {
        return "OTP không hợp lệ, đã dùng hoặc đã hết hạn.";
      }

      return message;
    }
  }

  return fallback;
}
