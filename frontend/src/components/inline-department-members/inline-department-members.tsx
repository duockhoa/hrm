import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export default function DepartmentMembersInline({
  members,
}: {
  members: any[];
}) {
  return (
    <div className="w-full border rounded p-4 max-w-4xl mt-4 bg-white shadow-md min-h-100">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold">
          Thông tin thành viên phòng ban
        </h2>
        <div className="bg-gray-200 text-gray-800 py-1 px-3 rounded-full text-sm font-medium">
          {members.length}
        </div>
      </div>
      {members.length === 0 ? (
        <p>Chưa có dữ liệu</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>STT</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Vị trí</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member, idx) => (
                <TableRow key={member.id}>
                  <TableCell className="text-center">{idx + 1}</TableCell>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{member.username}</TableCell>
                  <TableCell>{member.position}</TableCell>
                  <TableCell>{member.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
