import { Button } from "../ui/button";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
  useFormField,
} from "@/components/ui/form";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../ui/input";
export default function AddContactForm({ user_id }: { user_id?: string }) {
  const formSchema = z.object({
    contact_id: z.string().min(2).max(20),
    start_date: z.string(),
    end_date: z.string(),
    files: z.instanceof(FileList).optional(),
    // Define form schema here
  });

  // Use input types because z.coerce.date() accepts string/unknown from the form.
  const form = useForm<z.input<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contact_id: "",
      start_date: "",
      end_date: "",
    },

    // Define form options here
  });

  const onSubmit = (data: z.input<typeof formSchema>) => {
    // Handle form submission here
    const parsed = formSchema.parse(data);
    console.log(parsed);
  };
  const onError = (errors: any) => {
    // Handle form errors here
    console.log(errors);
  };

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)}>
          <h2 className="text-2xl text-black p-3 "> Thêm hợp đồng</h2>
          <FormField
            control={form.control}
            name="contact_id"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Mã hợp đồng</FormLabel>
                <FormControl>
                  <Input placeholder="Enter Mã hợp đồng" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Ngày bắt đầu</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Ngày hết hạn</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="files"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Đính kèm file</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.png,.jpg"
                    onChange={(e) => field.onChange(e.target.files)}
                  />
                </FormControl>
                <FormDescription>
                  Chọn tối đa 5 file (PDF, Word, ảnh)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end mt-4">
            <Button type="submit">Thêm hợp đồng</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
