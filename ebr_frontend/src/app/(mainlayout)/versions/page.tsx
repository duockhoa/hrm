import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import packageJson from "../../../../package.json";

export const metadata: Metadata = {
  title: "Quản lý phiên bản",
};

const version112Changes = [
  "Bổ sung trang quản lý phiên bản và liên kết từ sidebar; hiển thị thông tin ứng dụng, lịch sử thay đổi và người phụ trách.",
  "Cập nhật thông báo lỗi và nhãn trên phiếu theo dõi In Date và biểu mẫu xuất dữ liệu in Date.",
  "Điều chỉnh thứ tự báo cáo hồ sơ lô: hồ sơ pha chế được đặt sau phiếu xuất kho.",
  "Tối ưu dữ liệu tải danh sách lô sản xuất để giảm dung lượng phản hồi.",
  "Thống nhất nhãn hiển thị trong cấu hình email cá nhân.",
];

function VersionResponsibleCells() {
  return (
    <>
      <TableCell>Phạm Văn Bình</TableCell>
      <TableCell>Lê Hoàng Cương</TableCell>
      <TableCell>Quách Ngọc Luyến</TableCell>
    </>
  );
}

export default function VersionsPage() {
  return (
    <main className="min-h-full w-full space-y-6 rounded-lg bg-white p-2 shadow-md md:p-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Quản lý phiên bản
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Thông tin ứng dụng và các bên phụ trách phiên bản.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Thông tin cơ bản</h2>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Tên ứng dụng</dt>
              <dd className="mt-1 font-medium">Hồ sơ lô điện tử (EBR)</dd>
            </div>
            <div>
              <dt className="text-gray-500">Phiên bản hiện tại</dt>
              <dd className="mt-1 font-medium">{packageJson.version}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Đơn vị sở hữu</dt>
              <dd className="mt-1 font-medium">Công ty Cổ phần Dược Khoa</dd>
            </div>
            <div>
              <dt className="text-gray-500">Người phát triển</dt>
              <dd className="mt-1 font-medium">
                Phạm Văn Bình — Tập đoàn Intech Group
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Danh sách phiên bản</h2>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Mã phiên bản</TableHead>
                <TableHead scope="col">Ngày</TableHead>
                <TableHead scope="col">Nội dung</TableHead>
                <TableHead scope="col">Người thay đổi</TableHead>
                <TableHead scope="col">Người xem xét</TableHead>
                <TableHead scope="col">Người phê duyệt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">1.1.3</TableCell>
                <TableCell>
                  <time dateTime="2026-11-02">02/11/2026</time>
                </TableCell>
                <TableCell className="min-w-72 max-w-xl whitespace-normal">
                  Bổ sung liên kết “api reference” bên cạnh Privacy trên trang
                  About, mở tài liệu API trong tab mới.
                </TableCell>
                <VersionResponsibleCells />
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">1.1.2</TableCell>
                <TableCell>
                  <time dateTime="2026-11-02">02/11/2026</time>
                </TableCell>
                <TableCell className="min-w-72 max-w-xl whitespace-normal">
                  <ul className="list-disc space-y-1 pl-4">
                    {version112Changes.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                </TableCell>
                <VersionResponsibleCells />
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">1.0.0</TableCell>
                <TableCell>
                  <time dateTime="2026-10-30">30/10/2026</time>
                </TableCell>
                <TableCell>Phát hành lần đầu</TableCell>
                <VersionResponsibleCells />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
