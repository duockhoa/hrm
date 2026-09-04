import * as React from "react";

type OpenLinkButtonProps = {
  href: string;
  name?: string;
  icon?: React.ReactNode;
  color?: "blue" | "green" | "red" | "yellow" | "gray";
};

const colorClasses: Record<NonNullable<OpenLinkButtonProps["color"]>, string> =
  {
    blue: "bg-blue-500 hover:bg-blue-600",
    green: "bg-green-500 hover:bg-green-600",
    red: "bg-red-500 hover:bg-red-600",
    yellow: "bg-yellow-500 hover:bg-yellow-600",
    gray: "bg-gray-500 hover:bg-gray-600",
  };

export default function OpenLinkButton({
  href,
  name,
  icon,
  color = "blue",
}: OpenLinkButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex flex-col items-center p-1"
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-[9999px] px-4 py-2 text-center text-white [&_svg]:min-h-5 [&_svg]:min-w-5 ${colorClasses[color]}`}
      >
        {icon}
      </span>
      {name ? (
        <span className="w-[90px]">
          <span className="mt-1 block text-center text-[14px] font-semibold text-gray-700">
            {name}
          </span>
        </span>
      ) : null}
    </a>
  );
}
