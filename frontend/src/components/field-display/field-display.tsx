export default function FieldDisplay({
  lable,
  value,
}: {
  lable: string;
  value: string;
}) {
  return (
    <div className="flex w-full justify-start gap-4 ">
      <div className="font-semibold text-gray-600 min-w-[120px] border border-gray-300 pr-2 max-w-[200px] m-1 text-left">
        {lable} :
      </div>
      <div className="text-gray-800 flex-1">{value}</div>
    </div>
  );
}
