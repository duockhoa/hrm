export default function FieldDisplay({
  lable,
  value,
}: {
  lable: string;
  value: string;
}) {
  return (
    <div className="flex w-full justify-start gap-4 ">
      <div className="font-semibold text-gray-600 min-w-[150px]  pr-2 max-w-[200px] m-1 text-left wrap-anywhere">
        {lable}
      </div>

      <div className="text-gray-800 flex-1 text-left">
        <p className="wrap-anywhere">{value}</p>
      </div>
    </div>
  );
}
