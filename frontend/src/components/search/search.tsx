"use client";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState  , useRef} from "react";
export default function Search() {
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative">
      <Input
        type="text"
        placeholder="Tìm kiếm"
        className="rounded-full  md:w-40 w-0 focus:w-40  md:focus:w-100 focus:ring-0 focus-visible:ring-0 transition-all duration-300 ease-in-out pr-8"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        ref={ref}
      />
      <SearchIcon className="text-gray-400 absolute right-2 top-1/2 transform -translate-y-1/2" onClick={
        () => {
          ref.current?.focus();
        }
      } />
    </div>
  );
}
