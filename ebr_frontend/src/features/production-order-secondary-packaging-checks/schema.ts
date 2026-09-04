import * as z from "zod";

const integerText = (label: string, allowZero: boolean) =>
  z
    .string()
    .trim()
    .min(1, `Vui lòng nhập ${label}`)
    .refine((value) => /^\d+$/.test(value), {
      message: `${label} phải là số nguyên`,
    })
    .refine((value) => allowZero || Number(value) > 0, {
      message: `${label} phải lớn hơn 0`,
    });

const secondaryPackagingCheckSchema = z
  .object({
    stage: z.string().trim().min(1, "Vui lòng nhập công đoạn"),
    requirement: z.string().trim().min(1, "Vui lòng nhập yêu cầu"),
    quantity_checked: integerText("số lượng kiểm tra", false),
    quantity_passed: integerText("số lượng đạt", true),
  })
  .superRefine((values, context) => {
    if (Number(values.quantity_passed) > Number(values.quantity_checked)) {
      context.addIssue({
        code: "custom",
        path: ["quantity_passed"],
        message: "Số lượng đạt không được vượt quá số lượng kiểm tra",
      });
    }
  });

type SecondaryPackagingCheckFormValues = z.infer<
  typeof secondaryPackagingCheckSchema
>;

export {
  secondaryPackagingCheckSchema,
  type SecondaryPackagingCheckFormValues,
};
