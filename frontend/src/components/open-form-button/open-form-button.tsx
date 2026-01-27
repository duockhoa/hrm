export default function OpenFormButton({
  name,
  onClick,
  icon,
  color = "blue",
}: {
  name?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="inline-flex flex-col items-center p-1">
      <button
        className={`flex justify-center items-center px-4 py-2 w-10 h-10 bg-${color}-500 text-white rounded-[9999px] hover:bg-${color}-600 text-center [&_svg]:min-h-5 [&_svg]:min-w-5`}
        onClick={onClick}
      >
        {icon}
      </button>
      <div className="w-[90px]">
        <p className="font-semibold mt-1 text-center text-[14px] text-gray-700">
          {name}
        </p>
      </div>
    </div>
  );
}
