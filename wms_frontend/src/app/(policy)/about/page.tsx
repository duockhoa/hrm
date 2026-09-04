import packageJson from "../../../../package.json";
import Image from "next/image";
import Link from "next/link";
import PolicyBackButton from "../policy-back-button";

const appVersion = packageJson.version;
const feedbackUrl =
  "https://docs.google.com/spreadsheets/d/1yrcVQquJW-IMLXJ7_fcpaH2hZzOuv8HCdnCOC9qtsNg/edit?gid=0#gid=0";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-10 text-gray-900 md:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col md:min-h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <Image
            src="/dkpharmalogo.png"
            alt="DK Pharma"
            width={170}
            height={80}
            priority
            className="h-auto w-28 shrink-0 object-contain md:w-36"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-950 md:text-3xl">
              Hồ sơ lô
            </h1>
            <p className="mt-1 text-sm text-gray-500">Phiên bản {appVersion}</p>
          </div>
          <div className="flex h-11 min-w-16 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-gray-50 px-4 text-base font-semibold text-gray-700 md:h-12 md:min-w-20 md:text-lg">
            16+
          </div>
        </div>

        <div className="mt-8">
          <div className="space-y-4 leading-7 text-gray-700">
            <p>
              Ứng dụng được phát triển bởi Tổ Chuyển đổi số Công ty Cổ phần
              Dược Khoa. Hỗ trợ kỹ thuật: Phạm Văn Bình - 0965155761.
            </p>
            <p>
              Bản quyền ứng dụng thuộc Công ty Cổ phần Dược Khoa. Mọi hành vi
              sao chép, khai thác hoặc sử dụng lại khi chưa được cho phép đều
              được xem là vi phạm quyền sở hữu trí tuệ.
            </p>
          </div>
        </div>

        <PolicyBackButton
          className="mt-auto pb-20 pt-8"
          feedbackUrl={feedbackUrl}
        />

        <footer className="flex flex-wrap items-center justify-center gap-2 pt-4 text-xs text-gray-500">
          <Link className="hover:text-blue-600 hover:underline" href="/terms">
            Terms
          </Link>
          <span>·</span>
          <Link className="hover:text-blue-600 hover:underline" href="/polices">
            Privacy
          </Link>
          <span>·</span>
          <span>Version {appVersion}</span>
        </footer>
      </div>
    </main>
  );
}
