import { MdWarningAmber } from "react-icons/md";

export default function FormConfirm(props: {
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/20 z-50">
      <div className="bg-white rounded-md p-6 shadow-md w-96">
        <div className="flex items-center gap-2 mb-4">
          <MdWarningAmber className="text-2xl text-red-500" />
          <h2 className="text-lg font-semibold">
            {props.message || "Bạn có chắc chắn muốn xóa phòng ban này không?"}
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Hành động này không thể hoàn tác. Bạn có muốn tiếp tục?
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={props.onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Hủy
          </button>
          <button
            onClick={props.onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 font-semibold shadow"
            autoFocus
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
