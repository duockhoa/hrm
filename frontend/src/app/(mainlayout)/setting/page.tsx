import Link from "next/link";
import {
  Bell,
  ChevronRight,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  UserRound,
} from "lucide-react";

const settingGroups = [
  {
    title: "Tài khoản",
    description: "Quản lý thông tin cá nhân và bảo mật đăng nhập.",
    items: [
      {
        icon: UserRound,
        title: "Hồ sơ cá nhân",
        description: "Xem và cập nhật thông tin tài khoản của bạn.",
        href: "/profile",
      },
      {
        icon: KeyRound,
        title: "Mật khẩu",
        description: "Thay đổi mật khẩu và yêu cầu bảo mật tài khoản.",
        href: "/profile",
      },
    ],
  },
  {
    title: "Hệ thống",
    description: "Thiết lập trải nghiệm làm việc trong DK HRM.",
    items: [
      {
        icon: Bell,
        title: "Thông báo",
        description: "Quản lý thông báo công việc và cập nhật hệ thống.",
        href: "/setting",
      },
      {
        icon: LayoutDashboard,
        title: "Giao diện",
        description: "Tùy chỉnh bố cục và cách hiển thị dữ liệu.",
        href: "/setting",
      },
      {
        icon: ShieldCheck,
        title: "Quyền riêng tư",
        description: "Xem chính sách dữ liệu và điều khoản sử dụng.",
        href: "/polices",
      },
    ],
  },
];

export default function SettingPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md bg-white p-4 shadow-md">
      <div className="shrink-0 border-b border-gray-200 pb-4">
        <h1 className="text-xl font-semibold text-gray-900">Cài đặt</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý tài khoản, bảo mật và tùy chọn sử dụng hệ thống.
        </p>
      </div>

      <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {settingGroups.map((group) => (
            <section
              key={group.title}
              className="rounded-md border border-gray-200 bg-white"
            >
              <div className="border-b border-gray-200 p-4">
                <h2 className="text-base font-semibold text-gray-900">
                  {group.title}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {group.description}
                </p>
              </div>

              <div className="divide-y divide-gray-200">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="flex items-center gap-3 p-4 transition-colors hover:bg-blue-50"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-gray-900">
                          {item.title}
                        </span>
                        <span className="mt-1 block text-sm text-gray-500">
                          {item.description}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
